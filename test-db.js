import { Pool } from 'pg';
import { config } from './src/config.js';

const pool = new Pool({
  connectionString: config.databaseUrl
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, status, amount, pay_type, paid_at 
      FROM orders 
      WHERE id = 'LB0415123309cd6bb3342b7622' OR status = 'paid'
      ORDER BY paid_at DESC NULLS LAST
      LIMIT 5;
    `);
    console.log('--- 最近成功支付的订单（或指定订单） ---');
    console.table(res.rows);
  } catch(e) {
    console.error('DB Error:', e);
  } finally {
    await pool.end();
  }
}
check();
