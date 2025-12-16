// server.js — FORJE BOT v9.2 — WEBHOOK MODE (ESM-SAFE DOTENV)
import { Telegraf, Markup } from 'telegraf';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

// Dynamic dotenv load for ESM (fixes Vercel resolution)
import dotenv from 'dotenv';
dotenv.config();

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();
const MINIAPP_URL = process.env.MINIAPP_URL?.trim() || '';

const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const DEFAULT_ORACLE_TG_ID = (process.env.DEFAULT_ORACLE_TG_ID || '').trim();
const ORACLE_ALERT_TG_IDS = (process.env.ORACLE_ALERT_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

if (!BOT_TOKEN || !PRIVATE_KEY) {
  console.error('FATAL: BOT_TOKEN or PRIVATE_KEY missing');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ===== RPC =====
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

const FACTORY_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrowFactory.json'), 'utf8'));
const ESCROW_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'abis/ForjeEscrow.json'), 'utf8'));

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
const escrowIface = new ethers.Interface(ESCROW_ABI);
const TOKEN_DECIMALS = 18;

const bot = new Telegraf(BOT_TOKEN);

// ===== HELPERS =====
const formatAddress = (addr) => addr ? `\`${addr.slice(0, 8)}…${addr.slice(-6)}\`` : '`—`';
const explorer = (addr) => `https://bscscan.com/address/${addr}#code`;
const writeLink = (addr) => `${explorer(addr)}#writeContract`;
const code = (text) => `\`\`\`\n${text}\n\`\`\``;

const webAppKeyboard = MINIAPP_URL
  ? Markup.inlineKeyboard([[Markup.button.webApp('Enter the Forge 🔥⚒️', MINIAPP_URL)]])
  : undefined;

// ===== DATABASE =====
const DB_PATH = path.join(__dirname, 'db.json');
let db = { lastBlock: 0, escrows: {}, stats: { totalCompleted: 0 } };

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readJsonSync(DB_PATH);
      db.lastBlock = Number(raw.lastBlock || 0);
      db.escrows = raw.escrows || {};
      db.stats = raw.stats || { totalCompleted: 0 };
      console.log(`Loaded ${Object.keys(db.escrows).length} active | ${db.stats.totalCompleted} completed`);
    }
  } catch { console.log('db.json missing — starting fresh'); }
}
function saveDb() {
  try { fs.writeJsonSync(DB_PATH, db, { spaces: 2 }); }
  catch (err) { console.error('Failed to save db:', err.message); }
}
loadDb();

const userData = new Map();

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

// ===== MARK COMPLETED =====
function markEscrowCompleted(escAddr) {
  const key = escAddr.toLowerCase();
  if (db.escrows[key]) {
    delete db.escrows[key];
    db.stats.totalCompleted += 1;
    console.log(`COMPLETED #${db.stats.totalCompleted}: ${escAddr}`);
    saveDb();
  }
}

