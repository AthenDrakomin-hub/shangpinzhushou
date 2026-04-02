/**
 * 钱包服务 - 管理用户余额和收益
 */

import { db } from '../db';

// 钱包信息
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  frozen_balance: number;
  total_earnings: number;
  total_withdrawn: number;
  created_at: Date;
  updated_at: Date;
}

// 收益记录
export interface Earning {
  id: string;
  user_id: string;
  merchant_id: string;
  order_id: string;
  order_amount: number;
  earnings_amount: number;
  rate: number | null;
  status: string;
  created_at: Date;
}

// 收益记录详情（含订单信息）
export interface EarningWithOrder extends Earning {
  product_name?: string;
  payer_info?: string;
}

/**
 * 获取或创建用户钱包
 */
export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  // 尝试获取
  const existing = await db.query(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // 创建新钱包
  const result = await db.query(
    `INSERT INTO wallets (user_id, balance, frozen_balance, total_earnings, total_withdrawn)
     VALUES ($1, 0, 0, 0, 0)
     RETURNING *`,
    [userId]
  );

  return result.rows[0];
}

/**
 * 获取钱包信息
 */
export async function getWallet(userId: string): Promise<Wallet | null> {
  const result = await db.query(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * 获取收益记录列表
 */
export async function getEarnings(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ items: EarningWithOrder[]; total: number }> {
  const { limit = 20, offset = 0, startDate, endDate } = options;

  let whereClause = 'WHERE e.user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND e.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND e.created_at <= $${paramIndex}`;
    params.push(endDate + ' 23:59:59');
    paramIndex++;
  }

  // 获取总数
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM earnings e ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // 获取列表
  const listParams = [...params, limit, offset];
  const result = await db.query(
    `SELECT e.*, p.name as product_name, o.payer_info
     FROM earnings e
     LEFT JOIN orders o ON e.order_id = o.id
     LEFT JOIN products p ON o.product_id = p.id
     ${whereClause}
     ORDER BY e.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    items: result.rows,
    total,
  };
}

/**
 * 商户获取员工的收益记录
 */
export async function getEmployeeEarnings(
  merchantId: string,
  options: {
    employeeId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: EarningWithOrder[]; total: number }> {
  const { employeeId, limit = 20, offset = 0 } = options;

  let whereClause = 'WHERE e.merchant_id = $1';
  const params: any[] = [merchantId];
  let paramIndex = 2;

  if (employeeId) {
    whereClause += ` AND e.user_id = $${paramIndex}`;
    params.push(employeeId);
    paramIndex++;
  }

  // 获取总数
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM earnings e ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // 获取列表
  const listParams = [...params, limit, offset];
  const result = await db.query(
    `SELECT e.*, u.display_name as employee_name, p.name as product_name
     FROM earnings e
     LEFT JOIN users u ON e.user_id = u.id
     LEFT JOIN orders o ON e.order_id = o.id
     LEFT JOIN products p ON o.product_id = p.id
     ${whereClause}
     ORDER BY e.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    listParams
  );

  return {
    items: result.rows,
    total,
  };
}

/**
 * 记录员工收益（订单支付成功时调用）
 */
export async function recordEarning(params: {
  userId: string;
  merchantId: string;
  orderId: string;
  orderAmount: number;
  earningsAmount: number;
  rate?: number;
}): Promise<Earning> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. 写入收益记录
    const earningResult = await client.query(
      `INSERT INTO earnings (user_id, merchant_id, order_id, order_amount, earnings_amount, rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.userId,
        params.merchantId,
        params.orderId,
        params.orderAmount,
        params.earningsAmount,
        params.rate || null,
      ]
    );

    // 2. 更新钱包余额
    await client.query(
      `INSERT INTO wallets (user_id, balance, total_earnings)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         balance = wallets.balance + $2,
         total_earnings = wallets.total_earnings + $3,
         updated_at = NOW()`,
      [params.userId, params.earningsAmount, params.earningsAmount]
    );

    await client.query('COMMIT');
    return earningResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 处理订单支付成功时的员工收益
 * 如果订单创建者是员工，则自动计算收益
 */
export async function handleOrderEarnings(
  orderId: string,
  userId: string,
  orderAmount: number
): Promise<{ recorded: boolean; earning?: any; error?: string }> {
  try {
    // 1. 检查用户角色
    const userResult = await db.query(
      'SELECT id, role, merchant_id, earnings_rate FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { recorded: false, error: '用户不存在' };
    }

    const user = userResult.rows[0];

    // 只有员工才有收益
    if (user.role !== 'employee') {
      return { recorded: false };
    }

    if (!user.merchant_id) {
      return { recorded: false, error: '员工未关联商户' };
    }

    // 2. 计算收益金额
    // 默认收益比例为 10%，可由 earnings_rate 字段配置
    const rate = user.earnings_rate || 0.1;
    const earningsAmount = Math.round(orderAmount * rate);

    if (earningsAmount <= 0) {
      return { recorded: false };
    }

    // 3. 检查是否已记录收益（防止重复）
    const existingEarning = await db.query(
      'SELECT id FROM earnings WHERE order_id = $1',
      [orderId]
    );

    if (existingEarning.rows.length > 0) {
      console.log(`[Earnings] Order ${orderId} already has earning record, skip`);
      return { recorded: false };
    }

    // 4. 记录收益
    const earning = await recordEarning({
      userId: user.id,
      merchantId: user.merchant_id,
      orderId,
      orderAmount,
      earningsAmount,
      rate,
    });

    console.log(`[Earnings] Recorded earning for order ${orderId}: ${earningsAmount} cents (rate: ${rate})`);

    return { recorded: true, earning };
  } catch (error) {
    console.error('[Earnings] Error handling order earnings:', error);
    return { recorded: false, error: String(error) };
  }
}

/**
 * 冻结余额（提现申请时调用）
 */
export async function freezeBalance(
  userId: string,
  amount: number
): Promise<boolean> {
  const result = await db.query(
    `UPDATE wallets 
     SET balance = balance - $2,
         frozen_balance = frozen_balance + $2,
         updated_at = NOW()
     WHERE user_id = $1 AND balance >= $2`,
    [userId, amount]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * 解冻余额（提现拒绝或失败时调用）
 */
export async function unfreezeBalance(
  userId: string,
  amount: number
): Promise<boolean> {
  const result = await db.query(
    `UPDATE wallets 
     SET balance = balance + $2,
         frozen_balance = frozen_balance - $2,
         updated_at = NOW()
     WHERE user_id = $1 AND frozen_balance >= $2`,
    [userId, amount]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * 扣除冻结余额（提现成功时调用）
 */
export async function deductFrozenBalance(
  userId: string,
  amount: number
): Promise<boolean> {
  const result = await db.query(
    `UPDATE wallets 
     SET frozen_balance = frozen_balance - $2,
         total_withdrawn = total_withdrawn + $2,
         updated_at = NOW()
     WHERE user_id = $1 AND frozen_balance >= $2`,
    [userId, amount]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * 获取商户下所有员工的钱包汇总
 */
export async function getMerchantEmployeeWallets(
  merchantId: string
): Promise<{ user_id: string; display_name: string; balance: number; total_earnings: number }[]> {
  const result = await db.query(
    `SELECT u.id as user_id, u.display_name, 
            COALESCE(w.balance, 0) as balance,
            COALESCE(w.total_earnings, 0) as total_earnings
     FROM users u
     LEFT JOIN wallets w ON u.id = w.user_id
     WHERE u.merchant_id = $1 AND u.role = 'employee'
     ORDER BY w.total_earnings DESC NULLS LAST`,
    [merchantId]
  );

  return result.rows;
}
