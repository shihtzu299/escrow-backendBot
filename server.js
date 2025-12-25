// server.js — FORJE BOT v10 — LEAN NOTIFICATION BOT + WEB API
import 'dotenv/config';
import http from 'http';
import express from 'express';  // Added for API
import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();

const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const DEFAULT_ORACLE_TG_ID = (process.env.DEFAULT_ORACLE_TG_ID || '').trim();
const ORACLE_ALERT_TG_IDS = (process.env.ORACLE_ALERT_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

if (!BOT_TOKEN || !PRIVATE_KEY) {
  console.error('FATAL: BOT_TOKEN or PRIVATE_KEY missing in .env');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== RPC PROVIDERS =====
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
      const prov = new ethers.JsonRpcProvider(url);
      await prov.getBlockNumber();
      return prov;
    } catch {}
  }
  return new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org');
}

provider = await createProvider();

// ===== CONTRACTS =====
const FACTORY_ADDRESS = '0x752c69ee75E7BF58ac478e2aC1F7E7fd341BB865';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const USDC_ADDRESS = '0x8AC76a51cc950d9822D68b83fE1Ad97b32Cd580d';

const FACTORY_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrowFactory.json')));
const ESCROW_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrow.json')));

const escrowIface = new ethers.Interface(ESCROW_ABI);

// ===== DATABASE =====
const DB_PATH = path.join(__dirname, 'db.json');
let db = { lastBlock: 0, escrows: {}, stats: { totalCompleted: 0 } };

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readJsonSync(DB_PATH);
    db.lastBlock = Number(raw.lastBlock || 0);
    db.escrows = raw.escrows || {};
    db.stats = raw.stats || { totalCompleted: 0 };
  }
}
function saveDb() {
  fs.writeJsonSync(DB_PATH, db, { spaces: 2 });
}
loadDb();

// ===== BOT =====
const bot = new Telegraf(BOT_TOKEN);

// ===== HELPERS =====
const formatAddress = (addr) => addr ? `\`${addr.slice(0, 8)}…${addr.slice(-6)}\`` : '`—`';
const explorer = (addr) => `https://bscscan.com/address/${addr}`;

async function notify(id, text) {
  if (!id) return;
  try {
    await bot.telegram.sendMessage(id, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch {}
}

// ===== EVENT HANDLING (kept for notifications and logging web-created escrows) =====
async function handleLog(escAddr, log) {
  let parsed;
  try { parsed = escrowIface.parseLog(log); } catch { return; }
  if (!parsed?.name) return;

  const name = parsed.name;
  const escKey = escAddr.toLowerCase();

  if (!db.escrows[escKey]) {
    db.escrows[escKey] = {
      state: 0,
      client: null, freelancer: null, oracle: null,
      tgClientId: null, tgFreelancerId: null, tgOracleId: DEFAULT_ORACLE_TG_ID || null
    };
  }

  const rec = db.escrows[escKey];

  // Fetch roles if missing
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
    } catch {}
  }

  const tokenSym = await (async () => {
    try {
      const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);
      const token = await c.settlementToken();
      return token.toLowerCase() === USDT_ADDRESS.toLowerCase() ? 'USDT' : 'USDC';
    } catch { return 'TOKEN'; }
  })();

  const where = `\`${escAddr}\` — [view](${explorer(escAddr)})`;

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
        await notify(rec.tgClientId, `Job Started! 🔥⚒️\nDeadline: *${when}*\nEscrow: ${where}`);
        await notify(rec.tgFreelancerId, `You started the job 🔥⚒️\nDeadline: *${when}*\nEscrow: ${where}`);
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
        await notify(rec.tgFreelancerId, `APPROVED! ✅\nYou received ${dep} ${tokenSym} + ${bon} FORJE bonus 💰\nEscrow: ${where}\nThank you!`);
        await notify(rec.tgClientId, `Job approved ✅\nPayment released: ${dep} ${tokenSym} + ${bon} FORJE bonus 💰\nEscrow: ${where}`);
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

function markEscrowCompleted(escAddr) {
  const key = escAddr.toLowerCase();
  if (db.escrows[key]) {
    delete db.escrows[key];
    db.stats.totalCompleted += 1;
    saveDb();
  }
}

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


// ===== COMMANDS (lean) =====
bot.start(async (ctx) => {
  await ctx.reply(
`*Welcome to ForjeGigs Bot* 🔥⚒️

The main app is now at https://forje.vercel.app

To receive Telegram alerts for escrow events (deposits, disputes, approvals), link your Telegram ID using the format below:

\/link <escrowAddress> <yourRole> <yourWalletAddress>

Commands:
\/stats — Your escrow history
\/who <escrow> — Who is linked to an escrow
\/link — Bind your Telegram for alerts`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
});

bot.command('link', async (ctx) => {
  const [_, esc, role, addr] = ctx.message.text.trim().split(/\s+/);
  if (!esc || !role || !addr) return ctx.reply('Usage: /link <escrow> <client|freelancer|oracle> <address>');
  if (!ethers.isAddress(esc) || !ethers.isAddress(addr)) return ctx.reply('Invalid address');
  const r = role.toLowerCase();
  if (!['client', 'freelancer', 'oracle'].includes(r)) return ctx.reply('Role: client|freelancer|oracle');
  if (r === 'oracle' && !ADMIN_TG_IDS.includes(String(ctx.from.id))) return ctx.reply('Only admin can link oracle');
  const key = esc.toLowerCase();
  db.escrows[key] = db.escrows[key] || {};
  db.escrows[key][r] = addr;
  db.escrows[key]['tg' + r.charAt(0).toUpperCase() + r.slice(1) + 'Id'] = ctx.from.id;
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

    let text = isPrivileged ? `*GLOBAL FORJE STATS* \\(BSC Testnet\\)\n\n` : `*YOUR FORJE STATS*\n\n`;
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
      text += `The Forge never sleeps 🔥⚒️\\.`;
    }

    await ctx.reply(text, { parse_mode: 'MarkdownV2', disable_web_page_preview: true });
  } catch (err) {
    ctx.reply('Stats temporarily unavailable.');
  }
});

// ===== API FOR WEB "My Escrows" =====
app.get('/api/my-escrows', (req, res) => {
  const { address } = req.query;
  if (!address || !ethers.isAddress(address)) return res.status(400).json({ error: 'Valid address required' });

  const lowerAddr = address.toLowerCase();
  const escrows = [];

  for (const [escAddr, data] of Object.entries(db.escrows)) {
    if (
      data.client?.toLowerCase() === lowerAddr ||
      data.freelancer?.toLowerCase() === lowerAddr ||
      data.oracle?.toLowerCase() === lowerAddr
    ) {
      escrows.push({
        escrow: escAddr,
        state: data.state || 0,
        stateLabel: STATE_LABEL[data.state || 0] || 'Unknown',
        isActive: [0,1,2,4,5].includes(data.state || 0),
        client: data.client,
        freelancer: data.freelancer,
        settlementToken: data.settlementToken || 'UNKNOWN'
      });
    }
  }

  // Sort active first
  escrows.sort((a, b) => (b.isActive - a.isActive));

  res.json({ escrows });
});

// ===== LAUNCH =====
console.log('FORJE BOT v10 — LEAN NOTIFICATION BOT');
console.log(`Completed jobs: ${db.stats.totalCompleted}`);

bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('Bot launched'))
  .catch(err => console.error('Bot failed to start:', err));

// Poll every 30 seconds
setInterval(pollOnce, 30000);
pollOnce();

// Express API on Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});