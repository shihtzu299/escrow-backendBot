// server.js — AfriLance BOT v9.3 — SUPABASE PERSISTENT
import 'dotenv/config';
import http from 'http';
import { Telegraf, Markup } from 'telegraf';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';  // ← NEW

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();

const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const DEFAULT_ORACLE_TG_ID = (process.env.DEFAULT_ORACLE_TG_ID || '').trim();
const ORACLE_ALERT_TG_IDS = (process.env.ORACLE_ALERT_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!BOT_TOKEN || !PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: Missing BOT_TOKEN, PRIVATE_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dummyServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AfriLance Bot is running (polling mode)');
});

const PORT = process.env.PORT || 10000;
dummyServer.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT} for Render health check`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MULTIPLE RPC PROVIDERS WITH TIMEOUT & FAILOVER =====
const RPC_URLS = [
  process.env.RPC_URL?.trim(),
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org'
].filter(Boolean);

let provider;

async function createProvider() {
  for (const url of RPC_URLS) {
    try {
      console.log(`Trying RPC: ${url}`);
      const prov = new ethers.JsonRpcProvider(url, undefined, {
        pollingInterval: 12000,
        timeout: 10000, // Critical: prevent hanging
      });
      await prov.getBlockNumber();
      console.log(`RPC CONNECTED & VERIFIED: ${url}`);
      return prov;
    } catch (e) {
      console.warn(`RPC failed: ${url} → ${e.message}`);
    }
  }
  console.warn('All RPCs failed. Using fallback...');
  return new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org', undefined, {
    pollingInterval: 15000,
    timeout: 12000,
  });
}

provider = await createProvider();
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ===== CONTRACTS =====
const FACTORY_ADDRESS = '0x752c69ee75E7BF58ac478e2aC1F7E7fd341BB865';
const USDT_ADDRESS    = '0x55d398326f99059fF775485246999027B3197955';
const USDC_ADDRESS    = '0x8AC76a51cc950d9822D68b83fE1Ad97b32Cd580d';

const FACTORY_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrowFactory.json'), 'utf8'));
const ESCROW_ABI  = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrow.json'), 'utf8'));

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
const escrowIface = new ethers.Interface(ESCROW_ABI);
const TOKEN_DECIMALS = 18;

const bot = new Telegraf(BOT_TOKEN);

// ===== HELPERS =====
const formatAddress = (addr) => addr ? `\`${addr.slice(0, 8)}…${addr.slice(-6)}\`` : '`—`';
const explorer = (addr) => `https://bscscan.com/address/${addr}#code`;
const writeLink = (addr) => `${explorer(addr)}#writeContract`;
const code = (text) => `\`\`\`\n${text}\n\`\`\``;

// ===== DATABASE — SUPABASE + LOCAL CACHE =====
let db = { lastBlock: 0, escrows: {}, stats: { totalCompleted: 0 } };

async function loadDb() {
  try {
    const { data, error } = await supabase
      .from('escrows')
      .select('id, data')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    let completed = 0;
    const escrows = {};

    data.forEach(row => {
      const key = row.id;
      const record = row.data;
      if (record.completed) {
        completed++;
      } else {
        escrows[key] = record;
      }
    });

    db.escrows = escrows;
    db.stats.totalCompleted = completed;
    db.lastBlock = Math.max(...data.map(r => r.data.lastBlock || 0), 0);

    console.log(`Supabase loaded: ${Object.keys(escrows).length} active | ${completed} completed`);
  } catch (err) {
    console.error('Supabase load failed:', err.message);
    console.log('Falling back to empty state');
  }
}

async function saveDb() {
  try {
    const ops = [];

    // Save active escrows
    for (const [key, record] of Object.entries(db.escrows)) {
      ops.push(
        supabase
          .from('escrows')
          .upsert({
            id: key,
            data: { ...record, lastBlock: db.lastBlock }
          }, { onConflict: 'id' })
      );
    }

    // Save completed count via a special row
    ops.push(
      supabase
        .from('escrows')
        .upsert({
          id: '__stats__',
          data: { totalCompleted: db.stats.totalCompleted, lastBlock: db.lastBlock }
        }, { onConflict: 'id' })
    );

    await Promise.all(ops);
    console.log('Supabase sync complete');
  } catch (err) {
    console.error('Supabase save failed:', err.message);
  }
}

// Initial load
await loadDb();

