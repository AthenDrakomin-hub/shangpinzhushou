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

async function fixOrders() {
  try {
    for (const orderId of failedOrders) {
      const res = await pool.query(
        `UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
        [orderId]
      );
      if (res.rowCount === 0) {
        console.log(`❌ 订单 ${orderId} 不存在`);
      } else {
        console.log(`✅ 订单 ${orderId} 补单成功，当前状态:`, res.rows[0].status);
      }
    }
  } catch (err: any) {
    console.error('❌ 补单失败:', err.message);
  } finally {
    await pool.end();
  }
}

fixOrders();
