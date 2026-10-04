// ============================================================
// RUGSENTINEL - Cloudflare Worker
// ============================================================

const CONFIG = {
  HELIUS_API_KEY: 'HELIUS_API_KEY_PLACEHOLDER',
  HELIUS_RPC: 'https://mainnet.helius-rpc.com',
  FETCH_TIMEOUT: 15000
};

const HTML_LINHAS = [
'<!DOCTYPE html>',
'<html lang="pt-BR">',
'<head>',
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
'.avatar{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00ff9d,#00d4ff);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0f}',
'.token-name{font-size:16px;font-weight:800}',
'.token-symbol{font-size:12px;color:#00ff9d;font-family:monospace}',
'.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#2a2a3d}',
'.stat{background:#14141f;padding:12px 14px}',
'.stat-label{font-size:10px;color:#7a7a95;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px}',
'.stat-value{font-size:14px;font-weight:800;font-family:monospace}',
'.section{padding:14px 16px;border-top:1px solid #2a2a3d}',
'.section-title{font-size:11px;color:#7a7a95;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:10px}',
'.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}',
'.row-label{color:#7a7a95}',
'.row-value{font-weight:800;font-family:monospace}',
'.links{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 16px}',
'.link{background:#1c1c2a;border:1px solid #2a2a3d;border-radius:8px;padding:10px;color:#e8e8f0;text-decoration:none;text-align:center;font-size:12px;font-weight:700}',
'.error{background:rgba(255,51,102,.1);border:1px solid rgba(255,51,102,.3);color:#ff3366;padding:14px;border-radius:12px;text-align:center;margin-bottom:16px;display:none}',
'#loading{text-align:center;padding:20px;color:#00ff9d;display:none}',
'</style>',
'</head>',
'<body>',
'<div class="app">',
'<div class="header">',
'<div class="logo">RugSentinel</div>',
'<div class="tagline">PUMP.FUN SCANNER</div>',
'</div>',
'<div class="input-box">',
'<input id="contract" placeholder="Cole o contrato Solana...">',
'<button id="btn" onclick="scan()">Escanear</button>',
'</div>',
'<div id="loading">Consultando...</div>',
'<div id="error" class="error"></div>',
'<div id="result"></div>',
'</div>',
'<script>',
'function fmt(n){if(!n)return "--";if(n>=1e9)return "$"+(n/1e9).toFixed(2)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(2)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(1)+"K";return "$"+n.toFixed(2);}',
'function fmtAge(ts){if(!ts)return "--";var m=Math.floor((Date.now()-ts)/60000);if(m<60)return m+"m";var h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d";}',
'function shortAddr(a){if(!a)return "--";return a.slice(0,6)+"..."+a.slice(-4);}',
'async function scan(){',
'var input=document.getElementById("contract").value.trim();',
'var btn=document.getElementById("btn");',
'var loading=document.getElementById("loading");',
'var error=document.getElementById("error");',
'var result=document.getElementById("result");',
'if(!input){alert("Cole o contrato");return;}',
'btn.disabled=true;loading.style.display="block";error.style.display="none";result.innerHTML="";',
'try{',
'var res=await fetch("/api/scan/"+encodeURIComponent(input));',
'if(!res.ok)throw new Error("Erro: "+res.status);',
'var data=await res.json();',
'if(data.error)throw new Error(data.error);',
'render(data);',
'}catch(e){error.innerText="ERRO: "+e.message;error.style.display="block";}',
'finally{btn.disabled=false;loading.style.display="none";}',
'}',
'function render(data){',
'var pair=data.pair;var sec=data.security;var source=data.securitySource;var helius=data.helius;',
'var age=fmtAge(pair.pairCreatedAt);var ch1=(pair.priceChange&&pair.priceChange.h1)||0;',
'var mc=fmt(pair.fdv||pair.marketCap);var liq=fmt(pair.liquidity&&pair.liquidity.usd);var vol=fmt(pair.volume&&pair.volume.h24);',
'var totalSupply="--",decimals="--",mintAuth="--",freezeAuth="--",creator="--";var holders=[];',
'if(helius&&helius.mintInfo){',
'totalSupply=helius.mintInfo.supply?(helius.mintInfo.supply/Math.pow(10,helius.mintInfo.decimals)).toLocaleString("en-US",{maximumFractionDigits:0}):"--";',
'decimals=helius.mintInfo.decimals||"--";',
'mintAuth=helius.mintInfo.mintAuthority?"ATIVO":"Fechado";',
'freezeAuth=helius.mintInfo.freezeAuthority?"ATIVO":"Fechado";',
'}',
'if(helius&&helius.topHolders&&helius.topHolders.length){holders=helius.topHolders;}',
'if(helius&&helius.creator)creator=shortAddr(helius.creator);',
'var top10="--",lp="--",risks="Nenhum",rugScore=null;',
'if(holders.length){var t10=holders.slice(0,10).reduce(function(a,b){return a+(b.pct||0);},0);top10=t10.toFixed(1)+"%";}',
'if(sec&&source==="rugcheck"){lp=(sec.lpLocked||sec.lpBurned)?"Travada":"Livre";if(sec.risks&&sec.risks.length)risks=sec.risks.map(function(r){return r.name;}).slice(0,3).join(", ");rugScore=sec.score_normalised;}',
'var score=50;',
'if((pair.liquidity&&pair.liquidity.usd||0)>100000)score+=20;else if((pair.liquidity&&pair.liquidity.usd||0)>20000)score+=10;else score-=15;',
'if(rugScore)score=Math.round(rugScore);',
'if(mintAuth==="ATIVO")score-=15;if(freezeAuth==="ATIVO")score-=10;',
'if(top10!=="--"&&parseFloat(top10)>60)score-=15;else if(top10!=="--"&&parseFloat(top10)>40)score-=5;',
'if(lp==="Livre")score-=10;',
'score=Math.max(0,Math.min(100,Math.round(score)));',
'var scoreColor=score>=75?"#00ff9d":score>=50?"#ffaa00":"#ff3366";',
'var symbol=(pair.baseToken&&pair.baseToken.symbol)||"?";var avatar=symbol.slice(0,2).toUpperCase();',
'var ch1Color=ch1>=0?"#00ff9d":"#ff3366";',
'var holdersHTML="";',
'if(holders.length){holdersHTML=holders.slice(0,10).map(function(h,i){var pct=h.pct||0;return "<div class=row><span class=row-label>#"+(i+1)+" "+shortAddr(h.address)+"</span><span class=row-value>"+pct.toFixed(2)+"%</span></div>";}).join("");}',
'else{holdersHTML="<div style=color:#7a7a95;font-size:12px;padding:8px>Sem holders</div>";}',
'var socialLinks="";',
'if(pair.info&&pair.info.socials)pair.info.socials.forEach(function(s){socialLinks+="<a href=\\""+s.url+"\\" target=_blank class=link>"+s.type+"</a>";});',
'if(pair.info&&pair.info.websites)pair.info.websites.forEach(function(w){socialLinks+="<a href=\\""+w.url+"\\" target=_blank class=link>Site</a>";});',
'var html="";',
'html+="<div class=card>";',
'html+="<div class=token-head><div class=avatar>"+avatar+"</div><div><div class=token-name>"+((pair.baseToken&&pair.baseToken.name)||"?")+"</div><div class=token-symbol>$"+symbol+"</div></div><div style=margin-left:auto;padding:6px 12px;border-radius:12px;background:"+scoreColor+";color:#0a0a0f;font-weight:800>"+score+"/100</div></div>";',
'html+="<div class=grid>";',
'html+="<div class=stat><div class=stat-label>Preco 1h</div><div class=stat-value style=color:"+ch1Color+">"+(ch1>=0?"+":"")+ch1.toFixed(1)+"%</div></div>";',
'html+="<div class=stat><div class=stat-label>Idade</div><div class=stat-value>"+age+"</div></div>";',
'html+="<div class=stat><div class=stat-label>MC</div><div class=stat-value>"+mc+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Liquidez</div><div class=stat-value>"+liq+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Vol 24h</div><div class=stat-value>"+vol+"</div></div>";',
'html+="<div class=stat><div class=stat-label>DEX</div><div class=stat-value>"+((pair.dexId||"--").toUpperCase())+"</div></div>";',
'html+="</div>";',
'html+="<div class=section><div class=section-title>Supply</div>";',
'html+="<div class=row><span class=row-label>Total</span><span class=row-value>"+totalSupply+"</span></div>";',
'html+="<div class=row><span class=row-label>Mint Auth</span><span class=row-value>"+mintAuth+"</span></div>";',
'html+="<div class=row><span class=row-label>Freeze Auth</span><span class=row-value>"+freezeAuth+"</span></div>";',
'html+="<div class=row><span class=row-label>Creator</span><span class=row-value>"+creator+"</span></div></div>";',
'html+="<div class=section><div class=section-title>Top Holders</div>"+holdersHTML;',
'html+="<div class=row style=margin-top:8px><span class=row-label>Top 10</span><span class=row-value>"+top10+"</span></div></div>";',
'html+="<div class=section><div class=section-title>Seguranca</div>";',
'html+="<div class=row><span class=row-label>Score RugCheck</span><span class=row-value>"+(rugScore||"--")+"</span></div>";',
'html+="<div class=row><span class=row-label>LP</span><span class=row-value>"+lp+"</span></div>";',
'html+="<div class=row><span class=row-label>Riscos</span><span class=row-value>"+risks+"</span></div></div>";',
'html+="<div class=links>";',
'html+="<a href=https://dexscreener.com/"+pair.chainId+"/"+pair.pairAddress+" target=_blank class=link>DexScreener</a>";',
'html+="<a href=https://rugcheck.xyz/tokens/"+data.contract+" target=_blank class=link>RugCheck</a>";',
'html+="<a href=https://solscan.io/token/"+data.contract+" target=_blank class=link>Solscan</a>";',
'html+="<a href=https://birdeye.so/token/"+data.contract+"?chain=solana" target=_blank class=link>Birdeye</a>";',
'socialLinks',
'html+="</div>";',
'html+="</div>";',
'result.innerHTML=html;',
'}',
'</script>',
'</body>',
'</html>'
];

