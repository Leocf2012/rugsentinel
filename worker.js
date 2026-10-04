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
        // 1. Consulta em paralelo para máxima velocidade
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

        // Processar RugCheck & Helius
        const rug = rugRes.status === "fulfilled" && rugRes.value.ok ? await rugRes.value.json() : null;
        const supplyJson = supplyRes.status === "fulfilled" ? await supplyRes.value.json() : null;
        const largestJson = largestRes.status === "fulfilled" ? await largestRes.value.json() : null;

        const totalSupply = supplyJson?.result?.value?.uiAmount || 1;
        const largestAccounts = largestJson?.result?.value || [];

        // 2. Cálculo da Idade em Dias
        const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
        const ageText = ageDays >= 1 ? `${ageDays} dia${ageDays > 1 ? 's' : ''}` : `${ageHours}h`;

        // 3. Extração das Redes Sociais
        const socials = {
          website: pair.info?.websites?.[0]?.url || null,
          twitter: pair.info?.socials?.find(s => s.type === 'twitter' || s.type === 'x')?.url || null,
          telegram: pair.info?.socials?.find(s => s.type === 'telegram')?.url || null
        };

        // 4. Detecção de Endereços de Queima
        const burnAddresses = [
          "11111111111111111111111111111111",
          "ncinerator11111111111111111111111111111111",
          "1111111111111111111111111111111111111111111"
        ];

        let burntAmount = 0;
        largestAccounts.forEach(acc => {
          if (burnAddresses.includes(acc.address)) {
            burntAmount += (acc.uiAmount || 0);
          }
        });
        const burntPctReal = (burntAmount / totalSupply) * 100;

        // 5. Mapeamento detalhado das Top 10 Carteiras
        const devAddress = rug?.creator || null;
        const topHoldersRug = rug?.topHolders || [];

        const top10Wallets = largestAccounts.slice(0, 10).map((acc, index) => {
          const pct = ((acc.uiAmount || 0) / totalSupply) * 100;
          const isBurn = burnAddresses.includes(acc.address);
          const isDev = acc.address === devAddress;
          
          // Dados estendidos da RugCheck
          const rugHolder = topHoldersRug.find(h => h.address === acc.address || h.owner === acc.address);
          const isInsider = rugHolder?.insider || rugHolder?.isInsider || false;
          const isAirdropped = rugHolder?.airdrop || rugHolder?.transferred || (rugHolder && !rugHolder.uiAmount && pct > 0);

          let type = "REAL"; // Comprador Real
          let label = "Comprador Real 🟢";

          if (isBurn) {
            type = "BURN";
            label = "Queimado (Burn) 🔥";
          } else if (isDev) {
            type = "DEV";
            label = "Criador (Dev) 🛠️";
          } else if (isInsider) {
            type = "INSIDER";
            label = "Insider / Bot 🔴";
          } else if (isAirdropped) {
            type = "AIRDROP";
            label = "Recebeu s/ Compra ⚠️";
          }

          return {
            rank: index + 1,
            address: acc.address,
            pct: pct.toFixed(2),
            type,
            label
          };
        });

        const top10PctReal = top10Wallets.reduce((acc, w) => acc + parseFloat(w.pct), 0);

        // 6. Buscar Saldo em SOL do Criador (Dev)
        let devSolBalance = 0;
        if (devAddress && HELIUS_KEY) {
          try {
            const devBalRes = await fetch(RPC, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "getBalance", params: [devAddress] })
            });
            const devBalJson = await devBalRes.json();
            devSolBalance = (devBalJson.result?.value || 0) / 1e9;
          } catch {}
        }

        // 7. Sistema de Auditoria Padrão & Nota de Segurança (0 a 100)
        let score = 100;
        const audit = [];

        // Check 1: Mint Authority
        const mintAuth = rug?.mintAuthority || rug?.token?.mintAuthority || null;
        if (mintAuth && !burnAddresses.includes(mintAuth)) {
          score -= 30;
          audit.push({ title: "Mint Authority", status: "FAIL", desc: "Criador pode emitir mais tokens" });
        } else {
          audit.push({ title: "Mint Authority", status: "PASS", desc: "Desativada / Revogada" });
        }

        // Check 2: Freeze Authority
        const freezeAuth = rug?.freezeAuthority || rug?.token?.freezeAuthority || null;
        if (freezeAuth && !burnAddresses.includes(freezeAuth)) {
          score -= 25;
          audit.push({ title: "Freeze Authority", status: "FAIL", desc: "Criador pode congelar carteiras" });
        } else {
          audit.push({ title: "Freeze Authority", status: "PASS", desc: "Desativada / Revogada" });
        }

        // Check 3: Concentração Top 10
        if (top10PctReal > 60) {
          score -= 20;
          audit.push({ title: "Top 10 Concentração", status: "FAIL", desc: `Altíssima (${top10PctReal.toFixed(1)}%)` });
        } else if (top10PctReal > 35) {
          score -= 10;
          audit.push({ title: "Top 10 Concentração", status: "WARN", desc: `Moderada (${top10PctReal.toFixed(1)}%)` });
        } else {
          audit.push({ title: "Top 10 Concentração", status: "PASS", desc: `Saudável (${top10PctReal.toFixed(1)}%)` });
        }

        // Check 4: Queima de Tokens / Liquidez
        const lpLocked = rug?.markets?.[0]?.lp?.lpLockedPct || 0;
        if (burntPctReal > 10 || lpLocked > 80) {
          audit.push({ title: "Proteção LP / Burn", status: "PASS", desc: `${(burntPctReal + lpLocked).toFixed(1)}% bloqueado/queimado` });
        } else {
          score -= 15;
          audit.push({ title: "Proteção LP / Burn", status: "WARN", desc: "Baixa taxa de queima/bloqueio" });
        }

        // Check 5: Insiders e Airdrops
        const insiderCount = top10Wallets.filter(w => w.type === 'INSIDER' || w.type === 'AIRDROP').length;
        if (insiderCount > 3) {
          score -= 15;
          audit.push({ title: "Carteiras Suspeitas", status: "FAIL", desc: `${insiderCount} carteiras com Airdrop/Insider` });
        } else {
          audit.push({ title: "Carteiras Suspeitas", status: "PASS", desc: "Pouca ou nenhuma suspeita" });
        }

        score = Math.max(0, Math.min(100, score));

        // Retorno JSON completo
        return Response.json({
          pair,
          rug,
          score,
          audit,
          socials,
          real: {
            name: pair.baseToken?.name || 'Token',
            symbol: pair.baseToken?.symbol || 'TOKEN',
            ageText,
            mc: pair.fdv || pair.marketCap || 0,
            liqUsd: pair.liquidity?.usd || 0,
            liqSol: pair.liquidity?.base ? (pair.liquidity.base / 1e9).toFixed(0) : Math.floor((pair.liquidity?.usd || 0) / 150),
            volUsd: pair.volume?.h1 || 0,
            dexPaid: pair.boosts?.active > 0 || pair.info?.header ? true : false,
            scans: rug?.score || 0,
            hodls: rug?.totalHolders || largestAccounts.length || 0,
            top10Pct: top10PctReal.toFixed(1),
            top10Wallets,
            dev: {
              address: devAddress,
              sol: devSolBalance.toFixed(2),
              pct: (top10Wallets.find(w => w.type === 'DEV')?.pct || 0),
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

    // --- PAINEL FRONTEND EM HTML5 + TAILWIND ---
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RugSentinel V4 REAL</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background: #0b0f19; color: #f1f5f9; font-family: Inter, sans-serif; }
    .card { background: #151c2c; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; max-width: 480px; margin: 0 auto; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="p-3">
  <div class="card shadow-2xl overflow-hidden mb-6">
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white text-center">
      <div class="text-[20px] font-black"><i class="fa-solid fa-shield-halved"></i> RugSentinel V4 REAL</div>
      <div class="text-[11px] opacity-80">Análise On-Chain em Tempo Real via Helius API</div>
    </div>
    
    <div class="p-4 space-y-3">
      <div class="flex gap-2">
        <input id="tokenInput" class="mono w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500" value="HmkiLg8BQnXMexzKJYFsMjbq82SfcqFXXfJ78CYypump">
        <button onclick="scan()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-4 transition"><i class="fa-solid fa-search"></i></button>
      </div>

      <!-- BOTÃO SALVAR TOKEN & HISTÓRICO -->
      <div class="flex justify-between items-center text-[12px]">
        <button id="saveBtn" onclick="toggleSaveToken()" class="hidden bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg font-semibold transition">
          <i class="fa-regular fa-star mr-1"></i> Salvar Token
        </button>
        <button onclick="toggleSavedList()" class="text-slate-400 hover:text-white underline ml-auto">
          <i class="fa-solid fa-bookmark"></i> Salvos (<span id="savedCount">0</span>)
        </button>
      </div>

      <!-- LISTA DE SALVOS (DRAWER) -->
      <div id="savedContainer" class="hidden bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2 text-[12px]">
        <div class="font-bold text-slate-300 border-b border-slate-800 pb-1">Tokens Salvos:</div>
        <div id="savedList" class="space-y-1 max-h-40 overflow-y-auto"></div>
      </div>

      <div id="result" class="text-[13px] leading-[1.6]">Insira um contrato Solana e clique na lupa...</div>
    </div>
  </div>

<script>
let currentToken = null;

function fmt(n){
  if(!n) return '$0';
  if(n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if(n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if(n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

// LÓGICA DE SALVAR TOKENS NO LOCALSTORAGE
function getSavedTokens(){
  return JSON.parse(localStorage.getItem('saved_tokens') || '[]');
}

function updateSavedCount(){
  const saved = getSavedTokens();
  document.getElementById('savedCount').innerText = saved.length;
}

function toggleSaveToken(){
  if(!currentToken) return;
  let saved = getSavedTokens();
  const index = saved.findIndex(t => t.address === currentToken.address);

  if(index >= 0) {
    saved.splice(index, 1);
    document.getElementById('saveBtn').innerHTML = '<i class="fa-regular fa-star mr-1"></i> Salvar Token';
  } else {
    saved.push({ address: currentToken.address, symbol: currentToken.symbol, score: currentToken.score });
    document.getElementById('saveBtn').innerHTML = '<i class="fa-solid fa-star text-amber-400 mr-1"></i> Salvo!';
  }

  localStorage.setItem('saved_tokens', JSON.stringify(saved));
  updateSavedCount();
  renderSavedList();
}

function renderSavedList(){
  const saved = getSavedTokens();
  const el = document.getElementById('savedList');
  if(saved.length === 0){
    el.innerHTML = '<div class="text-slate-500 italic">Nenhum token salvo ainda.</div>';
    return;
  }

  el.innerHTML = saved.map(t => \`
    <div class="flex justify-between items-center bg-slate-800/60 p-2 rounded border border-slate-700/50">
      <button onclick="loadAddress('\${t.address}')" class="font-bold text-blue-400 hover:underline">\${t.symbol}</button>
      <div class="flex items-center gap-2">
        <span class="text-[10px] px-1.5 py-0.5 rounded \${t.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">Nota: \${t.score}</span>
        <button onclick="removeSaved('\${t.address}')" class="text-slate-500 hover:text-rose-400"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  \`).join('');
}

function removeSaved(addr){
  let saved = getSavedTokens().filter(t => t.address !== addr);
  localStorage.setItem('saved_tokens', JSON.stringify(saved));
  updateSavedCount();
  renderSavedList();
}

function toggleSavedList(){
  document.getElementById('savedContainer').classList.toggle('hidden');
}

function loadAddress(addr){
  document.getElementById('tokenInput').value = addr;
  scan();
}

async function scan(){
  const addr = document.getElementById('tokenInput').value.trim();
  if(!addr) return;
  
  document.getElementById('saveBtn').classList.add('hidden');
  document.getElementById('result').innerHTML = '<div class="text-center py-6 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-500"></i><br>Analisando blocos e carteiras na Helius RPC...</div>';
  
  try {
    const res = await fetch('/api/real?address=' + encodeURIComponent(addr));
    const data = await res.json();
    if(data.error) throw new Error(data.error);

    const r = data.real;
    const pair = data.pair;
    const soc = data.socials;

    currentToken = { address: r.address, symbol: r.symbol, score: data.score };

    // Atualiza o estado do botão Salvar
    const saved = getSavedTokens();
    const isSaved = saved.some(t => t.address === r.address);
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.classList.remove('hidden');
    saveBtn.innerHTML = isSaved ? '<i class="fa-solid fa-star text-amber-400 mr-1"></i> Salvo!' : '<i class="fa-regular fa-star mr-1"></i> Salvar Token';

    // Cor da Nota
    let scoreBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if(data.score < 70) scoreBg = "bg-amber-500/20 text-amber-400 border-amber-500/40";
    if(data.score < 40) scoreBg = "bg-rose-500/20 text-rose-400 border-rose-500/40";

    let html = \`
      <!-- HEADER DO TOKEN -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div class="font-black text-[16px] text-white">💊 \${r.name} (\${r.symbol})</div>
          <div class="text-[11px] text-slate-400"><i class="fa-regular fa-clock mr-1"></i> Criado há: <b>\${r.ageText}</b></div>
        </div>
        <div class="text-center border px-3 py-1.5 rounded-xl \${scoreBg}">
          <div class="text-[10px] uppercase font-bold tracking-wider">Nota Seg.</div>
          <div class="text-[18px] font-black leading-none">\${data.score}/100</div>
        </div>
      </div>

      <!-- REDES SOCIAIS -->
      <div class="flex gap-2 mt-3 text-[11px]">
        \${soc.website ? \`<a href="\${soc.website}" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"><i class="fa-solid fa-globe"></i> Website</a>\` : ''}
        \${soc.twitter ? \`<a href="\${soc.twitter}" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-sky-400 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"><i class="fa-brands fa-x-twitter"></i> Twitter/X</a>\` : ''}
        \${soc.telegram ? \`<a href="\${soc.telegram}" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-blue-400 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"><i class="fa-brands fa-telegram"></i> Telegram</a>\` : ''}
        \${!soc.website && !soc.twitter && !soc.telegram ? '<span class="text-slate-500 italic">Nenhuma rede social oficial vinculada.</span>' : ''}
      </div>

      <!-- MÉTRICAS PRINCIPAIS -->
      <div class="grid grid-cols-2 gap-2 mt-3 text-[12px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div>💰 <b>Market Cap:</b> \${fmt(r.mc)}</div>
        <div>💧 <b>Liquidez:</b> \${fmt(r.liqUsd)} (\${r.liqSol} SOL)</div>
        <div>📊 <b>Volume 1h:</b> \${fmt(r.volUsd)}</div>
        <div>👥 <b>Holders:</b> \${r.hodls}</div>
      </div>

      <!-- AUDITORIA DE SEGURANÇA -->
      <div class="mt-3 border-t border-slate-800 pt-2 space-y-1">
        <div class="font-bold text-slate-300 text-[12px] mb-1">🛡️ Padrões de Auditoria On-Chain:</div>
        <div class="grid grid-cols-1 gap-1 text-[11px]">
          \${data.audit.map(a => \`
            <div class="flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded">
              <span class="text-slate-400">\${a.title}:</span>
              <span class="font-semibold \${a.status === 'PASS' ? 'text-emerald-400' : a.status === 'WARN' ? 'text-amber-400' : 'text-rose-400'}">\${a.desc}</span>
            </div>
          \`).join('')}
        </div>
      </div>

      <!-- TOP 10 CARTEIRAS -->
      <div class="mt-4 border-t border-slate-800 pt-2">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-slate-300 text-[12px]">👥 Top 10 Carteiras (\${r.top10Pct}% Total):</span>
          <span class="text-[10px] text-slate-500">Clique para analisar</span>
        </div>
        <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          \${r.top10Wallets.map(w => \`
            <div class="flex items-center justify-between text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 hover:border-slate-700 transition">
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span class="text-slate-500 font-bold text-[10px]">#\${w.rank}</span>
                <a href="https://solscan.io/account/\${w.address}" target="_blank" class="mono text-blue-400 hover:underline truncate w-24">\${w.address.substring(0,4)}...\${w.address.substring(w.address.length-4)}</a>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-200">\${w.pct}%</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded font-semibold \${
                  w.type === 'REAL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-5
