const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://payforme:payforme123@localhost:5432/payforme' });

async function run() {
  try {
    // 1. Create a dummy product
    const id = 'p_test123';
    await pool.query("INSERT INTO products (id, user_id, name, price, is_shared) VALUES ($1, (SELECT id FROM users LIMIT 1), 'test', 100, false) ON CONFLICT DO NOTHING", [id]);
    
    // 2. Update with is_shared = true
    let is_shared = true;
    let res = await pool.query(`UPDATE products SET is_shared = COALESCE($1, is_shared) WHERE id = $2 RETURNING is_shared`, [is_shared, id]);
    console.log("After update true:", res.rows[0]);

    // 3. Update with is_shared = false
    is_shared = false;
    res = await pool.query(`UPDATE products SET is_shared = COALESCE($1, is_shared) WHERE id = $2 RETURNING is_shared`, [is_shared, id]);
    console.log("After update false:", res.rows[0]);

    // 4. Update with is_shared = undefined (null in pg)
    is_shared = undefined;
    res = await pool.query(`UPDATE products SET is_shared = COALESCE($1, is_shared) WHERE id = $2 RETURNING is_shared`, [is_shared, id]);
    console.log("After update undefined:", res.rows[0]);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
