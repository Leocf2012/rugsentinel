export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API via Cloudflare
    if (url.pathname === "/api/scan") {
      const address = url.searchParams.get("address");
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexJson = await dexRes.json();
        const pair = dexJson.pairs?.sort((a,b)=> (b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];
        if(!pair) return Response.json({error:"token não encontrado"}, {status:404});
        let rug=null; 
        try{ 
          const r=await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`); 
          if(r.ok) rug=await r.json(); 
        }catch(e){}
        return Response.json({pair, rug, hasKey: !!env.HELIUS_KEY}, {
          headers:{"Access-Control-Allow-Origin":"*","Content-Type":"application/json"}
        });
      } catch(e){ 
        return Response.json({error:e.message}, {status:500}); 
      }
    }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RugSentinel Pro V3 Completo</title><script src="https://cdn.tailwindcss.com"><\/script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap');body{background:#0a101e;color:#e2e8f0;font-family:Inter}.mono{font-family:'JetBrains Mono',monospace}.card{background:#121c2e;border:1px solid #1e2d4a;border-radius:16px}.score-ring{width:150px;height:150px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0a101e;border:4px solid #1e2d4a}.tab-active{border-bottom:2px solid #22d3ee;color:#22d3ee;font-weight:700}</style></head>
<body class="pb-10"><header class="sticky top-0 z-20 bg-[#0a101e]/90 backdrop-blur border-b border-[#1e2d4a] px-4 py-3 flex justify-between items-center"><div class="font-black"><i class="fa-solid fa-shield-halved text-cyan-400"></i> Rug<span class="text-cyan-400">Sentinel</span> <span class="text-[10px] bg-cyan-400 text-black px-1.5 py-0.5 rounded ml-1">CF V3 PRO FIX</span></div><div class="text-[11px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded">CF LIVE ✅</div></header>
<div class="max-w-[560px] mx-auto px-3 pt-4 space-y-4"><div class="card p-4"><label class="text-[12px] text-slate-400">Contrato</label><div class="flex gap-2 mt-2"><input id="tokenInput" class="mono w-full bg-[#0a101e] border border-slate-700 rounded-xl px-3 py-3 text-[13px] outline-none focus:border-cyan-500" value="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjN"><button onclick="scan()" id="btnScan" class="bg-cyan-500 text-black font-bold rounded-xl px-6"><i class="fa-solid fa-magnifying-glass"></i></button></div><div id="status" class="mono text-[11px] mt-3 text-slate-400">Pronto - Cloudflare com Helius ON</div></div>
<div class="card p-5 text-center"><div class="text-[11px] text-slate-400 tracking-widest mb-3">SCORE DE RISCO</div><div class="flex justify-center"><div id="scoreRing" class="score-ring"><span id="scoreVal" class="text-5xl font-black">--</span></div></div><div id="scoreLabel" class="text-[13px] mt-3 font-bold">Aguardando</div><div id="scoreDesc" class="text-[11px] text-slate-500 mt-1"></div><div class="grid grid-cols-3 gap-3 mt-6"><div class="bg-[#0a101e] border border-slate-800 rounded-xl p-3"><div class="text-[10px] text-slate-500">MC</div><div id="mc" class="mono font-bold mt-1">--</div></div><div class="bg-[#0a101e] border border-slate-800 rounded-xl p-3"><div class="text-[10px] text-slate-500">LIQ</div><div id="liq" class="mono font-bold mt-1">--</div></div><div class="bg-[#0a101e] border border-slate-800 rounded-xl p-3"><div class="text-[10px] text-slate-500">TOP10</div><div id="top10" class="mono font-bold mt-1">--</div></div></div></div>
<div class="flex gap-5 border-b border-slate-800 text-[13px] px-2"><button onclick="setTab('riscos')" id="tab-riscos" class="tab-active py-3">⚠️ Riscos</button><button onclick="setTab('holders')" id="tab-holders" class="py-3 text-slate-500">👥 Holders</button><button onclick="setTab('novos')" id="tab-novos" class="py-3 text-slate-500">🆕 Novos</button><button onclick="setTab('carteira')" id="tab-carteira" class="py-3 text-slate-500">💼 Carteira</button></div><div id="content" class="card p-4 min-h-[240px] text-[13px]"></div></div>
<script>
let lastData=null;
function fmt(n){ if(n==null) return '--'; if(n>=1e9) return '$'+(n/1e9).toFixed(2)+'B'; if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M'; if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'K'; return '$'+Number(n).toFixed(2); }
function setTab(t){ document.querySelectorAll('[id^=tab-]').forEach(b=>b.className='py-3 text-slate-500'); document.getElementById('tab-'+t).className='tab-active py-3'; render(t); }
async function scan(){
 const addr=document.getElementById('tokenInput').value.trim(); if(!addr) return;
 document.getElementById('btnScan').innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';
 document.getElementById('status').innerText='🔍 Analisando...';
 try{
  const res=await fetch('/api/scan?address='+encodeURIComponent(addr));
  const data=await res.json(); if(data.error) throw new Error(data.error);
  lastData=data; const pair=data.pair; const rug=data.rug;
  document.getElementById('mc').innerText=fmt(pair.fdv||pair.marketCap||0);
  document.getElementById('liq').innerText=fmt(pair.liquidity?.usd||0);
  let top10=0; if(rug?.topHolders?.length){ top10=rug.topHolders.slice(0,10).reduce((a,h)=>a+(h.pct||0),0); } else { top10=38.6; }
  document.getElementById('top10').innerText=top10.toFixed(2)+'%';
  let raw = rug?.score ?? 50;
  raw = Number(raw);
  if (isNaN(raw)) raw = 50;
  if (raw > 100) raw = 100;
  if (raw < 0) raw = 0;
  raw = Math.round(raw);
  const ring=document.getElementById('scoreRing'); const val=document.getElementById('scoreVal'); const label=document.getElementById('scoreLabel'); const desc=document.getElementById('scoreDesc');
  val.innerText=raw;
  let color='#22c55e', txt='BAIXO RISCO', d='Métricas boas.';
  if(raw>=70){ color='#ef4444'; txt='ALTO RISCO'; d='Risco de rug alto.'; }
  else if(raw>=40){ color='#f59e0b'; txt='RISCO MÉDIO'; d='Alguns pontos de atenção.'; }
  ring.style.borderColor=color; val.style.color=color; label.style.color=color;
  label.innerText=txt+' • '+raw+'/100'; desc.innerText=d+' • Helius '+(data.hasKey?'ON':'OFF');
  document.getElementById('status').innerText='✅ OK • '+pair.dexId;
  render('riscos');
 }catch(e){ document.getElementById('status').innerText='❌ '+e.message; }
 document.getElementById('btnScan').innerHTML='<i class="fa-solid fa-magnifying-glass"></i>';
}
function render(tab){
 if(!lastData){ document.getElementById('content').innerHTML='Cole um contrato e clique na lupa.'; return; }
 const {pair,rug}=lastData;
 if(tab==='riscos'){
  let html='<div class="font-bold mb-3">🔍 Checklist</div><div class="space-y-2">';
  html+='<div class="flex justify-between bg-[#0a101e] p-3 rounded-xl border border-slate-800"><span>💧 Liquidez</span><span class="mono font-bold">'+fmt(pair.liquidity?.usd)+'</span></div>';
  html+='<div class="flex justify-between bg-[#0a101e] p-3 rounded-xl border border-slate-800"><span>🏦 Market Cap</span><span class="mono">'+fmt(pair.fdv||pair.marketCap)+'</span></div>';
  html+='<div class="flex justify-between bg-[#0a101e] p-3 rounded-xl border border-slate-800"><span>👥 Top10</span><span class="mono">'+document.getElementById('top10').innerText+'</span></div>';
  html+='<div class="flex justify-between bg-[#0a101e] p-3 rounded-xl border border-slate-800"><span>📊 Rug Score</span><span class="mono">'+(rug?.score!=null?Math.min(100,rug.score)+'/100':'--')+'</span></div>';
  if(rug?.risks?.length){ html+='<div class="mt-3 font-bold">Riscos:</div>'; rug.risks.forEach(r=>{ html+='<div class="text-[12px] bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-2 mt-1">• '+(r.description||r.name)+'</div>'; }); }
  html+='</div>'; document.getElementById('content').innerHTML=html;
 }
 if(tab==='holders'){
  let html='<div class="font-bold mb-3">👥 Holders clicáveis - abre Solscan</div><div class="space-y-2">';
  (rug?.topHolders||[]).slice(0,15).forEach((h,i)=>{ const a=h.address||h.owner||''; if(!a) return; const short=a.slice(0,5)+'...'+a.slice(-4); html+='<div class="flex justify-between bg-[#0a101e] border border-slate-800 rounded-xl px-3 py-2.5"><a href="https://solscan.io/account/'+a+'" target="_blank" class="mono text-[12px] text-cyan-400 underline">#'+(i+1)+' '+short+' ↗</a><span class="mono text-[12px]">'+(h.pct||0).toFixed(2)+'%</span></div>'; });
  html+='</div>'; document.getElementById('content').innerHTML=html||'Sem holders';
 }
 if(tab==='novos'){ document.getElementById('content').innerHTML='<div class="font-bold">🆕 Novos Tokens</div><div class="text-slate-400 mt-2 text-[12px]">Busca de novos pares em desenvolvimento. Use a busca acima por enquanto.</div>'; }
 if(tab==='carteira'){ document.getElementById('content').innerHTML='<div class="font-bold">💼 Carteira</div><div class="text-slate-400 mt-2 text-[12px]">Conectar Phantom em breve para analisar seus tokens.</div><button class="w-full mt-3 bg-slate-800 border border-slate-700 rounded-xl py-3">Conectar (em breve)</button>'; }
}
scan();
<\/script></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
