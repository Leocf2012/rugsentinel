export default {
  async fetch(request, env) {
    const HELIUS_KEY = env.HELIUS_KEY || env.HELIUS_API_KEY;
    if (!HELIUS_KEY) return new Response("Falta HELIUS_KEY", { status: 500 });
    const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
    const url = new URL(request.url);

    async function rpc(method, params) {
      const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = await r.json();
      return j.result;
    }

    const cors = { "Access-Control-Allow-Origin": "*" };

    if (url.pathname === "/api/real") {
      const address = url.searchParams.get("address");
      if (!address) return Response.json({ error: "sem address" }, { status: 400 });
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexJson = await dexRes.json();
        const pair = dexJson.pairs?.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        if (!pair) return Response.json({ error: "Token não achado" }, { status: 404 });

        const rugRes = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`);
        const rug = rugRes.ok ? await rugRes.json() : null;

        const supplyData = await rpc("getTokenSupply", [address]);
        const totalSupply = supplyData?.value?.uiAmount || 0;
        const largestData = await rpc("getTokenLargestAccounts", [address]);
        const largest = largestData?.value || [];
        const sigsData = await rpc("getSignaturesForAddress", [address, { limit: 100 }]);
        const sigs = sigsData || [];

        const burns = ["11111111111111111111111111111111", "1nc1nerator11111111111111111111111111111111"];
        let burnt = 0;
        largest.forEach(a => { if (burns.includes(a.address)) burnt += a.uiAmount || 0; });
        const burntPct = totalSupply ? (burnt / totalSupply * 100) : 0;

        const devAddr = rug?.creator || null;
        const top20 = largest.slice(0, 20).map((acc, i) => {
          const pct = totalSupply ? (acc.uiAmount / totalSupply * 100) : 0;
          return {
            rank: i + 1,
            address: acc.address,
            amount: acc.uiAmount,
            pct,
            isBurn: burns.includes(acc.address),
            isDev: devAddr === acc.address
          };
        });
        const top10Pct = top20.slice(0, 10).reduce((s, a) => s + a.pct, 0);
        const top20Pct = top20.reduce((s, a) => s + a.pct, 0);

        let bundlePct = 0;
        if (sigs.length >= 5) {
          const slots = sigs.slice(0, 20).map(s => s.slot).filter(Boolean);
          const unique = new Set(slots);
          bundlePct = ((slots.length - unique.size) / slots.length * 100);
        }

        let snipers = 0;
        if (sigs.length > 0) {
          const firstSlot = sigs[sigs.length - 1].slot;
          snipers = sigs.filter(s => s.slot === firstSlot).length;
        }

        const fakeHolders = top20.filter(h => h.pct < 0.01 && h.pct > 0).length;
        const fakeHoldersPct = largest.length ? (fakeHolders / largest.length * 100) : 0;

        const buys = pair.txns?.h24?.buys || 0;
        const sells = pair.txns?.h24?.sells || 0;
        const totalTx = buys + sells;
        const buyRatio = totalTx ? buys / totalTx : 0.5;
        const fakeVolPct = Math.abs(0.5 - buyRatio) * 200;

        let devSol = 0, devSoldPct = 0;
        if (devAddr) {
          try {
            const bal = await rpc("getBalance", [devAddr]);
            devSol = (bal?.value || 0) / 1e9;
            const devTokens = await rpc("getTokenAccountsByOwner", [devAddr, { mint: address }, { encoding: "jsonParsed" }]);
            const holding = devTokens?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
            const devTop = top20.find(t => t.isDev);
            if (devTop && devTop.amount > 0) devSoldPct = Math.max(0, (1 - holding / devTop.amount) * 100);
          } catch (e) {}
        }

        const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
        const ageH = Math.floor(ageMs / 3600000);
        const ageText = ageH < 24 ? ageH + 'h' : Math.floor(ageH / 24) + 'd';

        const mintAuth = rug?.mintAuthority || rug?.token?.mintAuthority || null;
        const freezeAuth = rug?.freezeAuthority || rug?.token?.freezeAuthority || null;
        const lpLocked = rug?.markets?.[0]?.lp?.lpLockedPct || 0;

        let score = 100;
        const audit = [];

        if (mintAuth) { score -= 25; audit.push({ check: "Mint Authority", pass: false, desc: "Ativo — criador pode emitir mais tokens" }); }
        else audit.push({ check: "Mint Authority", pass: true, desc: "Desativado — ninguém pode criar mais" });

        if (freezeAuth) { score -= 20; audit.push({ check: "Freeze Authority", pass: false, desc: "Ativo — pode congelar carteiras" }); }
        else audit.push({ check: "Freeze Authority", pass: true, desc: "Desativado — ninguém pode congelar" });

        if (bundlePct > 50) { score -= 15; audit.push({ check: "Bundle", pass: false, desc: bundlePct.toFixed(0) + "% comprado no mesmo bloco" }); }
        else audit.push({ check: "Bundle", pass: true, desc: bundlePct.toFixed(0) + "% no mesmo bloco (ok)" });

        if (burntPct < 1) { score -= 5; audit.push({ check: "Burn", pass: false, desc: burntPct.toFixed(2) + "% queimado (baixo)" }); }
        else audit.push({ check: "Burn", pass: true, desc: burntPct.toFixed(2) + "% queimado" });

        if (devSoldPct > 50) { score -= 20; audit.push({ check: "Dev Sold", pass: false, desc: devSoldPct.toFixed(0) + "% vendido" }); }
        else audit.push({ check: "Dev Sold", pass: true, desc: devSoldPct.toFixed(0) + "% vendido (ok)" });

        if (fakeVolPct > 30) { score -= 10; audit.push({ check: "Volume Falso", pass: false, desc: fakeVolPct.toFixed(1) + "% estimado anormal" }); }
        else audit.push({ check: "Volume Falso", pass: true, desc: fakeVolPct.toFixed(1) + "% estimado (ok)" });

        if (fakeHolders > 3) { score -= 10; audit.push({ check: "Fake Holders", pass: false, desc: fakeHolders + " carteiras suspeitas" }); }
        else audit.push({ check: "Fake Holders", pass: true, desc: fakeHolders + " suspeitas (ok)" });

        if (top10Pct > 60) { score -= 20; audit.push({ check: "Top 10", pass: false, desc: top10Pct.toFixed(1) + "% concentrado" }); }
        else if (top10Pct > 35) { score -= 10; audit.push({ check: "Top 10", pass: false, desc: top10Pct.toFixed(1) + "% moderado" }); }
        else audit.push({ check: "Top 10", pass: true, desc: top10Pct.toFixed(1) + "% saudável" });

        if (lpLocked < 50) { score -= 10; audit.push({ check: "LP Locked", pass: false, desc: lpLocked.toFixed(1) + "% travado" }); }
        else audit.push({ check: "LP Locked", pass: true, desc: lpLocked.toFixed(1) + "% travado" });

        if (snipers > 3) { score -= 10; audit.push({ check: "Snipers", pass: false, desc: snipers + " compras no bloco 1" }); }
        else audit.push({ check: "Snipers", pass: true, desc: snipers + " no bloco 1 (ok)" });

        score = Math.max(0, Math.min(100, Math.round(score)));

        return Response.json({
          pair, rug, score, audit,
          real: {
            address,
            name: pair.baseToken?.name,
            symbol: pair.baseToken?.symbol,
            ageText,
            mc: pair.fdv || pair.marketCap || 0,
            liqUsd: pair.liquidity?.usd || 0,
            vol24h: pair.volume?.h24 || 0,
            vol1h: pair.volume?.h1 || 0,
            dex: pair.dexId || 'unknown',
            priceUsd: pair.priceUsd,
            ch24: pair.priceChange?.h24 || 0,
            top10Pct, top20Pct, burntPct, bundlePct, fakeVolPct, fakeHolders, fakeHoldersPct,
            hodls: largest.length,
            snipers,
            top20,
            dev: { address: devAddr, sol: devSol, soldPct: devSoldPct }
          }
        }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    if (url.pathname === "/api/wallets") {
      const address = url.searchParams.get("address");
      const start = parseInt(url.searchParams.get("start") || "0");
      const end = parseInt(url.searchParams.get("end") || "10");
      if (!address) return Response.json({ error: "sem address" }, { status: 400 });
      try {
        const largestData = await rpc("getTokenLargestAccounts", [address]);
        const largest = (largestData?.value || []).slice(start, end);
        const wallets = [];
        for (const acc of largest) {
          let tipo = "RECEBEU";
          let detalhe = "Recebeu tokens sem enviar SOL";
          try {
            const sigsData = await rpc("getSignaturesForAddress", [acc.address, { limit: 5 }]);
            const sigs = sigsData || [];
            if (sigs.length > 0) {
              const txData = await rpc("getTransaction", [sigs[0].signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
              if (txData) {
                const pre = txData.meta?.preBalances || [];
                const post = txData.meta?.postBalances || [];
                const solDiff = (post[0] || 0) - (pre[0] || 0);
                if (solDiff < -1000000) {
                  tipo = "COMPROU";
                  detalhe = "Comprou com " + Math.abs(solDiff / 1e9).toFixed(2) + " SOL";
                }
              }
            }
          } catch (e) {}
          wallets.push({ address: acc.address, amount: acc.uiAmount, tipo, detalhe });
        }
        return Response.json({ wallets }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    return new Response(getHTML(), { headers: { "content-type": "text/html;charset=UTF-8" } });
  }
};

function getHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CryptoGuard Pro</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
body{background:#0a0e1a;color:#e8e8f0;font-family:-apple-system,sans-serif}
.card{background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;max-width:480px;margin:0 auto 16px}
.mono{font-family:ui-monospace,monospace}
</style>
</head>
<body class="p-3">
<div class="max-w-[480px] mx-auto">
  <div class="text-center py-3 mb-3 border-b border-white/10">
    <div class="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">🛡️ CryptoGuard Pro</div>
    <div class="text-[11px] text-slate-500 tracking-widest">ANÁLISE ON-CHAIN SOLANA</div>
  </div>

  <div class="card p-4">
    <label class="text-[11px] text-slate-400 uppercase font-bold tracking-wider block mb-2">Endereço do Token</label>
    <div class="flex gap-2">
      <input id="addr" class="mono flex-1 bg-black border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 outline-none" placeholder="Cole o contrato Solana...">
      <button onclick="scan()" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 rounded-xl font-bold text-sm">🔍</button>
    </div>
  </div>

  <div id="savedBox" class="card p-3 hidden">
    <div class="flex justify-between items-center mb-2">
      <span class="text-[12px] font-bold text-amber-400">⭐ Tokens Salvos</span>
      <button onclick="document.getElementById('savedList').classList.toggle('hidden')" class="text-slate-500 text-xs">Ver ▾</button>
    </div>
    <div id="savedList" class="hidden space-y-1 text-[11px]"></div>
  </div>

  <div id="r" class="text-[13px] text-slate-500 text-center py-6">Cole um contrato e clique em 🔍</div>
</div>

<div id="modal" class="hidden fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
  <div class="bg-[#141a2e] border border-white/10 rounded-2xl max-w-md w-full max-h-[88vh] overflow-y-auto p-4">
    <div class="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
      <div class="font-black text-cyan-400 text-[15px]">🛡️ Detalhes de Segurança</div>
      <button onclick="document.getElementById('modal').classList.add('hidden')" class="text-slate-500 text-xl">×</button>
    </div>
    <div id="modalBody" class="text-[12px] text-slate-300 space-y-2"></div>
  </div>
</div>

<script>
let currentToken = null;

function fmt(n){if(!n)return '$0';if(n>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';return '$'+Number(n).toFixed(2);}
function short(a){return a?a.slice(0,6)+'...'+a.slice(-4):'N/A';}
function fmtPct(p){return (p||0).toFixed(2)+'%';}

function getSaved(){try{return JSON.parse(localStorage.getItem('cg_saved')||'[]');}catch(e){return [];}}
function saveSaved(l){localStorage.setItem('cg_saved',JSON.stringify(l));}
function renderSaved(){
  const s=getSaved();
  document.getElementById('savedBox').classList.toggle('hidden',s.length===0);
  const el=document.getElementById('savedList');
  if(s.length===0){el.innerHTML='';return;}
  el.innerHTML=s.map(t=>'<div class="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5"><button onclick="loadAddr(\\''+t.address+'\\')" class="font-bold text-cyan-400 hover:underline">'+t.symbol+'</button><div class="flex gap-2 items-center"><span class="text-[10px] px-2 py-0.5 rounded '+(t.score>=70?'bg-emerald-500/20 text-emerald-400':t.score>=40?'bg-amber-500/20 text-amber-400':'bg-rose-500/20 text-rose-400')+'">'+t.score+'</span><button onclick="removeSaved(\\''+t.address+'\\')" class="text-slate-500 hover:text-rose-400">×</button></div></div>').join('');
}
function loadAddr(a){document.getElementById('addr').value=a;scan();}
function removeSaved(a){saveSaved(getSaved().filter(t=>t.address!==a));renderSaved();}
function toggleSave(){
  if(!currentToken) return;
  const s=getSaved();
  const i=s.findIndex(t=>t.address===currentToken.address);
  if(i>=0) s.splice(i,1); else s.push({address:currentToken.address,symbol:currentToken.symbol,score:currentToken.score});
  saveSaved(s); renderSaved();
  document.getElementById('saveBtn').innerHTML = i>=0?'⭐ Salvar':'✅ Salvo!';
}

function renderDonut(score){
  const r=50, c=2*Math.PI*r;
  const pct=score/100;
  const offset=c*(1-pct);
  let color='#10b981';
  if(score<70) color='#f59e0b';
  if(score<40) color='#ef4444';
  return '<svg width="120" height="120" viewBox="0 0 120 120" class="mx-auto">'+
    '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="#1e2740" stroke-width="12"/>'+
    '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="12" stroke-dasharray="'+c+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 60 60)" stroke-linecap="round"/>'+
    '<text x="60" y="58" text-anchor="middle" fill="'+color+'" font-size="26" font-weight="900">'+score+'</text>'+
    '<text x="60" y="74" text-anchor="middle" fill="#64748b" font-size="10" font-weight="700">/ 100</text>'+
    '</svg>';
}

async function scan(){
  const addr=document.getElementById('addr').value.trim();
  if(!addr) return;
  document.getElementById('r').innerHTML='<div class="text-center py-6 text-cyan-400"><div class="inline-block w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div><br><span class="text-xs mt-3 block">Analisando on-chain via Helius...</span></div>';
  try{
    const res=await fetch('/api/real?address='+encodeURIComponent(addr));
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    render(data);
  }catch(e){
    document.getElementById('r').innerHTML='<div class="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-center text-xs">❌ '+e.message+'</div>';
  }
}

function render(data){
  const x=data.real;
  currentToken={address:x.address,symbol:x.symbol,score:data.score};
  const saved=getSaved().some(t=>t.address===x.address);
  const ok=data.audit.filter(a=>a.pass).length;
  const fail=data.audit.length-ok;
  const scoreColor=data.score>=70?'emerald':data.score>=40?'amber':'rose';
  const scoreLabel=data.score>=70?'🟢 Seguro':data.score>=40?'🟡 Risco moderado':'🔴 Alto risco';

  let html='';
  html+='<div class="card p-4">';
  html+='<div class="flex items-center justify-between mb-3"><div><div class="font-black text-[16px]">💊 '+(x.name||'?')+' ('+x.symbol+')</div><div class="text-[11px] text-slate-500">⏱️ '+x.ageText+' • DEX: '+(x.dex||'--')+'</div></div></div>';
  html+='<div class="text-center">'+renderDonut(data.score)+'<div class="text-'+scoreColor+'-400 font-bold text-sm mt-1">'+scoreLabel+'</div><div class="text-[11px] text-slate-500">'+ok+' ✅ aprovados • '+fail+' ❌ reprovados</div></div>';
  html+='</div>';

  html+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">📊 Mercado</div><div class="grid grid-cols-2 gap-2 text-[12px]">';
  html+='<div>💰 <b>MC:</b> '+fmt(x.mc)+'</div><div>💧 <b>Liq:</b> '+fmt(x.liqUsd)+'</div>';
  html+='<div>📈 <b>Vol 24h:</b> '+fmt(x.vol24h)+'</div><div>👥 <b>Holders:</b> '+x.hodls+'</div>';
  html+='<div>💲 <b>Preço:</b> $'+(x.priceUsd?Number(x.priceUsd).toFixed(6):'--')+'</div><div class="'+(x.ch24>=0?'text-emerald-400':'text-rose-400')+'"><b>24h:</b> '+(x.ch24>=0?'+':'')+Number(x.ch24).toFixed(1)+'%</div>';
  html+='</div></div>';

  html+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🛡️ Segurança Rápida</div><div class="grid grid-cols-2 gap-2 text-[12px]">';
  html+='<div>Top 10: <b class="'+(x.top10Pct>40?'text-rose-400':'text-emerald-400')+'">'+x.top10Pct.toFixed(1)+'%</b></div>';
  html+='<div>Top 20: <b>'+x.top20Pct.toFixed(1)+'%</b></div>';
  html+='<div>Bundle: <b class="'+(x.bundlePct>30?'text-rose-400':'text-emerald-400')+'">'+x.bundlePct.toFixed(0)+'%</b></div>';
  html+='<div>Burn: <b>'+x.burntPct.toFixed(2)+'%</b></div>';
  html+='<div>Vol Falso: <b class="'+(x.fakeVolPct>30?'text-amber-400':'text-emerald-400')+'">'+x.fakeVolPct.toFixed(1)+'%</b></div>';
  html+='<div>Fake Holders: <b>'+x.fakeHolders+'</b></div>';
  html+='</div>';
  html+='<button onclick="openDetails()" class="w-full mt-3 bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-bold text-[12px]">🔍 Ver Detalhes Completos</button>';
  html+='</div>';

  html+='<div class="card p-4"><div class="flex justify-between items-center"><span class="text-[11px] text-slate-400 uppercase font-bold">👥 Top 20 Carteiras</span><button onclick="toggleWallets()" class="text-cyan-400 text-xs font-bold">Ver ▾</button></div>';
  html+='<div id="walletsBox" class="hidden mt-3 space-y-1">';
  html+='<div id="walletsLoad" class="text-center py-3 text-xs text-slate-500">Carregando análise de carteiras...</div>';
  html+='</div></div>';

  html+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🛠️ Dev</div>';
  html+='<div class="text-[12px] space-y-1"><div>Endereço: '+(x.dev.address?'<a href="https://solscan.io/account/'+x.dev.address+'" target="_blank" class="mono text-cyan-400 hover:underline">'+short(x.dev.address)+'</a>':'N/A')+'</div>';
  html+='<div>Saldo SOL: <b>'+x.dev.sol.toFixed(2)+'</b></div>';
  html+='<div>Vendeu: <b class="'+(x.dev.soldPct>50?'text-rose-400':'text-emerald-400')+'">'+x.dev.soldPct.toFixed(0)+'%</b></div></div></div>';

  html+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🔗 Links</div><div class="grid grid-cols-3 gap-2 text-[11px] text-center">';
  html+='<a href="https://dexscreener.com/solana/'+(data.pair.pairAddress||'')+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">📊 Dex</a>';
  html+='<a href="https://rugcheck.xyz/tokens/'+x.address+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🛡️ RugCheck</a>';
  html+='<a href="https://solscan.io/token/'+x.address+'" target="_blank" cl
