export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // ⚠️ COLE SUA CHAVE HELIUS AQUI (entre as aspas)
    const HELIUS_KEY = '17c095a4-64a0-4a09-a544-f2f9905bff0c';
    const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=' + HELIUS_KEY;

    const HTML_APP = getHTML();

    if (path === "/" || path === "/index.html") {
      return new Response(HTML_APP, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path.startsWith("/api/scan/")) {
      const contract = decodeURIComponent(path.replace("/api/scan/", ""));
      if (!contract) return json({ error: "Contrato vazio" }, 400);
      try {
        const result = await analisarToken(contract, HELIUS_RPC, HELIUS_KEY);
        return json(result);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }
    return new Response("Not found", { status: 404 });
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

async function analisarToken(contract, HELIUS_RPC, HELIUS_KEY) {
  const dexRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=' + encodeURIComponent(contract));
  if (!dexRes.ok) throw new Error("DexScreener off");
  const dexData = await dexRes.json();
  if (!dexData.pairs || !dexData.pairs.length) throw new Error("Token não encontrado");
  const pair = dexData.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

  let heliusData = null;
  let heliusErro = null;
  if (HELIUS_KEY && HELIUS_KEY !== 'COLE_SUA_CHAVE_HELIUS_AQUI') {
    try {
      const mintInfo = await getMintInfo(contract, HELIUS_RPC);
      const topHolders = await getTopHolders(contract, HELIUS_RPC, mintInfo);
      const creator = await getCreator(contract, HELIUS_RPC);
      heliusData = { mintInfo, topHolders, creator };
    } catch (e) { 
      heliusErro = e.message; 
    }
  } else {
    heliusErro = 'Chave Helius nao configurada';
  }

  let security = null;
  try {
    const rugRes = await fetch('https://api.rugcheck.xyz/v1/tokens/' + contract + '/report');
    if (rugRes.ok) security = await rugRes.json();
  } catch (e) {}

  return { contract, pair, helius: heliusData, heliusErro, security };
}

async function getMintInfo(mint, rpc) {
  const r = await fetch(rpc, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [mint, { encoding: "jsonParsed" }] })
  });
  const j = await r.json();
  if (j.error) throw new Error('Helius getAccountInfo: ' + (j.error.message || 'erro'));
  const info = j.result?.value?.data?.parsed?.info;
  if (!info) throw new Error('Helius: mint info nao encontrado');
  return { supply: parseInt(info.supply), decimals: info.decimals, mintAuthority: info.mintAuthority, freezeAuthority: info.freezeAuthority };
}

async function getTopHolders(mint, rpc, mintInfo) {
  const r = await fetch(rpc, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenLargestAccounts", params: [mint] })
  });
  const j = await r.json();
  if (j.error) throw new Error('Helius getTopHolders: ' + (j.error.message || 'erro'));
  const total = mintInfo?.supply || 1;
  return (j.result?.value || []).slice(0, 20).map(a => ({ address: a.address, amount: parseInt(a.amount), pct: (parseInt(a.amount) / total) * 100 }));
}

async function getCreator(mint, rpc) {
  try {
    const r = await fetch(rpc, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAsset", params: { id: mint } })
    });
    const j = await r.json();
    const cs = j.result?.creators || [];
    const c = cs.find(x => x.verified) || cs[0];
    return c?.address || null;
  } catch (e) { return null; }
}

