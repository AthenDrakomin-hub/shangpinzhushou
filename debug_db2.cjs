const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/payforme'
});

async function run() {
  try {
    const users = await pool.query('SELECT id, email, role, created_by FROM public.users');
    console.log('--- USERS ---');
    console.log(users.rows);
  } catch (e) {
    console.error(e);
  }
  pool.end();
}
run();
