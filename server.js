// server.js — Afrilance BOT v10 — SUPABASE MIGRATION (PERSISTENT)
import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(cors());

// ===== SUPABASE SETUP =====
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: SUPABASE_URL or SUPABASE_ANON_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache (address lowercase → record)
let escrowsCache = new Map();
let totalCompleted = 0;
let lastBlock = 0;

// Load all escrows from Supabase on startup
async function loadEscrows() {
  const { data, error } = await supabase
    .from('escrows')
    .select('*');

  if (error) {
    console.error('Supabase load error:', error);
    return;
  }

  escrowsCache.clear();
  data.forEach(row => {
    escrowsCache.set(row.address.toLowerCase(), row);
  });
  totalCompleted = data.filter(row => row.completed).length;
  console.log(`Loaded ${data.length} escrows from Supabase`);
}

loadEscrows();

// Helper to upsert escrow record
async function upsertEscrow(record) {
  const { error } = await supabase
    .from('escrows')
    .upsert(record, { onConflict: 'address' });

  if (error) {
    console.error('Supabase upsert error:', error);
  } else {
    escrowsCache.set(record.address.toLowerCase(), record);
  }
}

// Mark completed (delete from cache and table)
async function markEscrowCompleted(escAddr) {
  const key = escAddr.toLowerCase();
  if (escrowsCache.has(key)) {
    escrowsCache.delete(key);
    totalCompleted += 1;
    await supabase.from('escrows').delete().eq('address', key);
  }
}

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
      console.log(`RPC CONNECTED: ${url}`);
      return prov;
    } catch (e) {
      console.warn(`RPC failed: ${url}`);
    }
  }
  return new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org');
}

provider = await createProvider();

// ===== CONTRACTS =====
const FACTORY_ADDRESS = '0x752c69ee75E7BF58ac478e2aC1F7E7fd341BB865';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const USDC_ADDRESS = '0x8AC76a51cc950d9822D68b83fE1Ad97b32Cd580d';

const factoryAbiRaw = await import('./abis/ForjeEscrowFactory.json', { assert: { type: 'json' } });
const escrowAbiRaw = await import('./abis/ForjeEscrow.json', { assert: { type: 'json' } });

const FACTORY_ABI = factoryAbiRaw.default;
const ESCROW_ABI = escrowAbiRaw.default;

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
const escrowIface = new ethers.Interface(ESCROW_ABI);

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

async function notifyAdmins(text) {
  const ids = new Set([...ORACLE_ALERT_TG_IDS, DEFAULT_ORACLE_TG_ID].filter(Boolean));
  for (const id of ids) await notify(id, text);
}

// ===== EVENT HANDLING =====
async function handleLog(escAddr, log) {
  let parsed;
  try { parsed = escrowIface.parseLog(log); } catch { return; }
  if (!parsed?.name) return;

  const name = parsed.name;
  const escKey = escAddr.toLowerCase();

  let rec = escrowsCache.get(escKey);
  if (!rec) {
    rec = {
      address: escAddr,
      state: 0,
      client: null,
      freelancer: null,
      oracle: null,
      tg_client_id: null,
      tg_freelancer_id: null,
      tg_oracle_id: DEFAULT_ORACLE_TG_ID || null,
      deadline: 0,
      completed: false
    };
    escrowsCache.set(escKey, rec);
  }

  // Fetch roles if missing
  if (!rec.client || !rec.freelancer || !rec.oracle) {
    try {
      const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);
      const [client, freelancer, oracle] = await Promise.all([
        c.client().catch(() => null),
        c.freelancer().catch(() => null),
        c.oracle().catch(() => null)
      ]);
      rec.client = client || rec.client;
      rec.freelancer = freelancer || rec.freelancer;
      rec.oracle = oracle || rec.oracle;
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
      const amt = ethers.formatUnits(amount, 18);
      rec.state = 1;
      await notify(rec.tg_freelancer_id, `Deposit Received 💰 — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tg_client_id, `You deposited 💰 ${amt} ${tokenSym}\nEscrow: ${where}`);
      break;
    }
    case 'FeePaid': {
      rec.state = 2;
      await notify(rec.tg_freelancer_id, `Fee Paid 🤑 — You can now start the job!\nEscrow: ${where}`);
      await notify(rec.tg_client_id, `You paid the fee 🤑 — Freelancer can start.\nEscrow: ${where}`);
      break;
    }
    case 'Started': {
      const [deadline] = parsed.args;
      const when = new Date(Number(deadline) * 1000).toLocaleString();
      rec.state = 3;
      rec.deadline = Number(deadline);
      await notify(rec.tg_client_id, `Job Started! 🔥⚒️\nDeadline: *${when}*\nEscrow: ${where}`);
      await notify(rec.tg_freelancer_id, `You started the job 🔥⚒️\nDeadline: *${when}*\nEscrow: ${where}`);
      break;
    }
    case 'Submitted': {
      const [proofHash] = parsed.args;
      rec.state = 4;
      await notify(rec.tg_client_id, `Work Submitted! 📄\n\nProof: \`${proofHash}\`\nEscrow: ${where}\n\nPlease review & approve/request revision\n\n💡 *To view the submitted file,* unhash it on [Pinata](https://app.pinata.cloud/auth/signin) by searching for the CID without the "ipfs://" e.g: bafkreieqryqewmspvcdl2f5oq6tydrtybrfjh4zj27ko53fznxp6zazibu, using the search bar`);
      await notify(rec.tg_freelancer_id, `You submitted proof 📄\nWaiting for client approval/revision request\nEscrow: ${where}`);
      break;
    }
    case 'Revised': {
      const [messageHash] = parsed.args;
      rec.state = 4;
      await notify(rec.tg_freelancer_id, `Revision Requested 📝\n💬 Revision message: \`${messageHash}\`\nPlease resubmit your work\nEscrow: ${where}`);
      await notify(rec.tg_client_id, `Revision request sent to freelancer 📝\nEscrow: ${where}`);
      break;
    }
    case 'Approved': {
      const [, deposit, bonus] = parsed.args;
      const dep = ethers.formatUnits(deposit, 18);
      const bon = ethers.formatUnits(bonus, 18);
      await notify(rec.tg_freelancer_id, `APPROVED! ✅\nYou received ${dep} ${tokenSym}\nEscrow: ${where}\nThank you!`);
      await notify(rec.tg_client_id, `Job approved ✅\nPayment released: ${dep} ${tokenSym}\nEscrow: ${where}`);
      markEscrowCompleted(escAddr);
      break;
    }
    case 'Disputed': {
      const [by] = parsed.args;
      await notify(rec.tg_client_id, `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review`);
      await notify(rec.tg_freelancer_id, `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review`);
      await notify(rec.tg_oracle_id || DEFAULT_ORACLE_TG_ID, `NEW DISPUTE ⚠️ — REVIEW REQUIRED\nEscrow: ${where}`);
      await notifyAdmins(`DISPUTE ⚠️: ${escAddr}\nBy: \`${by}\``);
      break;
    }
    case 'Resolved': {
      const [winner, amount] = parsed.args;
      const amt = ethers.formatUnits(amount, 18);
      await notify(rec.tg_client_id, `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tg_freelancer_id, `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tg_oracle_id || DEFAULT_ORACLE_TG_ID, `Dispute Resolved ✅\nWinner: \`${winner}\`\nEscrow: ${where}`);
      markEscrowCompleted(escAddr);
      break;
    }
  }

  await upsertEscrow(rec);
}