const HTML_APP = HTML_LINHAS.join('\n');

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
async function fetchComTimeout(url, options, timeout) {
  options = options || {};
  timeout = timeout || CONFIG.FETCH_TIMEOUT;
  var controller = new AbortController();
  var timer = setTimeout(function(){ controller.abort(); }, timeout);
  try {
    var headers = { 'User-Agent': 'RugSentinel/1.0' };
    if (options.headers) {
      for (var k in options.headers) headers[k] = options.headers[k];
    }
    var res = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      signal: controller.signal
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ------------------------------------------------------------
// HELIUS
// ------------------------------------------------------------
async function getMintInfo(mint) {
  var body = {
    jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
    params: [mint, { encoding: 'jsonParsed' }]
  };
  var res = await fetchComTimeout(
    CONFIG.HELIUS_RPC + '/?api-key=' + CONFIG.HELIUS_API_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error('Helius falhou');
  var data = await res.json();
  if (!data.result || !data.result.value || !data.result.value.data || !data.result.value.data.parsed) return null;
  var info = data.result.value.data.parsed.info;
  return {
    supply: parseInt(info.supply || '0'),
    decimals: info.decimals || 0,
    mintAuthority: info.mintAuthority || null,
    freezeAuthority: info.freezeAuthority || null
  };
}

async function getTopHolders(mint, limit) {
  limit = limit || 20;
  var body = {
    jsonrpc: '2.0', id: 1, method: 'getTokenLargestAccounts',
    params: [mint]
  };
  var res = await fetchComTimeout(
    CONFIG.HELIUS_RPC + '/?api-key=' + CONFIG.HELIUS_API_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error('Helius holders falhou');
  var data = await res.json();
  if (!data.result || !data.result.value) return [];
  var mintInfo = await getMintInfo(mint);
  var totalSupply = (mintInfo && mintInfo.supply) || 1;
  return data.result.value.slice(0, limit).map(function(acc) {
    return {
      address: acc.address,
      amount: parseInt(acc.amount || '0'),
      pct: (parseInt(acc.amount || '0') / totalSupply) * 100
    };
  });
}

async function getCreator(mint) {
  try {
    var body = { jsonrpc: '2.0', id: 1, method: 'getAsset', params: { id: mint } };
    var res = await fetchComTimeout(
      CONFIG.HELIUS_RPC + '/?api-key=' + CONFIG.HELIUS_API_KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) return null;
    var data = await res.json();
    var creators = (data.result && data.result.creators) || [];
    var creator = creators.find(function(c){ return c.verified; }) || creators[0];
    return (creator && creator.address) || null;
  } catch (e) { return null; }
}

// ------------------------------------------------------------
// CORE
// ------------------------------------------------------------
async function analisarToken(contract) {
  var solana = !contract.startsWith('0x');
  var dexRes = await fetchComTimeout(
    'https://api.dexscreener.com/latest/dex/search?q=' + encodeURIComponent(contract)
  );
  if (!dexRes.ok) throw new Error('DexScreener nao respondeu');
  var dexData = await dexRes.json();
  if (!dexData.pairs || !dexData.pairs.length) throw new Error('Token nao encontrado');
  var pair = dexData.pairs.sort(function(a, b) {
    return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0);
  })[0];

  var heliusData = null;
  if (solana && CONFIG.HELIUS_API_KEY && CONFIG.HELIUS_API_KEY !== 'HELIUS_API_KEY_PLACEHOLDER') {
    try {
      var mintInfo = await getMintInfo(contract).catch(function(){ return null; });
      var topHolders = await getTopHolders(contract, 20).catch(function(){ return []; });
      var creator = await getCreator(contract).catch(function(){ return null; });
      heliusData = { mintInfo: mintInfo, topHolders: topHolders, creator: creator };
    } catch (e) { console.log('Helius erro:', e.message); }
  }

  var security = null;
  var securitySource = null;
  if (solana) {
    try {
      var rugRes = await fetchComTimeout('https://api.rugcheck.xyz/v1/tokens/' + contract + '/report');
      if (rugRes.ok) {
        var text = await rugRes.text();
        if (text.startsWith('{')) {
          security = JSON.parse(text);
          securitySource = 'rugcheck';
        }
      }
    } catch (e) { console.log('RugCheck erro'); }
  }

  return {
    success: true, contract: contract, isSolana: solana,
    pair: pair, security: security, securitySource: securitySource, helius: heliusData
  };
}

// ------------------------------------------------------------
// ROTEAMENTO
// ------------------------------------------------------------
export default {
  async fetch(request) {
    var url = new URL(request.url);
    var path = url.pathname;
    var corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (path === '/' || path === '/index.html') {
      return new Response(HTML_APP, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (path.indexOf('/api/scan/') === 0) {
      var contract = decodeURIComponent(path.replace('/api/scan/', ''));
      if (!contract) {
        return new Response(JSON.stringify({ error: 'Contrato vazio' }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      try {
        var result = await analisarToken(contract);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    return new Response(JSON.stringify({ error: 'Rota nao encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
