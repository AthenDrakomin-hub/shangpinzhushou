import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pkg: any;
try {
  pkg = require('pg');
} catch (_e) {
  pkg = require(`${process.cwd()}/node_modules/pg`);
}
const { Pool } = pkg;

function getEnvValue(key: string) {
  const v = process.env[key];
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
}

function loadDotEnvFile(filePath: string) {
  const fs = require('node:fs');
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!getEnvValue(k)) process.env[k] = v;
  }
}

if (!getEnvValue('PGDATABASE_URL') && !getEnvValue('DATABASE_URL')) {
  loadDotEnvFile('.env.local');
  loadDotEnvFile('.env');
}

const pool = new Pool({ connectionString: getEnvValue('PGDATABASE_URL') || getEnvValue('DATABASE_URL') });

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid number literal: ${String(value)}`);
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString(10);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function toMoney2(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function money2Literal(v: unknown) {
  return toMoney2(v).toFixed(2);
}

function rate4Literal(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.0000';
  return (Math.round(n * 10000) / 10000).toFixed(4);
}

const targetUserId = 'e39ecb4f-6a76-4def-b620-803430bcf234';

const targetOrderIds = [
  'O1776226885691HF8O',
  'O177622706381645QB',
  'O1776227179920BKUB',
  'O1776227589830QWLY',
  'O1776227755880R1L1',
  'O177622781645035YN',
];

type EarningsSchemaMode = 'legacy' | 'v2';

async function detectEarningsSchemaMode(client: any): Promise<EarningsSchemaMode> {
  const res = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'earnings'
  `);
  const columns = new Set<string>(res.rows.map((r: any) => String(r.column_name)));
  if (columns.has('earnings_amount') || columns.has('order_amount') || columns.has('merchant_id')) return 'v2';
  return 'legacy';
}

async function ensureWalletExists(client: any, userId: string) {
  await client.query(`
    INSERT INTO public.wallets (user_id, balance, frozen_balance, total_earnings, total_withdrawn)
    SELECT ${sqlLiteral(userId)}, 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = ${sqlLiteral(userId)})
  `);
}

async function getUserChain(client: any, userId: string) {
  const chain: Array<{ id: string; role: string; earnings_rate: string; created_by: string | null }> = [];

  const userRes = await client.query(`
    SELECT id, role, earnings_rate, created_by
    FROM public.users WHERE id = ${sqlLiteral(userId)}
  `);
  if (userRes.rows.length === 0) return chain;
  chain.push(userRes.rows[0]);

  let currentUserId = userRes.rows[0].created_by as string | null;
  for (let i = 0; i < 3; i++) {
    if (!currentUserId) break;
    const parentRes = await client.query(`
      SELECT id, role, earnings_rate, created_by
      FROM public.users WHERE id = ${sqlLiteral(currentUserId)}
    `);
    if (parentRes.rows.length === 0) break;
    chain.push(parentRes.rows[0]);
    currentUserId = parentRes.rows[0].created_by;
  }

  return chain;
}

