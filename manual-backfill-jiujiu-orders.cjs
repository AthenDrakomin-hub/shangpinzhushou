const fs = require('node:fs');
const { Pool } = require('pg');

function getEnvValue(key) {
  const v = process.env[key];
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
}

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!getEnvValue(k)) process.env[k] = v;
  }
}

if (!getEnvValue('PGDATABASE_URL') && !getEnvValue('DATABASE_URL')) {
  loadDotEnvFile('.env.local');
  loadDotEnvFile('.env');
}

const connectionString = getEnvValue('PGDATABASE_URL') || getEnvValue('DATABASE_URL');
if (!connectionString) {
  console.error('缺少 PGDATABASE_URL/DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString });

const orderIds = [
  'O1776226885691HF8O',
  'O177622706381645QB',
  'O1776227179920BKUB',
  'O1776227589830QWLY',
  'O1776227755880R1L1',
  'O177622781645035YN'
];

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function calcNetAmount(amountYuan, feePermille) {
  const amountFen = Math.round(toNumber(amountYuan) * 100);
  const feeFen = Math.round((amountFen * toNumber(feePermille)) / 1000);
  return (amountFen - feeFen) / 100;
}

function toMoney2(v) {
  const n = toNumber(v);
  return Math.round(n * 100) / 100;
}

function toRate4(v) {
  const n = toNumber(v);
  return Math.round(n * 10000) / 10000;
}

async function ensureWallet(client, userId) {
  await client.query(
    `
      INSERT INTO public.wallets (user_id, balance, frozen_balance, total_earnings, total_withdrawn)
      SELECT $1, 0, 0, 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = $1)
    `,
    [userId]
  );
}

async function distributeRevenue(client, orderUserId, merchantId, totalAmount, orderId, productName) {
  const amount = toMoney2(totalAmount);
  if (!(amount > 0)) return;

  const userRes = await client.query(
    `SELECT id, role, earnings_rate, created_by FROM public.users WHERE id = $1`,
    [orderUserId]
  );
  if (userRes.rows.length === 0) return;

  const chain = [userRes.rows[0]];
  let currentUserId = userRes.rows[0].created_by;
  for (let i = 0; i < 3; i++) {
    if (!currentUserId) break;
    const parentRes = await client.query(
      `SELECT id, role, earnings_rate, created_by FROM public.users WHERE id = $1`,
      [currentUserId]
    );
    if (parentRes.rows.length === 0) break;
    chain.push(parentRes.rows[0]);
    currentUserId = parentRes.rows[0].created_by;
  }

  let managerIndex = chain.findIndex((u) => u.role === 'manager' || u.role === 'admin');
  if (managerIndex === -1) managerIndex = chain.length - 1;
  const validChain = chain.slice(0, managerIndex + 1);

  let currentPool = amount;
  let poolOwnerIndex = validChain.length - 1;
  const payouts = new Array(validChain.length).fill(0);

  for (let i = validChain.length - 2; i >= 0; i--) {
    const node = validChain[i];
    const passDownRate = toNumber(node.earnings_rate);
    const r = Math.max(0, Math.min(100, passDownRate)) / 100;
    if (r > 0) {
      payouts[poolOwnerIndex] += currentPool * (1 - r);
      currentPool = currentPool * r;
      poolOwnerIndex = i;
    }
  }

  payouts[poolOwnerIndex] += currentPool;

  for (let i = 0; i < validChain.length; i++) {
    const amountToPay = toMoney2(payouts[i]);
    const userId = validChain[i].id;
    if (!(amountToPay > 0)) continue;

    await ensureWallet(client, userId);
    await client.query(
      `
        UPDATE public.wallets SET 
          balance = balance + $1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
        WHERE user_id = $2
      `,
      [amountToPay, userId]
    );

    const rate = toRate4(amountToPay / amount);
    await client.query(
      `
        INSERT INTO public.earnings (user_id, merchant_id, order_id, order_amount, earnings_amount, rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, merchantId, orderId, amount, amountToPay, rate, 'success']
    );
  }
}

(async () => {
  const channelsResult = await pool.query(`SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1`);
  let channels = [];
  if (channelsResult.rows.length > 0) {
    try {
      channels = JSON.parse(channelsResult.rows[0].value);
    } catch (e) {}
  }

  for (const orderId of orderIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT id, user_id, creator_uid, amount, pay_type, product_name, status
         FROM public.orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderRes.rowCount === 0) {
        await client.query('ROLLBACK');
        console.log('跳过，不存在订单:', orderId);
        continue;
      }

      const order = orderRes.rows[0];
      const channel = channels.find((c) => c && c.id === order.pay_type);
      const legacy = channel && channel.feeRate != null ? Number(channel.feeRate) : undefined;
      let feePermille = channel && channel.feePermille != null ? Number(channel.feePermille) : (legacy != null ? (legacy > 100 ? legacy : legacy * 10) : 0);
      feePermille = Math.max(0, Math.min(1000, feePermille));
      const actualAmount = calcNetAmount(order.amount, feePermille || 0);

      if (order.status !== 'paid') {
        await client.query(
          `
            UPDATE public.orders SET
              status = 'paid',
              paid_at = NOW(),
              payment_amount = $2
            WHERE id = $1
          `,
          [orderId, actualAmount]
        );
      } else {
        await client.query(
          `UPDATE public.orders SET payment_amount = $2 WHERE id = $1`,
          [orderId, actualAmount]
        );
      }

      const existedEarnings = await client.query(`SELECT 1 FROM public.earnings WHERE order_id = $1 LIMIT 1`, [orderId]);
      if (existedEarnings.rowCount > 0) {
        await client.query('COMMIT');
        console.log('跳过，已存在收益记录:', orderId);
        continue;
      }

      const merchantId = order.creator_uid || order.user_id;
      await distributeRevenue(client, order.user_id, merchantId, actualAmount, orderId, order.product_name || '');

      await client.query('COMMIT');
      console.log('补单完成:', orderId);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('补单失败:', orderId, e.message || e);
    } finally {
      client.release();
    }
  }

  await pool.end();
})();