// ===== FINAL EVENT HANDLER — BULLETPROOF =====
async function handleLog(escAddr, log) {
  let parsed;
  try { parsed = escrowIface.parseLog(log); } catch { return; }
  if (!parsed?.name) return;

  const name = parsed.name;
  const escKey = escAddr.toLowerCase();

  if (!db.escrows[escKey]) {
    db.escrows[escKey] = {
      state: 0, deadline: 0, completed: false,
      client: null, freelancer: null, oracle: null,
      tgClientId: null, tgFreelancerId: null, tgOracleId: DEFAULT_ORACLE_TG_ID || null
    };
  }

  const rec = db.escrows[escKey];

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

bot.start(async (ctx) => {
  await ctx.reply(
`*Welcome to Forje (BSC)*

*Client Actions:*
- To create gig payment escrow, "Enter the Forge"
- Share escrow address with freelancer

*Freelancer Actions:*
- For escrow alerts, run: /link <escrow> <role> <address>
- Example: /link 0xEscrowAddress freelancer 0xYourWalletAddress
- Proceed to "Enter the Forge" to manage jobs

*Global Commands:* /who <escrow> | /stats`,
    { parse_mode: 'Markdown', reply_markup: webAppKeyboard?.reply_markup }
  );
});

bot.command('open', async (ctx) => {
  if (!MINIAPP_URL) return ctx.reply('Mini-app not configured');
  await ctx.reply('The Forge', { reply_markup: webAppKeyboard.reply_markup });
});

bot.command('setWallet', (ctx) => {
  const addr = ctx.message.text.split(' ')[1]?.trim();
  if (!ethers.isAddress(addr)) return ctx.reply('Invalid address');
  userData.set(ctx.from.id, { ...(userData.get(ctx.from.id) || {}), wallet: addr });
  ctx.reply(`*✅ Wallet set:* ${formatAddress(addr)}`, { parse_mode: 'Markdown' });
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

bot.command('createJob', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 3) return ctx.reply('Usage: /createJob <freelancer> <USDT|USDC>');
  const [, freelancer, token] = parts;
  if (!ethers.isAddress(freelancer)) return ctx.reply('Invalid freelancer address');
  const user = userData.get(ctx.from.id);
  if (!user?.wallet) return ctx.reply('Set wallet with /setWallet first');
  const settlementToken = token === 'USDT' ? USDT_ADDRESS : USDC_ADDRESS;
  let msg;
  try {
    msg = await ctx.reply(`*⚙️ Creating job…*\nClient: ${formatAddress(user.wallet)}\nFreelancer: ${formatAddress(freelancer)}\nToken: ${token}`, { parse_mode: 'Markdown' });

    const tx = await factory.createJob(user.wallet, freelancer, settlementToken, wallet.address);
    const receipt = await tx.wait();

    if (!receipt || !receipt.logs) throw new Error('Transaction failed');

    let escrowAddress = null;

    try {
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === 'JobCreated') {
            escrowAddress = parsed.args[0];
            break;
          }
        } catch {}
      }
    } catch {}

    if (!escrowAddress) {
      const nonFactoryLog = receipt.logs.find(l => l.address && l.address.toLowerCase() !== FACTORY_ADDRESS.toLowerCase());
      if (nonFactoryLog) escrowAddress = nonFactoryLog.address;
    }

    if (!escrowAddress || !ethers.isAddress(escrowAddress)) {
      throw new Error('Could not extract escrow address');
    }

    const key = escrowAddress.toLowerCase();
    db.escrows[key] = {
      client: user.wallet,
      freelancer,
      oracle: wallet.address,
      tgClientId: ctx.from.id,
      tgFreelancerId: null,
      tgOracleId: DEFAULT_ORACLE_TG_ID || null,
      state: 0,
      deadline: 0,
      completed: false
    };
    saveDb();

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null,
`*✅ Job Created Successfully\\!*\n\n\
*Client:* ${formatAddress(user.wallet)}
*Freelancer:* ${formatAddress(freelancer)}
*Escrow:* ${formatAddress(escrowAddress)}

👉 Next → Paste this address in The Forge:
\`${escrowAddress}\``, 
      { 
        parse_mode: 'MarkdownV2', 
        reply_markup: Markup.inlineKeyboard([
          ...(webAppKeyboard ? [[Markup.button.webApp('Enter the Forge 🔥⚒️', MINIAPP_URL)]] : []),
          [Markup.button.url('View Escrow', explorer(escrowAddress))]
        ]).reply_markup 
      }
    );

  } catch (e) {
    console.error('createJob failed:', e);
    const err = e?.shortMessage || e.message || 'Unknown error';
    if (msg) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `*🔔 Job creation failed*\n\nError: \`${err}\``, { parse_mode: 'MarkdownV2' });
    } else {
      ctx.reply(`Error: ${err}`);
    }
  }
});