function computePayouts(chain: Array<{ id: string; role: string; earnings_rate: string }>, amount: number) {
  if (chain.length === 0) return [];

  let managerIndex = chain.findIndex((u) => u.role === 'manager' || u.role === 'admin');
  if (managerIndex === -1) managerIndex = chain.length - 1;

  const validChain = chain.slice(0, managerIndex + 1);

  let currentPool = amount;
  let poolOwnerIndex = validChain.length - 1;
  const payouts = new Array(validChain.length).fill(0);

  for (let i = validChain.length - 2; i >= 0; i--) {
    const node = validChain[i];
    const passDownRate = Number.parseFloat(node.earnings_rate) || 0;
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

  return validChain.map((u, idx) => ({
    userId: u.id,
    role: u.role,
    earningsRate: Number.parseFloat(u.earnings_rate) || 0,
    amount: toMoney2(payouts[idx]),
  }));
}

async function distributeRevenueV2(args: {
  client: any;
  orderId: string;
  orderUserId: string;
  merchantId: string | null;
  baseAmount: number;
}) {
  const { client, orderId, orderUserId, merchantId, baseAmount } = args;
  if (baseAmount <= 0) return [];

  const chain = await getUserChain(client, orderUserId);
  const payouts = computePayouts(chain, baseAmount);

  for (const p of payouts) {
    if (p.amount <= 0) continue;
    await ensureWalletExists(client, p.userId);

    await client.query(`
      UPDATE public.wallets SET
        balance = balance + ${money2Literal(p.amount)},
        total_earnings = total_earnings + ${money2Literal(p.amount)},
        updated_at = NOW()
      WHERE user_id = ${sqlLiteral(p.userId)}
    `);

    await client.query(`
      INSERT INTO public.earnings (user_id, merchant_id, order_id, order_amount, earnings_amount, rate, status)
      VALUES (
        ${sqlLiteral(p.userId)},
        ${merchantId ? sqlLiteral(merchantId) : 'NULL'},
        ${sqlLiteral(orderId)},
        ${money2Literal(baseAmount)},
        ${money2Literal(p.amount)},
        ${rate4Literal(p.amount / baseAmount)},
        'success'
      )
    `);
  }

  return payouts;
}

async function distributeRevenueLegacy(args: {
  client: any;
  orderId: string;
  orderUserId: string;
  productName: string;
  baseAmount: number;
}) {
  const { client, orderId, orderUserId, productName, baseAmount } = args;
  if (baseAmount <= 0) return [];

  const chain = await getUserChain(client, orderUserId);
  const payouts = computePayouts(chain, baseAmount);

  for (let i = 0; i < payouts.length; i++) {
    const p = payouts[i];
    if (p.amount <= 0) continue;

    await ensureWalletExists(client, p.userId);
    await client.query(`
      UPDATE public.wallets SET
        balance = balance + ${money2Literal(p.amount)},
        total_earnings = total_earnings + ${money2Literal(p.amount)},
        updated_at = NOW()
      WHERE user_id = ${sqlLiteral(p.userId)}
    `);

    await client.query(`
      INSERT INTO public.earnings (user_id, order_id, product_name, amount, type)
      VALUES (
        ${sqlLiteral(p.userId)},
        ${sqlLiteral(orderId)},
        ${sqlLiteral(productName)},
        ${money2Literal(p.amount)},
        ${sqlLiteral(i === 0 ? 'sale' : 'commission')}
      )
    `);
  }

  return payouts;
}

async function rollbackExistingEarnings(args: { client: any; orderId: string; mode: EarningsSchemaMode }) {
  const { client, orderId, mode } = args;

  const amountColumn = mode === 'v2' ? 'earnings_amount' : 'amount';

  const earningsRes = await client.query(`
    SELECT user_id, ${amountColumn} AS amount
    FROM public.earnings
    WHERE order_id = ${sqlLiteral(orderId)}
    FOR UPDATE
  `);

  const byUserId = new Map<string, number>();
  for (const row of earningsRes.rows) {
    const userId = String(row.user_id);
    const amount = toMoney2(row.amount);
    byUserId.set(userId, toMoney2((byUserId.get(userId) ?? 0) + amount));
  }

  const rollbackItems: Array<{ userId: string; amount: number }> = [];
  for (const [userId, amount] of byUserId.entries()) {
    if (amount === 0) continue;
    await ensureWalletExists(client, userId);
    await client.query(`
      UPDATE public.wallets SET
        balance = balance - ${money2Literal(amount)},
        total_earnings = total_earnings - ${money2Literal(amount)},
        updated_at = NOW()
      WHERE user_id = ${sqlLiteral(userId)}
    `);
    rollbackItems.push({ userId, amount });
  }

  await client.query(`DELETE FROM public.earnings WHERE order_id = ${sqlLiteral(orderId)}`);

  return rollbackItems;
}

async function run() {
  const sharedClient = await pool.connect();
  let mode: EarningsSchemaMode = 'legacy';
  try {
    mode = await detectEarningsSchemaMode(sharedClient);
  } finally {
    sharedClient.release();
  }

  console.log(`[schema] earnings mode: ${mode}`);
  console.log(`[target] user: ${targetUserId}`);
  console.log(`[target] orders: ${targetOrderIds.join(', ')}`);

  for (const orderId of targetOrderIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(`
        SELECT *
        FROM public.orders
        WHERE id = ${sqlLiteral(orderId)}
        FOR UPDATE
      `);
      if (orderRes.rowCount === 0) {
        await client.query('ROLLBACK');
        console.log(`[skip] order not found: ${orderId}`);
        continue;
      }

      const order = orderRes.rows[0] as any;
      const productName = String(order.product_name ?? '');
      const originalUserId = order.user_id ? String(order.user_id) : null;
      const originalReferrerId = order.referrer_id ? String(order.referrer_id) : null;
      const creatorUid = order.creator_uid ? String(order.creator_uid) : null;

      const rollbackItems = await rollbackExistingEarnings({ client, orderId, mode });

      await client.query(`
        UPDATE public.orders SET
          user_id = ${sqlLiteral(targetUserId)},
          referrer_id = ${sqlLiteral(targetUserId)}
        WHERE id = ${sqlLiteral(orderId)}
      `);

      const rawPaymentAmount = order.payment_amount;
      const baseAmount = toMoney2(rawPaymentAmount === null || rawPaymentAmount === undefined || rawPaymentAmount === '' ? order.amount : rawPaymentAmount);

      const merchantId = creatorUid || targetUserId;
      const payouts =
        mode === 'v2'
          ? await distributeRevenueV2({
              client,
              orderId,
              orderUserId: targetUserId,
              merchantId,
              baseAmount,
            })
          : await distributeRevenueLegacy({
              client,
              orderId,
              orderUserId: targetUserId,
              productName,
              baseAmount,
            });

      await client.query('COMMIT');

      const rollbackTotal = toMoney2(rollbackItems.reduce((sum, x) => sum + x.amount, 0));
      console.log(
        JSON.stringify(
          {
            orderId,
            baseAmount: toMoney2(baseAmount),
            updated: {
              userId: targetUserId,
              referrerId: targetUserId,
            },
            previous: {
              userId: originalUserId,
              referrerId: originalReferrerId,
            },
            rollback: {
              total: rollbackTotal,
              items: rollbackItems,
            },
            payouts,
          },
          null,
          2
        )
      );
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[fail] order ${orderId}:`, err);
      process.exitCode = 1;
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
