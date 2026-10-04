export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const HELIUS_KEY = env.HELIUS_KEY || env.HELIUS_API_KEY;
    const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

    if (url.pathname === "/api/real") {
      const address = url.searchParams.get("address");
      if (!address) {
        return Response.json({ error: "Endereço do token não fornecido" }, { status: 400 });
      }

      try {
        // 1. Requisições em Paralelo para Máxima Performance
        const [dexRes, rugRes, supplyRes, largestRes] = await Promise.allSettled([
          fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`),
          fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`),
          fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [address] })
          }),
          fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getTokenLargestAccounts", params: [address] })
          })
        ]);

        // Processar DexScreener
        const dexData = dexRes.status === "fulfilled" ? await dexRes.value.json() : null;
        const pair = dexData?.pairs?.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        if (!pair) {
          return Response.json({ error: "Token não encontrado no DexScreener" }, { status: 404 });
        }

        // Processar RugCheck
        const rug = rugRes.status === "fulfilled" && rugRes.value.ok ? await rugRes.value.json() : null;

        // Processar Helius RPC (Supply e Top Accounts)
        const supplyJson = supplyRes.status === "fulfilled" ? await supplyRes.value.json() : null;
        const largestJson = largestRes.status === "fulfilled" ? await largestRes.value.json() : null;

        const totalSupply = supplyJson?.result?.value?.uiAmount || 1;
        const largestAccounts = largestJson?.result?.value || [];

        // 2. Cálculos On-Chain Reais
        // Top 10 Holders %
        const top10Amount = largestAccounts.slice(0, 10).reduce((acc, accnt) => acc + (accnt.uiAmount || 0), 0);
        const top10PctReal = (top10Amount / totalSupply) * 100;

        // Endereços de Queima (Burnt)
        const burnAddresses = ["11111111111111111111111111111111", "ncinerator11111111111111111111111111111111"];
        let burntAmount = 0;
        largestAccounts.forEach(acc => {
          if (burnAddresses.includes(acc.address)) {
            burntAmount += (acc.uiAmount || 0);
          }
        });
        const burntPctReal = (burntAmount / totalSupply) * 100;

        // Dev e Bundles via RugCheck
        const devAddress = rug?.creator || null;
        const topHolders = rug?.topHolders || [];

        let devPctReal = 0;
        let devSoldReal = 0;
        let bundledPctReal = 0;
        let first20PctReal = 0;

        if (topHolders.length > 0) {
          // Dev %
          const devHolder = topHolders.find(h => h.address === devAddress);
          devPctReal = devHolder ? (devHolder.pct || 0) : 0;

          // Bundled % (Holders identificados como insiders/bundled)
          bundledPctReal = topHolders
            .filter(h => h.insider || h.isInsider)
            .reduce((acc, h) => acc + (h.pct || 0), 0);

          // Primeiras 20 Carteiras %
          first20PctReal = topHolders.slice(0, 20).reduce((acc, h) => acc + (h.pct || 0), 0);

          // Dev Status de Venda
          devSoldReal = (devHolder && devHolder.pct < 0.1) ? 100 : Math.max(0, 100 - (devPctReal * 10));
        }

        // 3. Buscar Saldo em SOL do Dev via Helius (Se o Dev for localizado)
        let devSolBalance = 0;
        if (devAddress && HELIUS_KEY) {
          try {
            const devBalRes = await fetch(RPC, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "getBalance", params: [devAddress] })
            });
            const devBalJson = await devBalRes.json();
            devSolBalance = (devBalJson.result?.value || 0) / 1e9; // Convert de Lamports para SOL
          } catch {}
        }

        // 4. Métrica de Mídia / Anúncios e Volumes
        const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
        const ageH = Math.floor(ageMs / 3600000);
        const liqSol = pair.liquidity?.base ? (pair.liquidity.base / 1e9).toFixed(0) : Math.floor((pair.liquidity?.usd || 0) / 150);
        const vol1h = pair.volume?.h1 || 0;
        
        // Estimativa de Volume Anômalo baseada em Variação/Liquidez
        const volLiquidityRatio = pair.liquidity?.usd ? (vol1h / pair.liquidity.usd) : 0;
        const fakeVolPctReal = volLiquidityRatio > 5 ? Math.min(40, (volLiquidityRatio - 5) * 2) : 0;
        const fakeVolUsdReal = vol1h * (fakeVolPctReal / 100);

        const totalHoldersCount = rug?.totalHolders || largestAccounts.length || 0;

        return Response.json({
          pair,
          rug,
          real: {
            age: ageH > 0 ? `${ageH}h` : '< 1h',
            ageChange: ageH > 24 ? 'Estável' : 'Recente ⚡',
            mc: pair.fdv || pair.marketCap || 0,
            topMc: (pair.fdv || pair.marketCap || 0) * 1.2,
            liqUsd: pair.liquidity?.usd || 0,
            liqSol,
            volUsd: vol1h,
            fakeVolUsd: fakeVolUsdReal,
            fakeVolPct: fakeVolPctReal,
            dexPaid: pair.boosts?.active > 0 || pair.info?.header ? true : false,
            ads: pair.boosts?.active || 0,
            scans: rug?.score || 0,
            hodls: totalHoldersCount,
            top: top10PctReal.toFixed(1) + '%',
            fakeHolders: Math.floor(totalHoldersCount * (bundledPctReal / 100)),
            fakeHoldersPct: bundledPctReal.toFixed(1),
            bundles: {
              count: topHolders.filter(h => h.insider).length,
              pct: bundledPctReal.toFixed(1),
              now: devPctReal.toFixed(1)
            },
            first20: {
              pct: first20PctReal.toFixed(1),
              now: top10PctReal.toFixed(1),
              bundle: bundledPctReal.toFixed(1),
              fresh: Math.max(0, 100 - first20PctReal).toFixed(1)
            },
            dev: {
              address: devAddress,
              sol: devSolBalance.toFixed(2),
              pct: devPctReal.toFixed(1),
              bundled: bundledPctReal.toFixed(1),
              sold: devSoldReal.toFixed(0),
              airdrop: (rug?.airdropPct || 0).toFixed(1),
              burnt: burntPctReal.toFixed(1)
            },
            address
          }
        }, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });

      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // --- INTERFACE FRONTEND (HTML/JS) ---
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RugSentinel V4 Real Data</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background: #0b0f19; color: #f1f5f9; font-family: Inter, sans-serif; }
    .card { background: #151c2c; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; max-width: 440px; margin: 0 auto; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="p-3">
  <div class="card shadow-2xl overflow-hidden">
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white text-center">
      <div class="text-[20px] font-black"><i class="fa-solid fa-shield-halved"></i> RugSentinel V4 REAL</div>
      <div class="text-[11px] opacity-80">Dados On-Chain em Tempo Real via Helius API</div>
    </div>
    
    <div class="p-4 space-y-3">
      <div class="flex gap-2">
        <input id="tokenInput" class="mono w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500" value="HmkiLg8BQnXMexzKJYFsMjbq82SfcqFXXfJ78CYypump">
        <button onclick="scan()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-4 transition"><i class="fa-solid fa-search"></i></button>
      </div>
      <div id="result" class="text-[13px] leading-[1.6]">Insira um contrato da Solana e clique na lupa...</div>
    </div>
  </div>

<script>
function fmt(n){
  if(!n) return '$0';
  if(n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if(n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if(n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

async function scan(){
  const addr = document.getElementById('tokenInput').value.trim();
  if(!addr) return;
  document.getElementById('result').innerHTML = '<div class="text-center py-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-xl mb-2"></i><br>Analisando blocos na Helius RPC...</div>';
  
  try {
    const res = await fetch('/api/real?address=' + encodeURIComponent(addr));
    const data = await res.json();
    if(data.error) throw new Error(data.error);

    const r = data.real;
    const pair = data.pair;

    let html = \`
      <div class="font-bold text-[15px] text-white flex items-center justify-between">
        <span>💊 \${pair.baseToken?.name || 'Token'} (\${pair.baseToken?.symbol || ''})</span>
        <span class="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">\${r.age}</span>
      </div>

      \${r.dev.bundled > 20 ? \`<div class="bg-rose-500/10 border-l-4 border-rose-500 px-2.5 py-1 text-[12px] rounded text-rose-400 font-bold mt-2">🚨 Alta Suspeita de Bundled: \${r.dev.bundled}%</div>\` : ''}

      <div class="grid grid-cols-2 gap-2 mt-3 text-[12px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div>💰 <b>MC:</b> \${fmt(r.mc)}</div>
        <div>💧 <b>Liq:</b> \${fmt(r.liqUsd)} (\${r.liqSol} SOL)</div>
        <div>📊 <b>Vol 1h:</b> \${fmt(r.volUsd)}</div>
        <div>👥 <b>Holders:</b> \${r.hodls}</div>
      </div>

      <div class="mt-3 border-t border-slate-800 pt-2 text-[12px] space-y-1">
        <div>🦅 <b>DexStatus:</b> \${r.dexPaid ? '<span class="text-emerald-400 font-bold">Paid ✅</span>' : '<span class="text-slate-500">Unpaid ❌</span>'}</div>
        <div>👥 <b>Top 10 Holders:</b> \${r.top} do Suprimento</div>
        <div>📦 <b>Bundles Detectados:</b> \${r.bundles.count} carteiras (\${r.bundles.pct}%)</div>
      </div>

      <div class="mt-3 border-t border-slate-800 pt-2 text-[12px] space-y-1">
        <div class="font-semibold text-slate-300">🛠️ Carteira do Criador (Dev):</div>
        <div class="bg-slate-900/80 p-2 rounded-lg text-[11px] space-y-1">
          <div>• <b>Endereço:</b> <span class="mono text-slate-400">\${r.dev.address ? r.dev.address.substring(0,6)+'...'+r.dev.address.substring(r.dev.address.length-4) : 'N/A'}</span></div>
          <div>• <b>Saldo SOL:</b> \${r.dev.sol} SOL</div>
          <div>• <b>Posição Atual:</b> \${r.dev.pct}% do token</div>
          <div>• <b>Estimativa de Venda:</b> \${r.dev.sold}% vendido</div>
          <div>• <b>Tokens Queimados:</b> \${r.dev.burnt}% 🔥</div>
        </div>
      </div>

      <div class="mt-3 bg-slate-900 p-2 rounded mono text-[10px] text-slate-400 break-all border border-slate-800">\${r.address}</div>
    \`;

    document.getElementById('result').innerHTML = html;
  } catch(e) {
    document.getElementById('result').innerHTML = '<div class="text-rose-400 font-bold">❌ Erro: ' + e.message + '</div>';
  }
}
</script>
</body>
</html>`;

    return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
  }
};
