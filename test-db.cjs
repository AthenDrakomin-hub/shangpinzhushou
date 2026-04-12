const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://payforme:payforme123@localhost:5432/payforme' });

async function run() {
  try {
    const res = await pool.query('SELECT id, display_name, role, created_by FROM public.users');
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