async function pollOnce() {
  try {
    const latestBlock = await provider.getBlockNumber().catch(() => null);
    if (!latestBlock) {
      console.warn('Failed to get latest block — skipping poll');
      return;
    }

    let fromBlock = lastBlock + 1;
    if (latestBlock - fromBlock > 200) {
      console.log(`Jumping forward from block ${fromBlock} → ${latestBlock - 200}`);
      fromBlock = latestBlock - 200;
    }
    if (fromBlock >= latestBlock) {
      lastBlock = latestBlock;
      return;
    }

    const toBlock = latestBlock - 1;

    // Factory JobCreated
    try {
      const jobCreatedTopic = ethers.id('JobCreated(address,address,address)');
      const factoryLogs = await provider.getLogs({
        address: FACTORY_ADDRESS,
        topics: [jobCreatedTopic],
        fromBlock,
        toBlock
      });

      for (const log of factoryLogs) {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === 'JobCreated') {
          const [escrowAddr, client, freelancer] = parsed.args;
          const key = escrowAddr.toLowerCase();

          if (!escrowsCache.has(key)) {
            const record = {
              address: escrowAddr,
              client,
              freelancer,
              oracle: null,
              tg_client_id: null,
              tg_freelancer_id: null,
              tg_oracle_id: DEFAULT_ORACLE_TG_ID || null,
              state: 0,
              deadline: 0,
              completed: false
            };
            await upsertEscrow(record);
            console.log(`New escrow auto-logged: ${escrowAddr}`);
          }
        }
      }
    } catch (e) {
      console.warn('Factory JobCreated log fetch failed:', e.message);
    }

    // Existing escrows polling
    const escrows = Array.from(escrowsCache.keys());

    if (escrows.length === 0) {
      lastBlock = latestBlock;
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
          console.log(`Timeout on ${esc} — skipping this cycle`);
        } else {
          console.warn(`Log fetch error for ${esc}:`, e.message || e);
        }
      }
    }

    lastBlock = latestBlock;
  } catch (err) {
    console.error('pollOnce critical error:', err.message || err);
  }
}

// Provider restart
provider.on('error', async (err) => {
  console.error('Provider error — restarting provider...', err.message);
  provider = await createProvider();
});

