import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payforme' });
const result = await pool.query("SELECT value FROM public.system_configs WHERE key = 'payment_channels'");
console.log(result.rows[0]?.value);
process.exit(0);
