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

const factory = new ethers.Contract(FACTORY_ADDRESS, JSON.parse(require('fs').readFileSync(path.join(__dirname, 'abis/ForjeEscrowFactory.json'))), provider);
const escrowIface = new ethers.Interface(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'abis/ForjeEscrow.json'))));

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
      const amt = ethers.formatUnits(amount, 18);
      rec.state = 1;
      await notify(rec.tg_freelancer_id, `Deposit Received 💰 — ${amt} ${tokenSym}\nEscrow: ${where}`);
      await notify(rec.tg_client_id, `You deposited 💰 ${amt} ${tokenSym}\nEscrow: ${where}`);
      break;
    }
    case 'FeePaid': {
      rec.state = 2;
      await notify(rec.tg_freelancer_id, `Fee Paid — You can now start the job!\nEscrow: ${where}`);
      break;
    }
    // Keep all other cases exactly as in your original code (Started, Submitted, Revised, Approved, Disputed, Resolved)
    // ... (copy your switch cases here — they remain unchanged, just use rec.tg_client_id etc.)
    case 'Approved':
    case 'Resolved':
      rec.completed = true;
      totalCompleted += 1;
      break;
  }

  await upsertEscrow(rec);
}

async function pollOnce() {
  // ... your existing pollOnce code (factory JobCreated + escrow logs)
  // Just replace db.escrows with escrowsCache
  // And save with upsertEscrow
}

// ===== COMMANDS =====
// /start, /link, /who, /stats — same logic, just use escrowsCache.get(key)

// ===== API =====
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

    escrows.sort((a, b) => b.isActive - a.isActive);

    res.json({ escrows });
  } catch (err) {
    console.error('MyEscrows API error:', err);
    res.status(500).json({ error: 'Failed to load' });
  }
});

// ===== LAUNCH =====
bot.launch();
setInterval(pollOnce, 30000);
pollOnce();

app.listen(PORT, () => console.log(`Server on ${PORT}`));