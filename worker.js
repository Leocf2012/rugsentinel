export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const HELIUS_KEY = env.HELIUS_KEY || 'PLACEHOLDER';
    const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

    const HTML_APP = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RugSentinel</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f;color:#e8e8f0;font-family:-apple-system,sans-serif;min-height:100vh;padding:20px}
.app{max-width:480px;margin:0 auto}
.header{text-align:center;padding:20px 0;border-bottom:1px solid #2a2a3d;margin-bottom:20px}
.logo{font-size:24px;font-weight:900;background:linear-gradient(135deg,#00ff9d,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tagline{font-size:11px;color:#7a7a95;letter-spacing:2px}
.input-box{display:flex;gap:8px;margin-bottom:16px}
input{flex:1;padding:14px;border-radius:12px;border:1px solid #2a2a3d;background:#14141f;color:#fff;font-family:monospace;outline:none}
button{padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#00ff9d,#00d4ff);color:#0a0a0f;font-weight:800;cursor:pointer}
.card{background:#14141f;border:1px solid #2a2a3d;border-radius:16px;overflow:hidden;margin-top:16px}
.token-head{padding:16px;background:linear-gradient(135deg,rgba(0,255,157,.08),rgba(0,212,255,.05));display:flex;align-items:center;gap:12px}
.avatar{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00ff9d,#00d4ff);display:flex;align-items:center;justify-content:center;font-weight:900;color:#0a0a0f}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#2a2a3d}
.stat{background:#14141f;padding:12px 14px}.stat-label{font-size:10px;color:#7a7a95;text-transform:uppercase;font-weight:700;margin-bottom:4px}.stat-value{font-size:14px;font-weight:800;font-family:monospace}
.section{padding:14px 16px;border-top:1px solid #2a2a3d}.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}.row-label{color:#7a7a95}
.links{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px}
.link{background:#1c1c2a;border:1px solid #2a2a3d;border-radius:8px;padding:10px;color:#e8e8f0;text-decoration:none;text-align:center;font-size:12px;font-weight:700}
.error{background:rgba(255,51,102,.1);border:1px solid rgba(255,51,102,.3);color:#ff3366;padding:14px;border-radius:12px;text-align:center;display:none;margin-bottom:16px}
#loading{text-align:center;padding:20px;color:#00ff9d;display:none}
.badge{padding:4px 8px;border-radius:20px;font-size:11px;font-weight:800}
</style></head>
<body><div class="app">
<div class="header"><div class="logo">RugSentinel</div><div class="tagline">PUMP.FUN SCANNER • HELIUS + RUGCHECK</div></div>
<div class="input-box"><input id="contract" placeholder="Cole contrato Solana..."><button id="btn" onclick="scan()">Escanear</button></div>
<div id="loading">⏳ Consultando DexScreener + RugCheck + Helius...</div><div id="error" class="error"></div><div id="result"></div>
</div>
<script>
function fmt(n){if(!n)return "--";if(n>=1e9)return "$"+(n/1e9).toFixed(2)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(2)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(1)+"K";return "$"+Number(n).toFixed(2);}
function fmtAge(ts){if(!ts)return "--";var m=Math.floor((Date.now()-ts)/60000);if(m<60)return m+"m";var h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d";}
async function scan(){
 var c=document.getElementById("contract").value.trim(); if(!c)return alert("Cole o contrato");
 var btn=document.getElementById("btn"),ld=document.getElementById("loading"),err=document.getElementById("error"),res=document.getElementById("result");
 btn.disabled=true;ld.style.display="block";err.style.display="none";res.innerHTML="";
 try{var r=await fetch("/api/scan/"+encodeURIComponent(c));var data=await r.json();if(data.error)throw new Error(data.error);render(data);}catch(e){err.textContent="ERRO: "+e.message;err.style.display="block";}finally{btn.disabled=false;ld.style.display="none";}
}
function render(d){
 var p=d.pair, s=d.security, h=d.helius; var sym=p.baseToken.symbol||"?", name=p.baseToken.name||"Desconhecido";
 var score=s?.score_normalised||50; var scoreColor=score>=70?"#00ff9d":score>=40?"#ffaa00":"#ff3366";
 var top10=h?.topHolders?h.topHolders.slice(0,10).reduce((a,b)=>a+b.pct,0).toFixed(1)+"%":s?.topHolders?.slice(0,10).reduce((a,b)=>a+(b.pct||0),0).toFixed(1)+"%"||"--";
 var html='<div class="card"><div class="token-head"><div class="avatar">'+sym.slice(0,2).toUpperCase()+'</div><div style="flex:1"><div style="font-weight:800">'+name+'</div><div style="color:#00ff9d;font-family:monospace;font-size:12px">$'+sym+'</div></div><div class="badge" style="background:'+scoreColor+'22;color:'+scoreColor+';border:1px solid '+scoreColor+'55">'+score+'/100</div></div>';
 html+='<div class="grid"><div class="stat"><div class="stat-label">Market Cap</div><div class="stat-value">'+fmt(p.fdv||p.marketCap)+'</div></div><div class="stat"><div class="stat-label">Idade</div><div class="stat-value">'+fmtAge(p.pairCreatedAt)+'</div></div><div class="stat"><div class="stat-label">Liquidez</div><div class="stat-value">'+fmt(p.liquidity?.usd)+'</div></div><div class="stat"><div class="stat-label">Vol 24h</div><div class="stat-value">'+fmt(p.volume?.h24)+'</div></div></div>';
 html+='<div class="section"><div class="row"><span class="row-label">Holders</span><span>'+(s?.totalHolders||h?.topHolders?.length||"--")+'</span></div><div class="row"><span class="row-label">Top 10</span><span style="color:'+(parseFloat(top10)>30?"#ff3366":"#00ff9d")+'">'+top10+'</span></div><div class="row"><span class="row-label">Mint Authority</span><span>'+(s?.tokenMeta?.mutable===false||h?.mintInfo?.mintAuthority===null?"✅ Fechado":"⚠️ Aberto")+'</span></div><div class="row"><span class="row-label">Creator</span><span style="font-family:monospace;font-size:11px">'+(s?.creator||h?.creator||"--").slice(0,12)+'</span></div></div>';
 html+='<div class="links"><a href="https://dexscreener.com/solana/'+p.pairAddress+'" target="_blank" class="link">DexScreener</a><a href="https://rugcheck.xyz/tokens/'+d.contract+'" target="_blank" class="link">RugCheck</a><a href="https://solscan.io/token/'+d.contract+'" target="_blank" class="link">Solscan</a><a href="https://birdeye.so/token/'+d.contract+'?chain=solana" target="_blank" class="link">Birdeye</a></div></div>';
 document.getElementById("result").innerHTML=html;
}
</script></body></html>`;

    if (path === "/" || path === "/index.html") {
      return new Response(HTML_APP, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path.startsWith("/api/scan/")) {
      const contract = decodeURIComponent(path.replace("/api/scan/", ""));
      if (!contract) return new Response(JSON.stringify({ error: "Contrato vazio" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      try {
        const result = await analisarToken(contract, HELIUS_RPC, HELIUS_KEY);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }
    return new Response("Not found", { status: 404 });
  }
};

async function analisarToken(contract, HELIUS_RPC, HELIUS_KEY) {
  const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(contract)}`);
  if (!dexRes.ok) throw new Error("DexScreener off");
  const dexData = await dexRes.json();
  if (!dexData.pairs?.length) throw new Error("Token não encontrado");
  const pair = dexData.pairs.sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0))[0];

  let heliusData = null;
  if (HELIUS_KEY!== 'PLACEHOLDER') {
    try {
      const mintInfo = await getMintInfo(contract, HELIUS_RPC);
      const topHolders = await getTopHolders(contract, HELIUS_RPC, mintInfo);
      heliusData = { mintInfo, topHolders };
    } catch(e){}
  }

  let security = null;
  try {
    const rugRes = await fetch(`https://api.rugcheck.xyz/v1/tokens/${contract}/report`);
    if (rugRes.ok) security = await rugRes.json();
  } catch(e){}

  return { contract, pair, helius: heliusData, security };
}

async function getMintInfo(mint, rpc) {
  const r = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"getAccountInfo", params:[mint,{encoding:"jsonParsed"}] }) });
  const j = await r.json();
  const info = j.result?.value?.data?.parsed?.info;
  if(!info) return null;
  return { supply: parseInt(info.supply), decimals: info.decimals, mintAuthority: info.mintAuthority, freezeAuthority: info.freezeAuthority };
}

async function getTopHolders(mint, rpc, mintInfo) {
  const r = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"getTokenLargestAccounts", params:[mint] }) });
  const j = await r.json();
  const total = mintInfo?.supply || 1;
  return (j.result?.value||[]).slice(0,20).map(a=>({ address:a.address, amount:parseInt(a.amount), pct:(parseInt(a.amount)/total)*100 }));
}
