import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.PGDATABASE_URL });

// 填入你刚才查出来的所有待支付订单的系统订单号
const failedOrders = [
  'O177622781645035YN',
  'O1776227755880R1L1',
  'O1776227589830QWLY',
  'O17762275206112FOI',
  'O1776227404916BR18'
];

async function distributeRevenue(orderUserId: string, totalAmount: number, dbClient: any, orderId: string, productName: string) {
  try {
    const amount = parseFloat(totalAmount as any);
    if (isNaN(amount) || amount <= 0) return;

    // 1. 获取员工及其上级链路 (最多查3层)
    const userRes = await dbClient.query(`
      SELECT id, role, earnings_rate, created_by 
      FROM public.users WHERE id = $1
    `, [orderUserId]);
    
    if (userRes.rows.length === 0) return;
    
    const user = userRes.rows[0];
    const chain = [user];
    
    let currentUserId = user.created_by;
    for (let i = 0; i < 3; i++) {
      if (!currentUserId) break;
      const parentRes = await dbClient.query(`
        SELECT id, role, earnings_rate, created_by 
        FROM public.users WHERE id = $1
      `, [currentUserId]);
      if (parentRes.rows.length === 0) break;
      chain.push(parentRes.rows[0]);
      currentUserId = parentRes.rows[0].created_by;
    }

    // 2. 找到顶级经理 (链路最顶端且角色为 manager 或 admin 的人)
    // 如果链路中没有经理，说明数据异常，安全起见把钱给最终节点
    let managerIndex = chain.findIndex((u: any) => u.role === 'manager' || u.role === 'admin');
    if (managerIndex === -1) managerIndex = chain.length - 1; // 兜底
    
    const validChain = chain.slice(0, managerIndex + 1);
    
    // 3. 从顶向下计算每个人的分润金额 (链式一对一分配，支持 a=0 的越级抽取)
    let currentPool = amount;
    let poolOwnerIndex = validChain.length - 1; // 初始池子归属最顶层
    const payouts = new Array(validChain.length).fill(0);

    for (let i = validChain.length - 2; i >= 0; i--) {
      const node = validChain[i];
      // node 的 earnings_rate 是它的直接上级给它设置的分成比例
      const passDownRate = parseFloat(node.earnings_rate) || 0; 
      const r = Math.max(0, Math.min(100, passDownRate)) / 100;
      
      if (r > 0) {
        // 当前池子主人保留剩下的部分
        payouts[poolOwnerIndex] += currentPool * (1 - r);
        // 传递给下级的池子变小
        currentPool = currentPool * r;
        // 池子主人变更为当前下级
        poolOwnerIndex = i;
      } else {
        // r == 0: 越级抽取
        // 当前节点（比如主管）拿到 0，但池子不缩水，直接穿透给再下一级
        // 且池子主人不变（仍是上一级），这意味着下一级会直接从上一级的池子中按比例抽成
        payouts[i] += 0;
      }
    }

    // 循环结束后，最后一个池子主人拿走剩下的所有钱（通常是最底层员工，或者是被截断的上级）
    payouts[poolOwnerIndex] += currentPool;

    // 4. 执行资金分配
    for (let i = 0; i < validChain.length; i++) {
      const amountToPay = payouts[i];
      const userId = validChain[i].id;
      
      if (amountToPay <= 0) continue;
      
      // 更新钱包
      await dbClient.query(`
        UPDATE public.wallets SET 
          balance = balance + $1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
        WHERE user_id = $2
      `, [amountToPay, userId]);
      
      // 插入收益记录
      await dbClient.query(`
        INSERT INTO public.earnings (user_id, order_id, product_name, amount, type)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, orderId, productName, amountToPay, i === 0 ? 'sale' : 'commission']);
      
      console.log(`[链式分润] 用户 ${userId} 获得分润: ¥${amountToPay.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Distribute revenue error:', error);
    throw error; // 让上层事务回滚
  }
}

async function fixOrders() {
  try {
    for (const orderId of failedOrders) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // 1. 查询订单
        const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
        if (orderRes.rowCount === 0) {
          console.log(`❌ 订单 ${orderId} 不存在`);
          await client.query('ROLLBACK');
          client.release();
          continue;
        }

        const order = orderRes.rows[0];
        if (order.status === 'paid') {
          console.log(`⚠️ 订单 ${orderId} 已经是 paid 状态，跳过`);
          await client.query('ROLLBACK');
          client.release();
          continue;
        }

        // 2. 获取通道费率
        const channelsResult = await client.query(\`SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1\`);
        const channelsStr = channelsResult.rows[0]?.value || '[]';
        const channels = JSON.parse(channelsStr);
        const channel = channels.find((c: any) => c.id === order.pay_type);
        const feeRate = channel?.feeRate ? parseFloat(channel.feeRate) : 0;
        
        // 3. 计算实际分润金额
        const actualAmount = parseFloat(order.amount) * (1 - feeRate / 100);

        // 4. 更新订单状态
        const updateRes = await client.query(
          \`UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *\`,
          [orderId]
        );

        // 5. 分润
        await distributeRevenue(order.user_id, actualAmount, client, orderId, order.product_name);
        
        await client.query('COMMIT');
        console.log(\`✅ 订单 ${orderId} 补单成功，原金额: ¥${order.amount}, 实际分润金额: ¥${actualAmount.toFixed(2)}\`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(\`❌ 订单 ${orderId} 补单失败:\`, err.message);
      } finally {
        client.release();
      }
    }
  } catch (err: any) {
    console.error('❌ 补单脚本执行失败:', err.message);
  } finally {
    await pool.end();
  }
}

fixOrders();