// ===== NOTIFY =====
async function notify(id, text) {
  if (!id) return;
  try {
    await bot.telegram.sendMessage(id, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (e) {
    console.error(`Notify failed (${id}):`, e.message);
  }
}

async function notifyAdmins(text) {
  const ids = new Set([...ORACLE_ALERT_TG_IDS, DEFAULT_ORACLE_TG_ID].filter(Boolean));
  for (const id of ids) await notify(id, text);
}

function labelEscrow(esc) { return `\`${esc}\` — [view](${explorer(esc)})`; }

function markEscrowCompleted(escAddr) {
  const key = escAddr.toLowerCase();
  if (db.escrows[key]) {
    delete db.escrows[key];
    db.stats.totalCompleted += 1;
    console.log(`COMPLETED #${db.stats.totalCompleted}: ${escAddr}`);
    saveDb();  // ← now async, but fire-and-forget
  }
}

// ===== handleLog — now uses checksummed addresses safely =====
async function handleLog(escAddr, log) {
  let parsed;
  try { parsed = escrowIface.parseLog(log); } catch { return; }
  if (!parsed?.name) return;

  const name = parsed.name;
  const escKey = ethers.getAddress(escAddr);  // ← checksum safe
  const key = escKey.toLowerCase();

  if (!db.escrows[key]) {
    db.escrows[key] = {
      state: 0, deadline: 0, completed: false,
      client: null, freelancer: null, oracle: null,
      tgClientId: null, tgFreelancerId: null, tgOracleId: DEFAULT_ORACLE_TG_ID || null
    };
  }

  const rec = db.escrows[key];

  if (!rec.client || !rec.freelancer || !rec.oracle) {
    try {
      const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);
      const [client, freelancer, oracle] = await Promise.all([
        c.client().catch(() => null),
        c.freelancer().catch(() => null),
        c.oracle().catch(() => null)
      ]);
      if (client) rec.client = client;
      if (freelancer) rec.freelancer = freelancer;
      if (oracle) rec.oracle = oracle;
    } catch (e) {
      console.warn(`Role fetch failed for ${escAddr} (continuing):`, e.message);
    }
  }

  const tokenSym = await (async () => {
    try {
      const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);
      const token = await c.settlementToken();
      return token.toLowerCase() === USDT_ADDRESS.toLowerCase() ? 'USDT' :
             token.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 'USDC' : 'TOKEN';
    } catch { return 'TOKEN'; }
  })();

  const where = labelEscrow(escAddr);

  switch (name) {
    case 'Deposited': {
      const [, amount] = parsed.args;
      const amt = ethers.formatUnits(amount, TOKEN_DECIMALS);
      rec.state = 1;
      await notify(rec.tgFreelancerId, `Deposit Received 💰 — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tgClientId, `You deposited 💰 ${amt} ${tokenSym}\nEscrow: ${where}`);
      break;
    }
    case 'FeePaid': {
      const [, feeAmount] = parsed.args;
      const fee = ethers.formatUnits(feeAmount, 18);
      rec.state = 2;
      await notify(rec.tgFreelancerId, `Fee Paid 🤑 — ${fee} BNB\nYou can now start the job!\nEscrow: ${where}`);
      await notify(rec.tgClientId, `You paid the fee 🤑 — ${fee} BNB\nFreelancer can start.\nEscrow: ${where}`);
      break;
    }
    case 'Started': {
      const [deadline] = parsed.args;
      const when = new Date(Number(deadline) * 1000).toLocaleString();
      rec.state = 3;
      rec.deadline = Number(deadline);
      await notify(rec.tgClientId, `Job Started! 🔥\nDeadline: *${when}*\nEscrow: ${where}`);
      await notify(rec.tgFreelancerId, `You started the job 🔥\nDeadline: *${when}*\nEscrow: ${where}`);
      break;
    }
    case 'Submitted': {
      const [proofHash] = parsed.args;
      rec.state = 4;
      await notify(rec.tgClientId, `Work Submitted! 📄\n\nProof: \`${proofHash}\`\nEscrow: ${where}\n\nPlease review & approve/request revision\n\n💡 *To view the submitted file,* unhash it on [Pinata](https://app.pinata.cloud/auth/signin) by searching for the CID without the "ipfs://" e.g: bafkreieqryqewmspvcdl2f5oq6tydrtybrfjh4zj27ko53fznxp6zazibu, using the search bar`);
      await notify(rec.tgFreelancerId, `You submitted proof 📄\nWaiting for client approval/revision request\nEscrow: ${where}`);
      break;
    }
    case 'Revised': {
      const [messageHash] = parsed.args;
      rec.state = 4;
      await notify(rec.tgFreelancerId, `Revision Requested 📝\n💬 Revision message: \`${messageHash}\`\nPlease resubmit your work\nEscrow: ${where}`);
      await notify(rec.tgClientId, `Revision request sent to freelancer 📝\nEscrow: ${where}`);
      break;
    }
    case 'Approved': {
      const [, deposit, bonus] = parsed.args;
      const dep = ethers.formatUnits(deposit, TOKEN_DECIMALS);
      const bon = ethers.formatUnits(bonus, 18);
      await notify(rec.tgFreelancerId, `APPROVED! ✅\nYou received ${dep} ${tokenSym} 💰\nEscrow: ${where}\nThank you!`);
      await notify(rec.tgClientId, `Job approved ✅\nPayment released: ${dep} ${tokenSym} 💰\nEscrow: ${where}`);
      markEscrowCompleted(escAddr);
      break;
    }
    case 'Disputed': {
      const [by] = parsed.args;
      await notify(rec.tgClientId, `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review`);
      await notify(rec.tgFreelancerId, `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review`);
      await notify(rec.tgOracleId || DEFAULT_ORACLE_TG_ID, `NEW DISPUTE ⚠️ — REVIEW REQUIRED\nEscrow: ${where}`);
      await notifyAdmins(`DISPUTE ⚠️: ${escAddr}\nBy: \`${by}\``);
      break;
    }
    case 'Resolved': {
      const [winner, amount] = parsed.args;
      const amt = ethers.formatUnits(amount, TOKEN_DECIMALS);
      await notify(rec.tgClientId, `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tgFreelancerId, `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tgOracleId || DEFAULT_ORACLE_TG_ID, `Dispute Resolved ✅\nWinner: \`${winner}\`\nEscrow: ${where}`);
      markEscrowCompleted(escAddr);
      break;
    }
  }
  saveDb();
}

