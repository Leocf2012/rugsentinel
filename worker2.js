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
        var res = await fetch('https://api.dexscreener.com/latest/dex/search?q=' + encodeURIComponent(contract));
        var data = await res.json();
        if (!data.pairs || !data.pairs.length) {
          return new Response(JSON.stringify({ error: 'Token nao encontrado' }), {
            status: 404, headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true, pair: data.pairs[0], contract: contract }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Rota nao encontrada', { status: 404 });
  }
};

const HTML_APP = '<!DOCTYPE html>' +
'<html><head>' +
'<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>RugSentinel Teste</title>' +
'<style>' +
'body{background:#0a0a0f;color:#e8e8f0;font-family:-apple-system,sans-serif;padding:20px;margin:0}' +
'.app{max-width:480px;margin:0 auto}' +
'h1{text-align:center;color:#00ff9d}' +
'input{width:100%;padding:14px;border-radius:12px;border:1px solid #2a2a3d;background:#14141f;color:#fff;font-family:monospace;outline:none;box-sizing:border-box;margin-bottom:10px}' +
'button{width:100%;padding:14px;border-radius:12px;border:none;background:#00ff9d;color:#0a0a0f;font-weight:800;cursor:pointer;font-size:16px}' +
'#resultado{margin-top:20px;padding:16px;background:#14141f;border-radius:12px;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;min-height:100px}' +
'</style></head><body>' +
'<div class="app">' +
'<h1>RugSentinel - Teste</h1>' +
'<input id="contract" placeholder="Cole o contrato Solana...">' +
'<button onclick="scan()">Escanear</button>' +
'<div id="resultado">Aguardando...</div>' +
'</div>' +
'<script>' +
'async function scan(){' +
'var r=document.getElementById("resultado");' +
'var c=document.getElementById("contract").value.trim();' +
'if(!c){r.textContent="Cole um contrato";return;}' +
'r.textContent="1. Buscando dados...";' +
'try{' +
'var res=await fetch("/api/scan/"+encodeURIComponent(c));' +
'r.textContent="2. Status: "+res.status+". Lendo resposta...";' +
'var txt=await res.text();' +
'r.textContent="3. Resposta ("+txt.length+" chars). Parse...";' +
'var data=JSON.parse(txt);' +
'r.textContent="4. OK! Dados:\\n\\n"+JSON.stringify(data,null,2).slice(0,800);' +
'}catch(e){' +
'r.textContent="ERRO: "+e.message;' +
'}' +
'}' +
'</script></body></html>';
