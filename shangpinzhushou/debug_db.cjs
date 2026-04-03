const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/payforme'
});

async function run() {
  const users = await pool.query('SELECT id, email, role, created_by FROM public.users');
  console.log('USERS:', users.rows);
  const products = await pool.query('SELECT id, name, user_id FROM public.products');
  console.log('PRODUCTS:', products.rows);
  const orders = await pool.query('SELECT id, user_id, amount FROM public.orders');
  console.log('ORDERS:', orders.rows);
  pool.end();
}
run();