function getHTML() {
  return [
'<!DOCTYPE html>',
'<html lang="pt-BR"><head>',
'<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>RugSentinel</title>',
'<style>',
'*{box-sizing:border-box;margin:0;padding:0}',
'body{background:#0a0a0f;color:#e8e8f0;font-family:-apple-system,sans-serif;min-height:100vh;padding:20px}',
'.app{max-width:480px;margin:0 auto}',
'.header{text-align:center;padding:20px 0;border-bottom:1px solid #2a2a3d;margin-bottom:20px}',
'.logo{font-size:24px;font-weight:900;background:linear-gradient(135deg,#00ff9d,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}',
'.tagline{font-size:11px;color:#7a7a95;letter-spacing:2px;margin-top:4px}',
'.input-box{display:flex;gap:8px;margin-bottom:16px}',
'input{flex:1;padding:14px;border-radius:12px;border:1px solid #2a2a3d;background:#14141f;color:#fff;font-family:monospace;outline:none;min-width:0}',
'button{padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#00ff9d,#00d4ff);color:#0a0a0f;font-weight:800;cursor:pointer}',
'button:disabled{opacity:.5}',
'.card{background:#14141f;border:1px solid #2a2a3d;border-radius:16px;overflow:hidden;margin-top:16px}',
'.token-head{padding:16px;background:linear-gradient(135deg,rgba(0,255,157,.08),rgba(0,212,255,.05));display:flex;align-items:center;gap:12px}',
'.avatar{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00ff9d,#00d4ff);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#0a0a0f;flex-shrink:0}',
'.tname{font-weight:800;font-size:15px}',
'.tsym{color:#00ff9d;font-family:monospace;font-size:12px}',
'.badge{padding:6px 12px;border-radius:12px;font-size:12px;font-weight:800;flex-shrink:0}',
'.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#2a2a3d}',
'.stat{background:#14141f;padding:12px 14px}',
'.stat-label{font-size:10px;color:#7a7a95;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px}',
'.stat-value{font-size:14px;font-weight:800;font-family:monospace}',
'.section{padding:14px 16px;border-top:1px solid #2a2a3d}',
'.section-title{font-size:11px;color:#7a7a95;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:10px}',
'.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid rgba(42,42,61,.4)}',
'.row:last-child{border-bottom:none}',
'.row-label{color:#7a7a95}',
'.row-value{font-weight:800;font-family:monospace;font-size:12px}',
'.links{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px}',
'.link{background:#1c1c2a;border:1px solid #2a2a3d;border-radius:8px;padding:10px;color:#e8e8f0;text-decoration:none;text-align:center;font-size:12px;font-weight:700}',
'.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 14px}',
'.btn-save{background:rgba(0,255,157,.15);color:#00ff9d;border:1px solid rgba(0,255,157,.4);padding:12px;border-radius:10px;font-weight:800;cursor:pointer}',
'.btn-ignore{background:rgba(255,51,102,.15);color:#ff3366;border:1px solid rgba(255,51,102,.4);padding:12px;border-radius:10px;font-weight:800;cursor:pointer}',
'.error{background:rgba(255,51,102,.1);border:1px solid rgba(255,51,102,.3);color:#ff3366;padding:14px;border-radius:12px;text-align:center;display:none;margin-bottom:16px}',
'#loading{text-align:center;padding:20px;color:#00ff9d;display:none}',
'.debug{color:#00ff9d;font-family:monospace;font-size:11px;padding:8px;background:rgba(0,255,157,.05);border-radius:8px;margin-top:10px}',
'.ignored{background:#14141f;border:1px solid #2a2a3d;border-radius:12px;padding:14px;margin-top:16px}',
'.ignored-title{font-size:11px;color:#7a7a95;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:10px}',
'.ignored-item{display:flex;justify-content:space-between;padding:8px;background:#1c1c2a;border-radius:6px;margin-bottom:6px;font-size:12px}',
'</style></head>',
'<body><div class="app">',
'<div class="header"><div class="logo">RugSentinel</div><div class="tagline">PUMP.FUN SCANNER</div></div>',
'<div class="input-box"><input id="contract" placeholder="Cole contrato Solana..."><button id="btn" onclick="scan()">Escanear</button></div>',
'<div id="loading">Consultando DexScreener + Helius + RugCheck...</div>',
'<div id="error" class="error"></div>',
'<div id="result"></div>',
'<div id="ignoredBox" class="ignored" style="display:none"><div class="ignored-title">Tokens Ignorados</div><div id="ignoredList"></div></div>',
'</div>',
'<script>',
'function fmt(n){if(!n||n===0)return "--";if(n>=1e9)return "$"+(n/1e9).toFixed(2)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(2)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(1)+"K";return "$"+Number(n).toFixed(2);}',
'function fmtAge(ts){if(!ts)return "--";var m=Math.floor((Date.now()-ts)/60000);if(m<60)return m+"m";var h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d";}',
'function shortAddr(a){if(!a)return "--";return a.slice(0,6)+"..."+a.slice(-4);}',
'function getIgnored(){try{return JSON.parse(localStorage.getItem("rug_ignored")||"[]");}catch(e){return [];}}',
'function saveIgnored(list){localStorage.setItem("rug_ignored",JSON.stringify(list));}',
'function renderIgnored(){var list=getIgnored();var box=document.getElementById("ignoredBox");var el=document.getElementById("ignoredList");if(!list.length){box.style.display="none";return;}box.style.display="block";el.innerHTML=list.map(function(i){return "<div class=ignored-item><span style=font-weight:800>$"+i.symbol+"</span><span style=color:#7a7a95;font-family:monospace>"+shortAddr(i.contract)+"</span></div>";}).join("");}',
'async function scan(){',
'var c=document.getElementById("contract").value.trim();',
'if(!c){alert("Cole o contrato");return;}',
'var btn=document.getElementById("btn"),ld=document.getElementById("loading"),err=document.getElementById("error"),res=document.getElementById("result");',
'btn.disabled=true;ld.style.display="block";err.style.display="none";res.innerHTML="";',
'try{',
'  var r=await fetch("/api/scan/"+encodeURIComponent(c));',
'  var txt=await r.text();',
'  res.innerHTML="<div class=debug>1. STATUS: "+r.status+" | CHARS: "+txt.length+"</div>";',
'  var data=JSON.parse(txt);',
'  res.innerHTML+="<div class=debug>2. PARSE OK | TEM pair? "+(data.pair?"SIM":"NAO")+" | TEM helius? "+(data.helius?"SIM":"NAO")+"</div>";',
'  render(data);',
'  res.innerHTML+="<div class=debug>3. RENDER executado</div>";',
'}catch(e){',
'  err.textContent="ERRO: "+e.message;',
'  err.style.display="block";',
'}finally{btn.disabled=false;ld.style.display="none";}',
'}',
'function render(d){',
'var p=d.pair;var s=d.security;var h=d.helius;',
'var sym=(p.baseToken&&p.baseToken.symbol)||"?";',
'var name=(p.baseToken&&p.baseToken.name)||"Desconhecido";',
'var score=50;',
'if(s&&s.score_normalised!==undefined)score=Math.round(s.score_normalised);',
'else if(s&&s.score!==undefined)score=Math.round(s.score);',
'var top10=0;',
'if(h&&h.topHolders&&h.topHolders.length){top10=h.topHolders.slice(0,10).reduce(function(a,b){return a+(b.pct||0);},0);}',
'else if(s&&s.topHolders&&s.topHolders.length){top10=s.topHolders.slice(0,10).reduce(function(a,b){return a+(b.pct||0);},0);}',
'var mintAuth=(h&&h.mintInfo&&h.mintInfo.mintAuthority)?"ATIVO":"Fechado";',
'var freezeAuth=(h&&h.mintInfo&&h.mintInfo.freezeAuthority)?"ATIVO":"Fechado";',
'var creator=(s&&s.creator)||(h&&h.creator)||"--";',
'var supply="--";',
'if(h&&h.mintInfo&&h.mintInfo.supply&&h.mintInfo.supply>0){supply=(h.mintInfo.supply/Math.pow(10,h.mintInfo.decimals||0)).toLocaleString("en-US",{maximumFractionDigits:0});}',
'var totalHolders=(s&&s.totalHolders)||(h&&h.topHolders&&h.topHolders.length)||"--";',
'if(top10>60)score-=15;else if(top10>40)score-=5;',
'if(mintAuth==="ATIVO")score-=20;',
'if(freezeAuth==="ATIVO")score-=15;',
'if((p.liquidity&&p.liquidity.usd||0)<20000)score-=15;',
'if(s&&s.risks&&s.risks.length)score-=s.risks.length*5;',
'score=Math.max(0,Math.min(100,score));',
'var scoreColor=score>=75?"#00ff9d":score>=50?"#ffaa00":"#ff3366";',
'var ch=(p.priceChange&&p.priceChange.h24)||0;',
'var chSign=ch>=0?"+":"";',
'var chColor=ch>=0?"#00ff9d":"#ff3366";',
'var html="";',
'html+="<div class=card>";',
'html+="<div class=token-head><div class=avatar>"+sym.slice(0,2).toUpperCase()+"</div><div style=flex:1><div class=tname>"+name+"</div><div class=tsym>$"+sym+"</div></div><div class=badge style=background:"+scoreColor+"22;color:"+scoreColor+";border:1px solid "+scoreColor+"55>"+score+"/100</div></div>";',
'html+="<div class=grid>";',
'html+="<div class=stat><div class=stat-label>Preco USD</div><div class=stat-value>"+(p.priceUsd?"$"+Number(p.priceUsd).toFixed(6):"--")+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Variacao 24h</div><div class=stat-value style=color:"+chColor+">"+chSign+Number(ch).toFixed(1)+"%</div></div>";',
'html+="<div class=stat><div class=stat-label>Market Cap</div><div class=stat-value>"+fmt(p.fdv||p.marketCap)+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Idade</div><div class=stat-value>"+fmtAge(p.pairCreatedAt)+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Liquidez</div><div class=stat-value>"+fmt(p.liquidity&&p.liquidity.usd)+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Vol 24h</div><div class=stat-value>"+fmt(p.volume&&p.volume.h24)+"</div></div>";',
'html+="</div>";',
'html+="<div class=section><div class=section-title>Seguranca</div>";',
'html+="<div class=row><span class=row-label>Holders</span><span class=row-value>"+totalHolders+"</span></div>";',
'html+="<div class=row><span class=row-label>Top 10</span><span class=row-value style=color:"+(top10>40?"#ff3366":"#00ff9d")+">"+top10.toFixed(1)+"%</span></div>";',
'html+="<div class=row><span class=row-label>Mint Authority</span><span class=row-value style=color:"+(mintAuth==="ATIVO"?"#ff3366":"#00ff9d")+">"+mintAuth+"</span></div>";',
'html+="<div class=row><span class=row-label>Freeze Authority</span><span class=row-value style=color:"+(freezeAuth==="ATIVO"?"#ff3366":"#00ff9d")+">"+freezeAuth+"</span></div>";',
'html+="<div class=row><span class=row-label>Supply</span><span class=row-value>"+supply+"</span></div>";',
'html+="<div class=row><span class=row-label>Creator</span><span class=row-value>"+shortAddr(creator)+"</span></div>";',
'html+="</div>";',
'if(s&&s.risks&&s.risks.length){',
'html+="<div class=section><div class=section-title>Riscos Detectados</div>";',
's.risks.slice(0,5).forEach(function(r){html+="<div class=row><span class=row-label>"+r.name+"</span><span class=row-value style=color:#ffaa00>"+r.level+"</span></div>";});',
'html+="</div>";',
'}',
'var socials="";',
'if(p.info&&p.info.socials)p.info.socials.forEach(function(x){socials+="<a href="+x.url+" target=_blank class=link>"+x.type+"</a>";});',
'if(p.info&&p.info.websites)p.info.websites.forEach(function(x){socials+="<a href="+x.url+" target=_blank class=link>Site</a>";});',
'html+="<div class=links>";',
'html+="<a href=https://dexscreener.com/solana/"+p.pairAddress+" target=_blank class=link>DexScreener</a>";',
'html+="<a href=https://rugcheck.xyz/tokens/"+d.contract+" target=_blank class=link>RugCheck</a>";',
'html+="<a href=https://solscan.io/token/"+d.contract+" target=_blank class=link>Solscan</a>";',
'html+="<a href=https://birdeye.so/token/"+d.contract+"?chain=solana" target=_blank class=link>Birdeye</a>";',
'html+="<a href=https://bubblemaps.io/map?address="+d.contract+" target=_blank class=link>Bubblemaps</a>";',
'html+="<a href=https://pump.fun/coin/"+d.contract+" target=_blank class=link>Pump.fun</a>";',
'socials;',
'html+="</div>";',
'html+="<div class=actions>";',
'html+="<button class=btn-save onclick=\\"saveToken(\\x27"+d.contract+"\\x27,\\x27"+sym+"\\x27)\\">Salvar</button>";',
'html+="<button class=btn-ignore onclick=\\"ignoreToken(\\x27"+d.contract+"\\x27,\\x27"+sym+"\\x27)\\">Ignorar</button>";',
'html+="</div>";',
'html+="</div>";',
'document.getElementById("result").innerHTML=html;',
'}',
'function saveToken(c,sym){var list=[];try{list=JSON.parse(localStorage.getItem("rug_saved")||"[]");}catch(e){}if(!list.some(function(i){return i.contract===c;}))list.push({contract:c,symbol:sym,date:Date.now()});localStorage.setItem("rug_saved",JSON.stringify(list));alert("Salvo!");}',
'function ignoreToken(c,sym){var list=getIgnored();if(!list.some(function(i){return i.contract===c;}))list.push({contract:c,symbol:sym,date:Date.now()});saveIgnored(list);document.getElementById("result").innerHTML="";document.getElementById("contract").value="";renderIgnored();alert("Ignorado!");}',
'renderIgnored();',
'</script></body></html>'
].join('');
    }
