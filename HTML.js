export function getHTML() {
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
${getScript()}
</script>
</body>
</html>`;
}

function getScript() {
  return `
let currentToken = null;
function fmt(n){if(!n)return '$0';if(n>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';return '$'+Number(n).toFixed(2);}
function short(a){return a?a.slice(0,6)+'...'+a.slice(-4):'N/A';}
function getSaved(){try{return JSON.parse(localStorage.getItem('cg_saved')||'[]');}catch(e){return [];}}
function saveSaved(l){localStorage.setItem('cg_saved',JSON.stringify(l));}
function renderSaved(){
  const s=getSaved();
  document.getElementById('savedBox').classList.toggle('hidden',s.length===0);
  const el=document.getElementById('savedList');
  if(s.length===0){el.innerHTML='';return;}
  el.innerHTML=s.map(t=>'<div class="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5"><button onclick="loadAddr(\\''+t.address+'\\')" class="font-bold text-cyan-400">'+t.symbol+'</button><div class="flex gap-2 items-center"><span class="text-[10px] px-2 py-0.5 rounded '+(t.score>=70?'bg-emerald-500/20 text-emerald-400':t.score>=40?'bg-amber-500/20 text-amber-400':'bg-rose-500/20 text-rose-400')+'">'+t.score+'</span><button onclick="removeSaved(\\''+t.address+'\\')" class="text-slate-500">×</button></div></div>').join('');
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
  const offset=c*(1-score/100);
  let color='#10b981';
  if(score<70) color='#f59e0b';
  if(score<40) color='#ef4444';
  return '<svg width="120" height="120" viewBox="0 0 120 120" class="mx-auto"><circle cx="60" cy="60" r="'+r+'" fill="none" stroke="#1e2740" stroke-width="12"/><circle cx="60" cy="60" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="12" stroke-dasharray="'+c+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 60 60)" stroke-linecap="round"/><text x="60" y="58" text-anchor="middle" fill="'+color+'" font-size="26" font-weight="900">'+score+'</text><text x="60" y="74" text-anchor="middle" fill="#64748b" font-size="10" font-weight="700">/ 100</text></svg>';
}
async function scan(){
  const addr=document.getElementById('addr').value.trim();
  if(!addr) return;
  document.getElementById('r').innerHTML='<div class="text-center py-6 text-cyan-400"><div class="inline-block w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div><br><span class="text-xs mt-3 block">Analisando on-chain...</span></div>';
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
  let h='';
  h+='<div class="card p-4"><div class="flex items-center justify-between mb-3"><div><div class="font-black text-[16px]">💊 '+(x.name||'?')+' ('+x.symbol+')</div><div class="text-[11px] text-slate-500">⏱️ '+x.ageText+' • DEX: '+(x.dex||'--')+'</div></div></div><div class="text-center">'+renderDonut(data.score)+'<div class="text-'+scoreColor+'-400 font-bold text-sm mt-1">'+scoreLabel+'</div><div class="text-[11px] text-slate-500">'+ok+' ✅ • '+fail+' ❌</div></div></div>';
  h+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">📊 Mercado</div><div class="grid grid-cols-2 gap-2 text-[12px]"><div>💰 <b>MC:</b> '+fmt(x.mc)+'</div><div>💧 <b>Liq:</b> '+fmt(x.liqUsd)+'</div><div>📈 <b>Vol 24h:</b> '+fmt(x.vol24h)+'</div><div>👥 <b>Holders:</b> '+x.hodls+'</div><div>💲 <b>Preço:</b> $'+(x.priceUsd?Number(x.priceUsd).toFixed(6):'--')+'</div><div class="'+(x.ch24>=0?'text-emerald-400':'text-rose-400')+'"><b>24h:</b> '+(x.ch24>=0?'+':'')+Number(x.ch24).toFixed(1)+'%</div></div></div>';
  h+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🛡️ Segurança</div><div class="grid grid-cols-2 gap-2 text-[12px]"><div>Top10: <b class="'+(x.top10Pct>40?'text-rose-400':'text-emerald-400')+'">'+x.top10Pct.toFixed(1)+'%</b></div><div>Top20: <b>'+x.top20Pct.toFixed(1)+'%</b></div><div>Bundle: <b class="'+(x.bundlePct>30?'text-rose-400':'text-emerald-400')+'">'+x.bundlePct.toFixed(0)+'%</b></div><div>Burn: <b>'+x.burntPct.toFixed(2)+'%</b></div><div>Vol Falso: <b class="'+(x.fakeVolPct>30?'text-amber-400':'text-emerald-400')+'">'+x.fakeVolPct.toFixed(1)+'%</b></div><div>Fake: <b>'+x.fakeHolders+'</b></div></div><button onclick="openDetails()" class="w-full mt-3 bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-bold text-[12px]">🔍 Detalhes</button></div>';
  h+='<div class="card p-4"><div class="flex justify-between items-center"><span class="text-[11px] text-slate-400 uppercase font-bold">👥 Top 20</span><button onclick="toggleWallets()" class="text-cyan-400 text-xs font-bold">Ver ▾</button></div><div id="walletsBox" class="hidden mt-3 space-y-1"><div id="walletsLoad" class="text-center py-3 text-xs text-slate-500">Carregando...</div></div></div>';
  h+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🛠️ Dev</div><div class="text-[12px] space-y-1"><div>Endereço: '+(x.dev.address?'<a href="https://solscan.io/account/'+x.dev.address+'" target="_blank" class="mono text-cyan-400">'+short(x.dev.address)+'</a>':'N/A')+'</div><div>Saldo SOL: <b>'+x.dev.sol.toFixed(2)+'</b></div><div>Vendeu: <b class="'+(x.dev.soldPct>50?'text-rose-400':'text-emerald-400')+'">'+x.dev.soldPct.toFixed(0)+'%</b></div></div></div>';
  h+='<div class="card p-4"><div class="text-[11px] text-slate-400 uppercase font-bold mb-2">🔗 Links</div><div class="grid grid-cols-3 gap-2 text-[11px] text-center"><a href="https://dexscreener.com/solana/'+(data.pair.pairAddress||'')+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">📊 Dex</a><a href="https://rugcheck.xyz/tokens/'+x.address+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🛡️ Rug</a><a href="https://solscan.io/token/'+x.address+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🔍 Scan</a><a href="https://birdeye.so/token/'+x.address+'?chain=solana" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🐦 Bird</a><a href="https://bubblemaps.io/map?address='+x.address+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🫧 Bub</a><a href="https://pump.fun/coin/'+x.address+'" target="_blank" class="bg-black/40 p-2 rounded-lg border border-white/5">🎯 Pump</a></div></div>';
  h+='<div class="flex gap-2 mb-3"><button id="saveBtn" onclick="toggleSave()" class="flex-1 py-2.5 rounded-xl font-bold text-[13px] '+(saved?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':'bg-slate-800 text-amber-400 border border-amber-400/30')+'">'+(saved?'✅ Salvo!':'⭐ Salvar')+'</button></div>';
  h+='<div class="bg-black/40 p-2 rounded mono text-[10px] text-slate-500 break-all flex justify-between items-center mb-3"><span>'+x.address+'</span><button onclick="navigator.clipboard.writeText(\\''+x.address+'\\')" class="text-slate-400 ml-2">📋</button></div>';
  document.getElementById('r').innerHTML=h;
  window._currentData=data;
  renderSaved();
}
function openDetails(){
  const data=window._currentData;
  if(!data) return;
  let h='';
  data.audit.forEach(a=>{
    h+='<div class="bg-black/30 p-2 rounded border border-white/5 flex gap-2 items-start"><span class="text-lg">'+(a.pass?'✅':'❌')+'</span><div><div class="font-bold '+(a.pass?'text-emerald-400':'text-rose-400')+'">'+a.check+'</div><div class="text-slate-400 text-[11px]">'+a.desc+'</div></div></div>';
  });
  h+='<div class="mt-3 p-3 bg-black/40 rounded-xl text-center"><div class="font-bold text-cyan-400">Resumo</div><div class="text-[13px] mt-1">'+data.audit.filter(a=>a.pass).length+' ✅ | '+data.audit.filter(a=>!a.pass).length+' ❌</div><div class="text-[16px] font-black mt-2">Score: '+data.score+'/100</div></div>';
  document.getElementById('modalBody').innerHTML=h;
  document.getElementById('modal').classList.remove('hidden');
}
async function toggleWallets(){
  const box=document.getElementById('walletsBox');
  box.classList.toggle('hidden');
  if(!box.classList.contains('hidden')){
    const data=window._currentData;
    if(!data) return;
    const addr=data.real.address;
    const ld=document.getElementById('walletsLoad');
    ld.innerHTML='<div class="text-center py-3 text-xs text-cyan-400">⏳ Analisando 20 carteiras (10-15s)...</div>';
    try{
      const r=await fetch('/api/wallets?address='+encodeURIComponent(addr)+'&start=0&end=10');
      const d1=await r.json();
      const r2=await fetch('/api/wallets?address='+encodeURIComponent(addr)+'&start=10&end=20');
      const d2=await r2.json();
      const all=[...(d1.wallets||[]),...(d2.wallets||[])];
      const top20=data.real.top20;
      let h='';
      all.forEach((w,i)=>{
        const t=top20[i]||{};
        let badge='🟠 RECEBEU', cls='bg-orange-500/20 text-orange-400';
        if(t.isDev){badge='🛠️ DEV';cls='bg-purple-500/20 text-purple-400';}
        else if(t.isBurn){badge='🔥 BURN';cls='bg-slate-500/20 text-slate-300';}
        else if(w.tipo==='COMPROU'){badge='🟢 COMPROU';cls='bg-emerald-500/20 text-emerald-400';}
        h+='<div class="bg-black/30 p-2 rounded border border-white/5 text-[11px]"><div class="flex justify-between items-center"><a href="https://solscan.io/account/'+w.address+'" target="_blank" class="mono text-cyan-400">#'+(i+1)+' '+short(w.address)+'</a><span class="font-bold">'+(t.pct||0).toFixed(2)+'%</span></div><div class="flex justify-between mt-1"><span class="'+cls+' px-2 py-0.5 rounded text-[10px] font-bold">'+badge+'</span><span class="text-slate-500 text-[10px]">'+(w.detalhe||'')+'</span></div></div>';
      });
      document.getElementById('walletsBox').innerHTML=h;
    }catch(e){
      ld.innerHTML='<div class="text-rose-400 text-xs text-center py-3">❌ '+e.message+'</div>';
    }
  }
}
renderSaved();
`;
}