// ===== ULTRA-ROBUST POLLING — NEVER HANGS, NEVER TIMES OUT =====
async function pollOnce() {
  try {
    const latestBlock = await provider.getBlockNumber().catch(() => null);
    if (!latestBlock) {
      console.warn('Failed to get latest block — skipping poll');
      return;
    }

    let fromBlock = db.lastBlock + 1;
    if (latestBlock - fromBlock > 200) {
      console.log(`Jumping forward from block ${fromBlock} → ${latestBlock - 200}`);
      fromBlock = latestBlock - 200;
    }
    if (fromBlock >= latestBlock) {
      db.lastBlock = latestBlock;
      saveDb();
      return;
    }

    const toBlock = latestBlock - 1;
    const escrows = Object.keys(db.escrows);

    if (escrows.length === 0) {
      db.lastBlock = latestBlock;
      saveDb();
      return;
    }

    for (const esc of escrows) {
      try {
        const logs = await provider.getLogs({
          address: esc,
          fromBlock,
          toBlock
        }).catch(() => []);

        for (const log of logs) {
          await handleLog(esc, log);
        }
      } catch (e) {
        if (e?.code === 'TIMEOUT' || e?.message?.includes('timeout')) {
          console.log(`Timeout on ${esc} — skipping this cycle (will retry)`);
        } else if (e?.message?.includes('invalid block range')) {
          console.log(`Invalid block range for ${esc} — skipping`);
        } else {
          console.warn(`Log fetch error for ${esc}:`, e.message || e);
        }
      }
    }

    db.lastBlock = latestBlock;
    saveDb();
  } catch (err) {
    console.error('pollOnce critical error:', err.message || err);
  }
}

// ===== RESTART POLLING ON PROVIDER FAILURE =====
provider.on('error', async (err) => {
  console.error('Provider error — restarting provider...', err.message);
  provider = await createProvider();
});


