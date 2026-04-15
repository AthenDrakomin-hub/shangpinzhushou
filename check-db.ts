import { Pool } from 'pg';
import 'dotenv/config';

console.log('Database URL exists:', !!(process.env.PGDATABASE_URL || process.env.DATABASE_URL));

const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, status, amount, pay_type, paid_at 
      FROM public.orders 
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log('=== 最近的5笔订单 ===');
    console.table(res.rows);
  } catch(e: any) {
    console.error('查询出错:', e.message);
  } finally {
    await pool.end();
  }
}
check();
