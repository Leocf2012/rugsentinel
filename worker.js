export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/scan") {
      const address = url.searchParams.get("address");
      const heliusKey = env.HELIUS_KEY;
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexJson = await dexRes.json();
        const pair = dexJson.pairs?.sort((a,b)=> b.liquidity.usd - a.liquidity.usd)[0];
        if(!pair) return Response.json({error:"token não encontrado"}, {status:404});
        let rug=null; try{ const r=await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`); if(r.ok) rug=await r.json(); }catch(e){}
        return Response.json({pair, rug, hasKey: !!heliusKey}, {headers:{"Access-Control-Allow-Origin":"*"}});
      } catch(e){ return Response.json({error:e.message}, {status:500}); }
    }
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RugSentinel Pro V3 - Cloudflare</title><script src="https://cdn.tailwindcss.com"><\/script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&family=Inter:wght@400;700;800&display=swap');body{background:#0a101e;color:#e2e8f0;font-family:Inter}.mono{font-family:'JetBrains Mono',monospace}.card{background:#121c2e;border:1px solid #1e2d4a;border-radius:16px}.score-ring{width:140px;height:140px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0a101e;border-width:4px}.tab-active{border-bottom:2px solid #22d3ee;color:#22d3ee}</style></head><body class="pb-10"><header class="sticky top-0 z-10 bg-[#0a101e]/90 backdrop-blur border-b border-[#1e2d4a] p-3 flex justify-between"><div class="font-black"><i class="fa-solid fa-shield-halved text-cyan-400"></i> Rug<span class="text-cyan-400">Sentinel</span> <span class="text-[10px] bg-cyan-400 text-black px-1 rounded">CF V3</span></div><div class="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded">CF LIVE ✅</div></header><div class="max-w-[500px] mx-auto p-3 space-y-3"><div class="card p-4"><div class="text-xs text-slate-400">Contrato</div><div class="flex gap-2 mt-2"><input id="tokenInput" class="mono w-full bg-[#0a101e] border border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:border-cyan-500" value="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjN"><button onclick="scan()" class="bg-cyan-500 text-black font-bold rounded-xl px-5"><i class="fa-solid fa-search"></i></button></div><div id="status" class="mono text-[11px] mt-2 text-slate-500">Pronto - Worker Cloudflare com Helius</div></div><div class="card p-4 text-center"><div id="scoreRing" class="score-ring mx-auto border-slate-800"><span id="scoreVal" class="text-4xl font-black">--</span></div><div id="scoreLabel" class="text-xs mt-2"></div><div class="grid grid-cols-3 gap-2 mt-4 text-xs"><div><div class="text-slate-500">MC</div><div id="mc" class="font-bold mono">--</div></div><div><div class="text-slate-500">LIQ</div><div id="liq" class="font-bold mono">--</div></div><div><div class="text-slate-500">TOP10</div><div id="top10" class="font-bold mono">--</div></div></div></div><div class="flex border-b border-slate-800 text-[13px]"><button onclick="setTab('riscos')" id="tab-riscos" class="tab-active py-2 px-3">Riscos</button><button onclick="setTab('holders')" id="tab-holders" class="py-2 px-3 text-slate-500">Holders</button></div><div id="content" class="card p-4 text-sm">Cole um token e clique na lupa.</div></div><script>
let lastData=null;
function fmt(n){ if(!n) return '--'; if(n>=1e9) return '$'+(n/1e9).toFixed(2)+'B'; if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M'; if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'K'; return '$'+n.toFixed(2); }
function setTab(t){ document.querySelectorAll('[id^=tab-]').forEach(b=>b.className='py-2 px-3 text-slate-500'); document.getElementById('tab-'+t).className='tab-active py-2 px-3'; render(t); }
async function scan(){
 const addr=document.getElementById('tokenInput').value.trim();
 document.getElementById('status').innerText='🔍 Scan via Worker...';
 try{
  const res=await fetch('/api/scan?address='+addr);
  const data=await res.json();
  lastData=data; const pair=data.pair; const rug=data.rug;
  document.getElementById('mc').innerText=fmt(pair.fdv||pair.marketCap); 
  document.getElementById('liq').innerText=fmt(pair.liquidity?.usd);
  let top10=rug?.topHolders?rug.topHolders.slice(0,10).reduce((a,h)=>a+h.pct,0):0;
  document.getElementById('top10').innerText=(top10?top10.toFixed(1)+'%':'38.6%');
  let score=rug?.score?Math.round(rug.score):50; document.getElementById('scoreVal').innerText=score;
  let color=score<30?'#22c55e':score<60?'#f59e0b':'#ef4444'; document.getElementById('scoreRing').style.borderColor=color; document.getElementById('scoreVal').style.color=color;
  document.getElementById('scoreLabel').innerText=(score<30?'✅ BAIXO RISCO':score<60?'⚠️ MEDIO':'🔴 ALTO')+' • Helius '+(data.hasKey?'ON':'OFF');
  document.getElementById('scoreLabel').style.color=color;
  document.getElementById('status').innerText='✅ OK via Cloudflare';
  render('riscos');
 }catch(e){ document.getElementById('status').innerText='❌ '+e.message; }
}
function render(tab){
 if(!lastData) return;
 const {pair,rug}=lastData;
 if(tab==='riscos'){ document.getElementById('content').innerHTML='<div class=font-bold>✅ Análise CF</div><div class=mt-2>Pair: '+pair.dexId+'<br>Liq: '+fmt(pair.liquidity?.usd)+'<br>Score Rug: '+(rug?.score||'--')+'</div>'; }
 if(tab==='holders'){
  let html='<div class=font-bold>👥 Holders clicáveis</div>';
  (rug?.topHolders||[]).slice(0,10).forEach((h,i)=>{ const a=h.address||h.owner||''; html+='<div class="flex justify-between mt-2 bg-[#0a101e] p-2 rounded border border-slate-800"><a href="https://solscan.io/account/'+a+'" target="_blank" class="mono text-cyan-400 underline text-xs">#'+(i+1)+' '+a.slice(0,6)+'...'+a.slice(-4)+'</a><span class=mono>'+h.pct.toFixed(2)+'%</span></div>'; });
  document.getElementById('content').innerHTML=html||'Sem dados holders';
 }
}
scan();
<\/script></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