bot.command('approveUSDT', (ctx) => {
  const [, escrow, amountStr] = ctx.message.text.trim().split(/\s+/);
  if (!escrow || !amountStr) return ctx.reply('Usage: /approveUSDT <escrow> <amount>');
  const amount = ethers.parseUnits(amountStr, TOKEN_DECIMALS);
  ctx.reply(
`*Approve USDT*
1\\) [Open USDT Write](https://bscscan.com/address/${USDT_ADDRESS}#writeContract)
2\\) Connect wallet
3\\) Find *approve*
4\\) spender: \`${escrow}\`
5\\) amount:
${code(amount.toString())}
6\\) Click *Write*
After: /deposit \`${escrow}\` ${amountStr}`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('deposit', (ctx) => {
  const [, escrow, amountStr] = ctx.message.text.trim().split(/\s+/);
  if (!escrow || !amountStr) return ctx.reply('Usage: /deposit <escrow> <amount>');
  const amount = ethers.parseUnits(amountStr, TOKEN_DECIMALS);
  ctx.reply(
`*Deposit Funds*
1\\) First: /approveUSDT \`${escrow}\` ${amountStr}
2\\) [Open Escrow Write](${writeLink(escrow)})
3\\) Find *deposit*
4\\) Paste:
${code(amount.toString())}
5\\) Click *Write*
After: /payFee \`${escrow}\``,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('payFee', (ctx) => {
  const [, escrow] = ctx.message.text.trim().split(/\s+/);
  if (!escrow) return ctx.reply('Usage: /payFee <escrow>');
  ctx.reply(
`*Pay Fee \\(0\\.002 BNB\\)*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *payFee*
4\\) *Value*: 0\\.002 BNB
5\\) Click *Write*
After: Freelancer can /startJob`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('startJob', (ctx) => {
  const [, escrow, days] = ctx.message.text.trim().split(/\s+/);
  if (!escrow || !days) return ctx.reply('Usage: /startJob <escrow> <days>');
  ctx.reply(
`*Start Job*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *startJob*
4\\) Paste:
${code(days)}
5\\) Click *Write*
After: Work → /submitProof`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('submitProof', (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const escrow = parts[1];
  const ipfs = parts.slice(2).join(' ');
  if (!escrow || !ipfs) return ctx.reply('Usage: /submitProof <escrow> ipfs://...');
  if (!/^ipfs:\/\//i.test(ipfs)) return ctx.reply('Proof must start with ipfs://');
  ctx.reply(
`*Submit Proof*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *submitProof*
4\\) Paste:
${code(ipfs)}
5\\) Click *Write*
After: Client will review`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('requestRevision', (ctx) => {
  const [, escrow] = ctx.message.text.trim().split(/\s+/);
  if (!escrow) return ctx.reply('Usage: /requestRevision <escrow>');
  ctx.reply(
`*Request Revision*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *requestRevision*
4\\) messageHash:
${code('ipfs://your-feedback-or-notes')}
5\\) Click *Write*`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('approve', (ctx) => {
  const [, escrow] = ctx.message.text.trim().split(/\s+/);
  if (!escrow) return ctx.reply('Usage: /approve <escrow>');
  ctx.reply(
`*Approve & Release Payment*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *approve*
4\\) Click *Write*
Freelancer gets paid + FORJE bonus`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('raiseDispute', (ctx) => {
  const [, escrow] = ctx.message.text.trim().split(/\s+/);
  if (!escrow) return ctx.reply('Usage: /raiseDispute <escrow>');
  ctx.reply(
`*Raise Dispute*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *raiseDispute*
4\\) Click *Write*
Oracle will be notified`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

bot.command('refundNoStart', (ctx) => {
  const [, escrow] = ctx.message.text.trim().split(/\s+/);
  if (!escrow) return ctx.reply('Usage: /refundNoStart <escrow>');
  ctx.reply(
`*Refund (No Start)*
1\\) [Open Escrow Write](${writeLink(escrow)})
2\\) Connect wallet
3\\) Find *refundNoStart*
4\\) Click *Write*`,
    { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
  );
});

setInterval(pollOnce, 30000);
pollOnce();

// ===== WEBHOOK SERVER FOR VERCEL =====
const app = express();
app.use(express.json());

// Webhook endpoint
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Health check (optional)
app.get('/', (req, res) => res.send('Forje Bot is running!'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Forje Bot webhook server running on port ${PORT}`);
  console.log('FORJE BOT v9.2 — WEBHOOK MODE — LIVE ON MAINNET');
});