// ===== ALL COMMANDS — UNCHANGED & PERFECT =====
bot.command('stats', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const isPrivileged = ADMIN_TG_IDS.includes(String(userId)) ||
                         ORACLE_ALERT_TG_IDS.includes(String(userId)) ||
                         String(userId) === DEFAULT_ORACLE_TG_ID;

    const now = Math.floor(Date.now() / 1000);
    const active = [], completed = [], expired = [];

    const escrowsToCheck = isPrivileged
      ? Object.entries(db.escrows)
      : Object.entries(db.escrows).filter(([_, d]) => d.tgClientId === userId || d.tgFreelancerId === userId);

    for (const [addr, data] of escrowsToCheck) {
      const e = { addr, ...data };
      const isExpired = e.state < 2 && e.deadline > 0 && now > e.deadline + 86400 * 3;
      if (e.completed) completed.push(e);
      else if (isExpired) expired.push(e);
      else active.push(e);
    }

    const totalEver = (isPrivileged ? Object.keys(db.escrows).length : escrowsToCheck.length) + db.stats.totalCompleted;
    const format = (e) => `\`${e.addr}\` — [view](${explorer(e.addr)})`;

    let text = isPrivileged ? `*GLOBAL ESCROW STATS* \\(BSC\\)\n\n` : `*YOUR ESCROW STATS*\n\n`;
    text += `*Total Jobs Ever:* \`${totalEver}\`\n`;
    text += `*Active:* \`${active.length}\` \\| *Completed:* \`${completed.length + db.stats.totalCompleted}\` \\| *Expired:* \`${expired.length}\`\n\n`;

    if (active.length) text += `*Active Escrows*\n${active.map(format).join('\n')}\n\n`;
    if (completed.length || db.stats.totalCompleted) {
      text += `*Completed Escrows*`;
      if (completed.length) text += `\n${completed.slice(-10).map(format).join('\n')}`;
      if (db.stats.totalCompleted > completed.length) text += `\n\\+ ${db.stats.totalCompleted - completed.length} older completed jobs`;
      text += `\n\n`;
    }
    if (expired.length) text += `*Expired \\(Unfunded\\)*\n${expired.map(format).join('\n')}\n\n`;

    if (active.length + completed.length + expired.length === 0) {
      text += isPrivileged ? "No escrows yet\\." : "😏 You have no escrows yet\\.";
    } else {
      text += `Hard work pays 🤝\\.`;
    }

    await ctx.reply(text, { parse_mode: 'MarkdownV2', disable_web_page_preview: true });
  } catch (err) {
    ctx.reply('Stats temporarily unavailable.');
  }
});

bot.start(async (ctx) => {
  await ctx.reply(
`*Welcome to AfriLance Bot* 🤝

The main app is now at https://afrilance-landing.vercel.app/

To receive Telegram alerts for escrow events (deposits, disputes, approvals), link your Telegram ID using the format below:

\/link <escrowAddress> <yourRole> <yourWalletAddress>

*Link Command Example:*
Client - /link escrowAddress client yourAddress
Freelancer - /link escrowAddress freelancer yourAddress`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
});

bot.command('link', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/).slice(1);
  if (parts.length < 3) return ctx.reply('Usage: /link <escrow> <client|freelancer|oracle> <address>');

  const [esc, role, addr] = parts;
  if (!ethers.isAddress(esc) || !ethers.isAddress(addr)) return ctx.reply('Invalid address');

  const escKey = ethers.getAddress(esc).toLowerCase();
  const r = role.toLowerCase();

  if (!['client', 'freelancer', 'oracle'].includes(r)) return ctx.reply('Role: client|freelancer|oracle');
  if (r === 'oracle' && !ADMIN_TG_IDS.includes(String(ctx.from.id))) return ctx.reply('Only admin can link oracle');

  db.escrows[escKey] = db.escrows[escKey] || {};
  db.escrows[escKey][r] = ethers.getAddress(addr);
  db.escrows[escKey]['tg' + r.charAt(0).toUpperCase() + r.slice(1) + 'Id'] = ctx.from.id;

  saveDb();
  ctx.reply(`✅ Linked\n*Escrow:* ${formatAddress(esc)}\n*Role:* ${r}\n*Wallet:* ${formatAddress(addr)}\nNow you will get escrow event alerts.`, { parse_mode: 'Markdown' });
});

bot.command('who', async (ctx) => {
  const esc = ctx.message.text.split(' ')[1];
  if (!ethers.isAddress(esc)) return ctx.reply('Usage: /who <escrow>');
  const rec = db.escrows[esc.toLowerCase()] || {};
  const oracleTg = rec.tgOracleId || DEFAULT_ORACLE_TG_ID || '—';
  await ctx.reply(
`*Escrow:* ${formatAddress(esc)}
Client: ${formatAddress(rec.client)} \\(tg: \`${rec.tgClientId || '—'}\`\\)
Freelancer: ${formatAddress(rec.freelancer)} \\(tg: \`${rec.tgFreelancerId || '—'}\`\\)
Oracle: ${formatAddress(rec.oracle)} \\(tg: \`${oracleTg}\`\\)`,
    { parse_mode: 'MarkdownV2' }
  );
});

// ===== LAUNCH =====
console.log('AfriLance BOT v9.3 — SUPABASE PERSISTENT');
console.log(`Completed jobs: ${db.stats.totalCompleted}`);

bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('AfriLance BOT IS LIVE — UNSTOPPABLE'))
  .catch(err => console.error('Bot failed to start:', err));

setInterval(pollOnce, 30000);
pollOnce();