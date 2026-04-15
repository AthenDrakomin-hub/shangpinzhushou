import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL });

const orderIds = [
  'O177622781645035YN',
  'O1776227755880R1L1',
  'O1776227589830QWLY',
  'O17762275206112FOI',
  'O1776227404916BR18',
  'O1776227342303Z0QJ'
];

async function distributeRevenue(orderUserId: string, merchantId: string, totalAmount: number, dbClient: any, orderId: string) {
  const amount = parseFloat(totalAmount as any);
  if (isNaN(amount) || amount <= 0) return;

  const userRes = await dbClient.query(
    `
      SELECT id, role, earnings_rate, created_by 
      FROM public.users WHERE id = $1
    `,
    [orderUserId]
  );

  if (userRes.rows.length === 0) return;

  const user = userRes.rows[0];
  const chain = [user];

  let currentUserId = user.created_by;
  for (let i = 0; i < 3; i++) {
    if (!currentUserId) break;
    const parentRes = await dbClient.query(
      `
        SELECT id, role, earnings_rate, created_by 
        FROM public.users WHERE id = $1
      `,
      [currentUserId]
    );
    if (parentRes.rows.length === 0) break;
    chain.push(parentRes.rows[0]);
    currentUserId = parentRes.rows[0].created_by;
  }

  let managerIndex = chain.findIndex((u: any) => u.role === 'manager' || u.role === 'admin');
  if (managerIndex === -1) managerIndex = chain.length - 1;

  const validChain = chain.slice(0, managerIndex + 1);

  let currentPool = amount;
  let poolOwnerIndex = validChain.length - 1;
  const payouts = new Array(validChain.length).fill(0);

  for (let i = validChain.length - 2; i >= 0; i--) {
    const node = validChain[i];
    const passDownRate = parseFloat(node.earnings_rate) || 0;
    const r = Math.max(0, Math.min(100, passDownRate)) / 100;

    if (r > 0) {
      payouts[poolOwnerIndex] += currentPool * (1 - r);
      currentPool = currentPool * r;
      poolOwnerIndex = i;
    } else {
      payouts[i] += 0;
    }
  }

  payouts[poolOwnerIndex] += currentPool;

  for (let i = 0; i < validChain.length; i++) {
    const amountToPay = payouts[i];
    const userId = validChain[i].id;

    if (amountToPay <= 0) continue;

    await dbClient.query(
      `
        UPDATE public.wallets SET 
          balance = balance + $1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
        WHERE user_id = $2
      `,
      [amountToPay, userId]
    );

    await dbClient.query(
      `
        INSERT INTO public.earnings (user_id, merchant_id, order_id, order_amount, earnings_amount, rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, merchantId, orderId, amount, amountToPay, (amountToPay / amount) * 100, 'success']
    );
  }
}

async function run() {
  for (const orderId of orderIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query('SELECT * FROM public.orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (orderRes.rowCount === 0) {
        await client.query('ROLLBACK');
        continue;
      }

      const order = orderRes.rows[0];

      if (order.status !== 'paid') {
        await client.query(
          `
            UPDATE public.orders SET
              status = 'paid',
              paid_at = NOW(),
              payment_amount = $2
            WHERE id = $1
          `,
          [orderId, 24]
        );
      }

      const existedEarnings = await client.query('SELECT 1 FROM public.earnings WHERE order_id = $1 LIMIT 1', [orderId]);
      if (existedEarnings.rowCount > 0) {
        await client.query('COMMIT');
        continue;
      }

      const merchantId = order.creator_uid || order.user_id;
      await distributeRevenue(order.user_id, merchantId, 24, client, orderId);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

run().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

