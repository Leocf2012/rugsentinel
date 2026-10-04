// ============================================================
// RUGSENTINEL - Cloudflare Worker
// ============================================================

const HELIUS_KEY = 'HELIUS_API_KEY_PLACEHOLDER';
const HELIUS_RPC = 'https://mainnet.helius-rpc.com';

const HTML_APP = [
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
'function fmt(n){if(!n)return "--";if(n>=1e9)return "$"+(n/1e9).toFixed(2)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(2)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(1)+"K";return "$"+Number(n).toFixed(2);}',
'function fmtAge(ts){if(!ts)return "--";var m=Math.floor((Date.now()-ts)/60000);if(m<60)return m+"m";var h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d";}',
'function shortAddr(a){if(!a)return "--";return a.slice(0,6)+"..."+a.slice(-4);}',
'async function scan(){',
'var inp=document.getElementById("contract");',
'var btn=document.getElementById("btn");',
'var loading=document.getElementById("loading");',
'var errorBox=document.getElementById("error");',
'var result=document.getElementById("result");',
'var c=inp.value.trim();',
'if(!c){alert("Cole o contrato");return;}',
'btn.disabled=true;loading.style.display="block";errorBox.style.display="none";result.innerHTML="";',
'try{',
'var r=await fetch("/api/scan/"+encodeURIComponent(c));',
'if(!r.ok)throw new Error("Servidor retornou "+r.status);',
'var data=await r.json();',
'if(data.error)throw new Error(data.error);',
'render(data);',
'}catch(e){errorBox.textContent="ERRO: "+e.message;errorBox.style.display="block";}',
'finally{btn.disabled=false;loading.style.display="none";}',
'}',
'function render(data){',
'var p=data.pair;',
'var sym=(p.baseToken&&p.baseToken.symbol)?p.baseToken.symbol:"?";',
'var name=(p.baseToken&&p.baseToken.name)?p.baseToken.name:"Desconhecido";',
'var price=p.priceUsd?Number(p.priceUsd).toFixed(4):"--";',
'var mc=fmt(p.fdv||p.marketCap);',
'var liq=fmt(p.liquidity&&p.liquidity.usd);',
'var vol=fmt(p.volume&&p.volume.h24);',
'var age=fmtAge(p.pairCreatedAt);',
'var ch=(p.priceChange&&p.priceChange.h24)?Number(p.priceChange.h24).toFixed(1):"0";',
'var chSign=ch>=0?"+":"";',
'var chColor=ch>=0?"#00ff9d":"#ff3366";',
'var html="";',
'html+="<div class=card>";',
'html+="<div class=token-head><div class=avatar>"+sym.slice(0,2).toUpperCase()+"</div><div><div class=token-name>"+name+"</div><div class=token-symbol>"+sym+"</div></div></div>";',
'html+="<div class=grid>";',
'html+="<div class=stat><div class=stat-label>Preco USD</div><div class=stat-value>$"+price+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Variacao 24h</div><div class=stat-value style=color:"+chColor+">"+chSign+ch+"%</div></div>";',
'html+="<div class=stat><div class=stat-label>Idade</div><div class=stat-value>"+age+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Market Cap</div><div class=stat-value>"+mc+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Liquidez</div><div class=stat-value>"+liq+"</div></div>";',
'html+="<div class=stat><div class=stat-label>Volume 24h</div><div class=stat-value>"+vol+"</div></div>";',
'html+="</div>";',
'html+="<div class=links>";',
'html+="<a href=https://dexscreener.com/solana/"+p.pairAddress+" target=_blank class=link>DexScreener</a>";',
'html+="<a href=https://rugcheck.xyz/tokens/"+data.contract+" target=_blank class=link>RugCheck</a>";',
'html+="<a href=https://solscan.io/token/"+data.contract+" target=_blank class=link>Solscan</a>";',
'html+="<a href=https://birdeye.so/token/"+data.contract+"?chain=solana" target=_blank class=link>Birdeye</a>";',
'html+="</div>";',
'html+="</div>";',
'result.innerHTML=html;',
'}',
'</script>',
'</body>',
'</html>'
].join('');

// ============================================================
// UTILITÁRIOS
// ============================================================
async function fetchComTimeout(url, options, timeout) {
  options = options || {};
  timeout = timeout || 15000;
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

// ============================================================
// HELIUS
// ============================================================
async function getMintInfo(mint) {
  var body = {
    jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
    params: [mint, { encoding: 'jsonParsed' }]
  };
  var res = await fetchComTimeout(
    HELIUS_RPC + '/?api-key=' + HELIUS_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) return null;
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
    HELIUS_RPC + '/?api-key=' + HELIUS_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) return [];
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
      HELIUS_RPC + '/?api-key=' + HELIUS_KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) return null;
    var data = await res.json();
    var creators = (data.result && data.result.creators) || [];
    var creator = creators.find(function(c){ return c.verified; }) || creators[0];
    return (creator && creator.address) || null;
  } catch (e) { return null; }
}

// ============================================================
// ANÁLISE
// ============================================================
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
  if (solana && HELIUS_KEY && HELIUS_KEY !== 'HELIUS_API_KEY_PLACEHOLDER') {
    try {
      var mintInfo = await getMintInfo(contract).catch(function(){ return null; });
      var topHolders = await getTopHolders(contract, 20).catch(function(){ return []; });
      var creator = await getCreator(contract).catch(function(){ return null; });
      heliusData = { mintInfo: mintInfo, topHolders: topHolders, creator: creator };
    } catch (e) {}
  }

  var security = null;
  if (solana) {
    try {
      var rugRes = await fetchComTimeout('https://api.rugcheck.xyz/v1/tokens/' + contract + '/report');
      if (rugRes.ok) {
        var text = await rugRes.text();
        if (text.startsWith('{')) security = JSON.parse(text);
      }
    } catch (e) {}
  }

  return {
    success: true,
    contract: contract,
    pair: pair,
    helius: heliusData,
    security: security
  };
}

// ============================================================
// ROTEAMENTO
// ============================================================
export default {
  async fetch(request) {
    var url = new URL(request.url);
    var path = url.pathname;

    if (path === '/' || path === '/index.html') {
      return new Response(HTML_APP, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (path.indexOf('/api/scan/') === 0) {
      var contract = decodeURIComponent(path.replace('/api/scan/', ''));
      if (!contract) {
        return new Response(JSON.stringify({ error: 'Contrato vazio' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        var result = await analisarToken(contract);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Rota nao encontrada', { status: 404 });
  }
};
