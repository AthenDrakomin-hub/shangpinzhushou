import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';

const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api`;
const DB_URL = process.env.PGDATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

// 签名生成函数 (和后端保持一致)
function generatePhpwcSign(params, secretKey) {
  const filteredParams = {};
  for (const key of Object.keys(params).sort()) {
    if (
      params[key] !== '' &&
      params[key] !== null &&
      params[key] !== undefined &&
      key !== 'sign' &&
      key !== 'sign_type'
    ) {
      filteredParams[key] = params[key];
    }
  }
  const signString = Object.entries(filteredParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&') + secretKey;
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex');
}

async function main() {
  console.log('=== 开始测试 PHPWC 支付流程 ===\n');
  
  // ==========================================
  // 1. 初始化和准备数据
  // ==========================================
  console.log('[1] 连接数据库准备测试数据...');
  const pool = new Pool({ connectionString: DB_URL });
  
  let testProductId = 'mock_product_id';
  let testProductAmount = 0.01;
  let managerSecretKey = 'mock_secret_key'; // 默认测试用 key
  let isDbConnected = false;

  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log('✅ 数据库连接成功！');

    // 查找一个有效的商品
    const productResult = await client.query(`SELECT id, price FROM public.products WHERE status = 'active' LIMIT 1`);
    if (productResult.rows.length > 0) {
      testProductId = productResult.rows[0].id;
      testProductAmount = parseFloat(productResult.rows[0].price);
      console.log(`✅ 找到测试商品: ${testProductId}, 价格: ${testProductAmount}`);
    } else {
      console.log('⚠️ 数据库中没有有效商品，将使用 mock 数据');
    }

    // 查找管理者的 PHPWC Secret Key
    const keyResult = await client.query(`SELECT phpwc_secret_key FROM public.users WHERE role = 'manager' LIMIT 1`);
    if (keyResult.rows.length > 0 && keyResult.rows[0].phpwc_secret_key) {
      managerSecretKey = keyResult.rows[0].phpwc_secret_key;
      console.log('✅ 找到 PHPWC 密钥配置');
    } else {
      console.log('⚠️ 未找到 PHPWC 密钥配置，将使用 mock 密钥');
    }

    client.release();
  } catch (error) {
    console.log('⚠️ 数据库连接失败（可能 Postgres 未启动），将使用纯 API Mock 模式进行测试。错误信息:', error.message);
  }

  // ==========================================
  // 2. 测试创建订单 API
  // ==========================================
  console.log('\n[2] 测试创建订单 API (POST /api/orders)...');
  let orderId = `MOCK_O${Date.now()}`;
  
  try {
    const createRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProductId,
        payType: 'phpwc',
        buyerName: 'PHPWC 测试用户',
        buyerPhone: '13800138000'
      })
    });
    
    const createData = await createRes.json();
    if (createRes.ok) {
      console.log('✅ 订单创建成功:', createData);
      orderId = createData.orderId;
    } else {
      console.log('❌ 订单创建失败，API 返回:', createData);
      console.log('   （如果是商品不存在的错误，说明需要先在 DB 创建商品，由于目前使用 Mock 继续执行流程）');
    }
  } catch (error) {
    console.log('❌ 请求创建订单 API 失败:', error.message);
    console.log('   请确保开发服务器正在运行 (npm run dev)');
  }

  // ==========================================
  // 3. 测试回调 Webhook
  // ==========================================
  console.log(`\n[3] 测试 PHPWC 回调 Webhook (POST /api/orders/phpwc/callback) for order: ${orderId}...`);
  
  // 构造回调参数
  const callbackPayload = {
    pid: '1001',
    trade_no: `T${Date.now()}`,
    out_trade_no: orderId,
    type: 'alipay',
    name: 'PHPWC Test Product',
    money: testProductAmount.toString(),
    trade_status: 'TRADE_SUCCESS'
  };

  // 生成签名
  callbackPayload.sign = generatePhpwcSign(callbackPayload, managerSecretKey);
  callbackPayload.sign_type = 'MD5';

  try {
    const callbackRes = await fetch(`${API_URL}/orders/phpwc/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackPayload)
    });
    
    const callbackText = await callbackRes.text();
    if (callbackRes.ok && callbackText === 'success') {
      console.log('✅ 回调测试成功，返回 success');
    } else {
      console.log(`❌ 回调测试失败，HTTP Status: ${callbackRes.status}, 返回内容: ${callbackText}`);
    }
  } catch (error) {
    console.log('❌ 请求回调 API 失败:', error.message);
  }

  // ==========================================
  // 4. 验证数据库状态
  // ==========================================
  if (isDbConnected) {
    console.log(`\n[4] 验证数据库中订单 ${orderId} 的状态...`);
    try {
      const client = await pool.connect();
      const orderCheck = await client.query(`SELECT status, paid_at FROM public.orders WHERE id = $1`, [orderId]);
      
      if (orderCheck.rows.length > 0) {
        const orderInfo = orderCheck.rows[0];
        console.log(`✅ 找到订单记录！当前状态: ${orderInfo.status}, 支付时间: ${orderInfo.paid_at}`);
        if (orderInfo.status === 'paid') {
          console.log('🎉 流程测试全部通过：订单状态已成功更新为 paid');
        } else {
          console.log('⚠️ 订单状态未更新为 paid，请检查后端日志');
        }
      } else {
        console.log(`❌ 未在数据库中找到订单 ${orderId} (如果上一步创建订单失败，这是正常的)`);
      }
      client.release();
    } catch (error) {
      console.log('❌ 验证数据库状态失败:', error.message);
    }
  } else {
    console.log('\n[4] 验证数据库状态... (已跳过，因数据库未连接)');
  }

  console.log('\n=== 测试流程结束 ===');
  await pool.end();
}

main().catch(console.error);