// ===== COMMANDS =====
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
  const [_, esc, role, addr] = ctx.message.text.trim().split(/\s+/);
  if (!esc || !role || !addr) return ctx.reply('Usage: /link <escrow> <client|freelancer|oracle> <address>');
  if (!ethers.isAddress(esc) || !ethers.isAddress(addr)) return ctx.reply('Invalid address');
  const r = role.toLowerCase();
  if (!['client', 'freelancer', 'oracle'].includes(r)) return ctx.reply('Role: client|freelancer|oracle');
  if (r === 'oracle' && !ADMIN_TG_IDS.includes(String(ctx.from.id))) return ctx.reply('Only admin can link oracle');
  const key = esc.toLowerCase();
  let rec = escrowsCache.get(key);
  if (!rec) {
    rec = {
      address: esc,
      state: 0,
      client: null,
      freelancer: null,
      oracle: null,
      tg_client_id: null,
      tg_freelancer_id: null,
      tg_oracle_id: null,
      deadline: 0,
      completed: false
    };
    escrowsCache.set(key, rec);
  }
  rec[r] = addr;
  rec[`tg_${r}_id`] = ctx.from.id;
  await upsertEscrow(rec);
  ctx.reply(`✅ Linked\n*Escrow:* ${formatAddress(esc)}\n*Role:* ${r}\n*Wallet:* ${formatAddress(addr)}\nNow you will get escrow event alerts.`, { parse_mode: 'Markdown' });
});

bot.command('who', async (ctx) => {
  const esc = ctx.message.text.split(' ')[1];
  if (!ethers.isAddress(esc)) return ctx.reply('Usage: /who <escrow>');
  const rec = escrowsCache.get(esc.toLowerCase()) || {};
  const oracleTg = rec.tg_oracle_id || DEFAULT_ORACLE_TG_ID || '—';
  await ctx.reply(
`*Escrow:* ${formatAddress(esc)}
Client: ${formatAddress(rec.client)} \\(tg: \`${rec.tg_client_id || '—'}\`\\)
Freelancer: ${formatAddress(rec.freelancer)} \\(tg: \`${rec.tg_freelancer_id || '—'}\`\\)
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
      ? Array.from(escrowsCache.values())
      : Array.from(escrowsCache.values()).filter(d => d.tg_client_id === userId || d.tg_freelancer_id === userId);

    for (const e of escrowsToCheck) {
      const isExpired = e.state < 2 && e.deadline > 0 && now > e.deadline + 86400 * 3;
      if (e.completed) completed.push(e);
      else if (isExpired) expired.push(e);
      else active.push(e);
    }

    const totalEver = escrowsToCheck.length + totalCompleted;
    const format = (e) => `\`${e.address}\` — [view](${explorer(e.address)})`;

    let text = isPrivileged ? `*GLOBAL ESCROW STATS* \\(BSC MAINNET\\)\n\n` : `*YOUR ESCROW STATS*\n\n`;
    text += `*Total Jobs Ever:* \`${totalEver}\`\n`;
    text += `*Active:* \`${active.length}\` \\| *Completed:* \`${completed.length + totalCompleted}\` \\| *Expired:* \`${expired.length}\`\n\n`;

    if (active.length) text += `*Active Escrows*\n${active.map(format).join('\n')}\n\n`;
    if (completed.length || totalCompleted) {
      text += `*Completed Escrows*`;
      if (completed.length) text += `\n${completed.slice(-10).map(format).join('\n')}`;
      if (totalCompleted > completed.length) text += `\n\\+ ${totalCompleted - completed.length} older completed jobs`;
      text += `\n\n`;
    }
    if (expired.length) text += `*Expired \\(Unfunded\\)*\n${expired.map(format).join('\n')}\n\n`;

    if (active.length + completed.length + expired.length === 0) {
      text += isPrivileged ? "No escrows yet\\." : "😏 You have no escrows yet\\.";
    } else {
      text += `Hardwork pays 🤝\\.`;
    }

    await ctx.reply(text, { parse_mode: 'MarkdownV2', disable_web_page_preview: true });
  } catch (err) {
    ctx.reply('Stats temporarily unavailable.');
  }
});

// ===== API FOR WEB "My Escrows" =====
app.get('/api/my-escrows', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address || !ethers.isAddress(address)) return res.status(400).json({ error: 'Valid address required' });

    const lowerAddr = address.toLowerCase();

    const { data, error } = await supabase
      .from('escrows')
      .select('*')
      .or(`client.eq.${lowerAddr},freelancer.eq.${lowerAddr},oracle.eq.${lowerAddr}`);

    if (error) throw error;

    const escrows = data.map(row => ({
      escrow: row.address,
      state: row.state || 0,
      stateLabel: ['Funding', 'Started', 'Submitted', 'Approved', 'Revised', 'Disputed', 'Resolved'][row.state || 0] || 'Unknown',
      isActive: [0,1,2,4,5].includes(row.state || 0),
      client: row.client,
      freelancer: row.freelancer,
    }));

    escrows.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

    res.json({ escrows });
  } catch (err) {
    console.error('MyEscrows API error:', err);
    res.status(500).json({ error: 'Failed to load' });
  }
});

// ===== LAUNCH =====
console.log('AFRILANCE BOT v10 — SUPABASE PERSISTENT');
console.log(`Completed jobs: ${totalCompleted}`);

bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('Bot launched'))
  .catch(err => console.error('Bot failed to start:', err));

setInterval(pollOnce, 30000);
pollOnce();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});