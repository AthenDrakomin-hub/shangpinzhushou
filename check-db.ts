import { Pool } from 'pg';
import { config } from './src/config.js';

const pool = new Pool({
  connectionString: config.databaseUrl
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, status, amount, pay_type, paid_at 
      FROM public.orders 
      WHERE id = 'LB0415123309cd6bb3342b7622' OR status = 'paid'
      ORDER BY paid_at DESC NULLS LAST
      LIMIT 5;
    `);
    console.log('=== 订单状态查询结果 ===');
    console.table(res.rows);
  } catch(e: any) {
    console.error('查询出错:', e.message);
  } finally {
    await pool.end();
  }
}
check();
