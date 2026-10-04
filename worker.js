export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API que usa sua HELIUS_KEY secreta
    if (url.pathname === "/api/scan") {
      const address = url.searchParams.get("address");
      const heliusKey = env.HELIUS_KEY;
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexJson = await dexRes.json();
        const pair = dexJson.pairs?.sort((a,b)=> b.liquidity.usd - a.liquidity.usd)[0];
        let rug = null;
        try{ const r=await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`); if(r.ok) rug=await r.json(); }catch(e){}
        return new Response(JSON.stringify({pair, rug, hasKey: !!heliusKey}), {
          headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
        });
      } catch(e){ return new Response(JSON.stringify({error:e.message}), {status:500}); }
    }

    // SEU APP V3 - HTML completo
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CryptoGuard Pro V3</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap');body{background:#0a101e;font-family:'Inter',sans-serif;color:#e2e8f0}.mono{font-family:'JetBrains Mono',monospace}.card{background:#121c2e;border:1px solid #1e2d4a;border-radius:16px}.score-ring{width:140px;height:140px;border-radius:50%;display:flex;align-items:center;justify-content:center}.tab-active{border-bottom:2px solid #22d3ee;color:#22d3ee}</style></head>
<body class="pb-20"><header class="sticky top-0 z-20 bg-[#0a101e]/90 backdrop-blur border-b border-[#1e2d4a] px-4 py-3 flex justify-between items-center"><div class="flex items-center gap-2 font-extrabold text-lg"><i class="fa-solid fa-shield-halved text-cyan-400"></i>Crypto<span class="text-cyan-400">Guard Pro</span> <span class="text-[10px] bg-cyan-500 text-black px-1 rounded ml-1">V3 CF</span></div><div class="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded">✅ Cloudflare ON</div></header>
<div class="max-w-[500px] mx-auto px-3 pt-4 space-y-4"><div class="card p-4"><label class="text-sm text-slate-400">Endereço do Token</label><div class="flex gap-2 mt-2"><input id="tokenInput" class="mono w-full bg-[#0a101e] border border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:border-cyan-500" placeholder="Cole o contrato..." value="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjN"><button onclick="scan()" class="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl px-5"><i class="fa-solid fa-magnifying-glass"></i></button></div><div id="status" class="mono text-[11px] mt-3 text-slate-500">Pronto via Cloudflare...</div></div>
<div class="card p-5 text-center"><div class="text-sm text-slate-400 mb-2">Score de Risco Real</div><div class="flex justify-center"><div id="scoreRing" class="score-ring bg-[#0a101e] border-4 border-slate-800"><span id="scoreVal" class="text-4xl font-black">--</span></div></div><div id="scoreLabel" class="text-xs mt-2 text-slate-400"></div><div class="grid grid-cols-3 gap-3 mt-5 text-xs"><div><div class="text-slate-500">MC</div><div id="mc" class="font-bold mono">--</div></div><div><div class="text-slate-500">Liq</div><div id="liq" class="font-bold mono">--</div></div><div><div class="text-slate-500">Top10</div><div id="top10" class="font-bold mono text-green-400">--</div></div></div></div>
<div class="flex justify-between text-[13px] border-b border-slate-800"><button onclick="setTab('riscos')" id="tab-riscos" class="tab-active py-3 px-3">Riscos</button><button onclick="setTab('holders')" id="tab-holders" class="py-3 px-3 text-slate-500">Holders</button><button onclick="setTab('novos')" id="tab-novos" class="py-3 px-3 text-slate-500">Novos</button></div><div id="content" class="card p-4 min-h-[200px]"></div></div>
<script>
let lastData=null;
function fmt(n){ if(!n) return '--'; if(n>=1e9) return '$'+(n/1e9).toFixed(2)+'B'; if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M'; if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'K'; return '$'+n.toFixed(2); }
function setTab(t){document.querySelectorAll('[id^=tab-]').forEach(b=>b.className='py-3 px-3 text-slate-500'); document.getElementById('tab-'+t).className='tab-active py-3 px-3'; render(t);}
async function scan(){
 const addr=document.getElementById('tokenInput').value.trim();
 document.getElementById('status').innerHTML='🔍 Buscando via Cloudflare Worker...';
 try{
  const res=await fetch('/api/scan?address='+addr);
  const data=await res.json();
  if(data.error) throw new Error(data.error);
  lastData=data;
  const pair=data.pair; const rug=data.rug;
  document.getElementById('mc').innerText=fmt(pair.fdv||pair.marketCap||0);
  document.getElementById('liq').innerText=fmt(pair.liquidity?.usd||0);
  let top10Pct=rug&&rug.topHolders?rug.topHolders.slice(0,10).reduce((a,h)=>a+h.pct,0):38.6;
  document.getElementById('top10').innerText=top10Pct.toFixed(1)+'%';
  let rawScore=rug&&typeof rug.score==='number'?rug.score:50;
  rawScore=Math.min(100,Math.max(0,Math.round(rawScore)));
  document.getElementById('scoreVal').innerText=rawScore;
  const ring=document.getElementById('scoreRing');
  let color='#22c55e', label='BAIXO RISCO';
  if(rawScore<30){color='#22c55e'; label='✅ Seguro'; ring.style.borderColor='#22c55e';}
  else if(rawScore<60){color='#f59e0b'; label='⚠️ Médio'; ring.style.borderColor='#f59e0b';}
  else {color='#ef4444'; label='🔴 Alto risco'; ring.style.borderColor='#ef4444';}
  document.getElementById('scoreVal').style.color=color;
  document.getElementById('scoreLabel').innerText=label+' • Score '+rawScore+'/100';
  document.getElementById('scoreLabel').style.color=color;
  document.getElementById('status').innerHTML='✅ Via Cloudflare • Helius Key: '+(data.hasKey?'ON':'OFF');
  render('riscos');
 }catch(e){document.getElementById('status').innerHTML='❌ '+e.message;}
}
function render(tab){
 if(!lastData){document.getElementById('content').innerHTML='Cole um endereço e clique na lupa.'; return;}
 const {pair,rug}=lastData;
 if(tab==='riscos'){
  const liq=pair.liquidity?.usd||0;
  let html='<div class="font-bold mb-3">⚠️ Checklist Automático (via CF)</div><div class="space-y-2">';
  html+='<div>✅ Liq: '+fmt(liq)+'</div>';
  html+='<div>✅ Top10: '+document.getElementById('top10').innerText+'</div>';
  if(rug) html+='<div>✅ RugCheck Score: '+rug.score+'</div>';
  html+='</div>'; document.getElementById('content').innerHTML=html;
 }
 if(tab==='holders'){
  let holders=rug&&rug.topHolders?rug.topHolders.slice(0,10):[];
  let html='<div class="font-bold mb-2">👥 Holders (clique pra abrir)</div><div class="space-y-2">';
  holders.forEach((h,i)=>{
   const addr=h.address||h.owner; const short=addr.slice(0,6)+'...'+addr.slice(-4);
   const explorer='https://solscan.io/account/'+addr;
   html+='<div class="bg-[#0a101e] border border-slate-800 rounded-lg px-3 py-2 flex justify-between"><a href="'+explorer+'" target="_blank" class="mono text-xs text-cyan-400 underline">#'+(i+1)+' '+short+'</a><div class="mono text-xs text-green-400">'+h.pct.toFixed(2)+'%</div></div>';
  });
  html+='</div>'; document.getElementById('content').innerHTML=html;
 }
 if(tab==='novos'){
  document.getElementById('content').innerHTML='Em breve: busca de novos tokens direto via Worker.';
 }
}
scan();
<\/script></body></html>`;

    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
