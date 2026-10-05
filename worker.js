const HELIUS_KEY = process.env.HELIUS_KEY;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CryptoGuard PRO — Multi-Rede</title>
<style>
:root {
    --bg: #0a0a0f; --card: #14141f; --border: #2a2a3d;
    --ok: #00ff9d; --warn: #ffaa00; --danger: #ff3366; --info: #00d4ff;
    --eth: #627eea; --bsc: #f3ba2f; --sol: #00ffa3; --base: #0052ff; --arb: #28a0f0;
    --text: #e8e8f0; --muted: #7a7a95;
}
* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
body { background: var(--bg); color: var(--text); padding: 12px; min-height: 100vh; }
.container { max-width: 520px; margin: 0 auto; }
h2 { text-align: center; margin: 10px 0; color: var(--info); font-size: 1.3rem; }
.chain-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 13px;
    margin-bottom: 10px;
}
.chain-sol { background: rgba(0,255,163,.15); color: var(--sol); }
.chain-eth { background: rgba(98,126,234,.15); color: var(--eth); }
.chain-bsc { background: rgba(243,186,47,.15); color: var(--bsc); }
.chain-base { background: rgba(0,82,255,.15); color: var(--base); }
.chain-arbitrum { background: rgba(40,160,240,.15); color: var(--arb); }
.input-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
select, input, button {
    padding: 12px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--card); color: var(--text); font-size: 15px;
}
button { background: var(--ok); border: none; font-weight: bold; cursor: pointer; color: #000; }
button:disabled { opacity: .5; cursor: not-allowed; }
.card { background: var(--card); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
.score-ring {
    width: 130px; height: 130px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 10px; font-size: 2.2rem; font-weight: bold; position: relative;
}
.score-inner { position: absolute; inset: 8px; border-radius: 50%; background: var(--bg); }
.score-good { background: conic-gradient(var(--ok) 0% var(--p), #1a3a2f var(--p) 100%); }
.score-mid { background: conic-gradient(var(--warn) 0% var(--p), #3a341e var(--p) 100%); }
.score-bad { background: conic-gradient(var(--danger) 0% var(--p), #3a1e28 var(--p) 100%); }
.row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.row:last-child { border-bottom: none; }
.tag { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.tag-real { background: rgba(0,255,157,.15); color: var(--ok); }
.tag-free { background: rgba(255,170,0,.15); color: var(--warn); }
.tag-dev { background: rgba(0,212,255,.15); color: var(--info); }
.tag-burn { background: rgba(100,100,120,.2); color: #aaa; }
.holder { padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.links a { padding: 8px 12px; background: rgba(0,212,255,.1); border-radius: 6px; color: var(--info); text-decoration: none; font-size: 13px; }
.hidden { display: none !important; }
.loading { text-align: center; padding: 30px; }
.spinner {
    width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--info);
    border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.tabs { display: flex; margin: 15px 0; border-bottom: 1px solid var(--border); }
.tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; border-bottom: 2px solid transparent; }
.tab.active { border-bottom-color: var(--info); color: var(--info); font-weight: 600; }
</style>
</head>
<body>
<div class="container">
<h2>🛡️ CryptoGuard PRO — Multi-Rede</h2>

<div class="card">
  <label style="font-size:13px;color:var(--muted)">🔗 Cloudflare Worker:</label>
  <input id="workerUrl" placeholder="https://seu-worker.xxx.workers.dev" style="margin-top:6px">
</div>

<div class="input-row">
  <select id="chainSelect">
    <option value="auto">🔍 Detectar Automaticamente</option>
    <option value="solana">🟢 Solana</option>
    <option value="ethereum">🔷 Ethereum</option>
    <option value="bsc">🟡 BSC (BNB)</option>
    <option value="base">🔵 Base</option>
    <option value="arbitrum">🔷 Arbitrum</option>
  </select>
  <input id="tokenAddress" placeholder="📋 Endereço do token..." autocomplete="off">
  <button id="analyzeBtn" onclick="analyze()">🔍 Analisar</button>
</div>

<div id="loading" class="hidden loading">
  <div class="spinner"></div>
  <p>Analisando blockchain...</p>
</div>

<div id="result" class="hidden">
  <div class="card">
    <div id="chainBadge" class="chain-badge"></div>
    <div class="score-ring" id="scoreRing">
      <div class="score-inner"><span id="scoreVal">0</span></div>
    </div>
    <h3 id="tName">—</h3>
    <p style="text-align:center;color:var(--muted)" id="tSym">—</p>
  </div>

  <div class="card">
    <h3>📊 Dados</h3>
    <div class="row"><span>Idade</span><span id="rAge">—</span></div>
    <div class="row"><span>Market Cap</span><span id="rMc">—</span></div>
    <div class="row"><span>Liquidez</span><span id="rLiq">—</span></div>
    <div class="row"><span>Volume 24h</span><span id="rVol">—</span></div>
    <div class="row"><span>Compras</span><span id="rBuy">—</span></div>
    <div class="row"><span>Queimado</span><span id="rBurn">—</span></div>
    <div class="row"><span>Top 10 (%)</span><span id="rTop10">—</span></div>
  </div>

  <div class="card">
    <h3>🛡️ Auditoria</h3>
    <div id="auditList"></div>
  </div>

  <div class="card">
    <h3>👤 Criador</h3>
    <div class="row"><span>Carteira</span><span id="devAddr" style="font-size:11px;word-break:break-all">—</span></div>
    <div class="row"><span>Já vendeu</span><span id="devSold">—</span></div>
  </div>

  <div class="card">
    <h3>👥 Top Detentores</h3>
    <div id="holdersList"></div>
  </div>

  <div class="card">
    <h3>🔗 Links</h3>
    <div class="links" id="linksBox"></div>
  </div>

  <button onclick="save()" style="width:100%">💾 Salvar</button>
</div>

<div class="tabs">
  <div class="tab active" data-tab="analyze">Análise</div>
  <div class="tab" data-tab="hist">Histórico</div>
</div>

<div id="histTab" class="hidden">
  <div class="card">
    <h3>📝 Salvas</h3>
    <div id="histList"></div>
    <button onclick="clearHist()" style="background:var(--danger);margin-top:10px;width:100%">🗑️ Limpar</button>
  </div>
</div>

</div>

<script>
let last = null;

// Carrega config
const savedW = localStorage.getItem('workerUrl');
if (savedW) document.getElementById('workerUrl').value = savedW;
document.getElementById('workerUrl').oninput = () => localStorage.setItem('workerUrl', document.getElementById('workerUrl').value);

// Abas
document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const isHist = t.dataset.tab === 'hist';
    document.getElementById('result').classList.toggle('hidden', isHist);
    document.getElementById('histTab').classList.toggle('hidden', !isHist);
    if (isHist) renderHist();
  };
});

async function analyze() {
  const addr = document.getElementById('tokenAddress').value.trim();
  const chain = document.getElementById('chainSelect').value;
  const worker = document.getElementById('workerUrl').value.trim();
  
  if (!addr) return alert('Cole o endereço!');
  if (!worker.startsWith('http')) return alert('Coloque o endereço do Worker!');
  
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');

  try {
    const res = await fetch(`${worker}/api/real?address=${encodeURIComponent(addr)}&chain=${chain}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    last = { ...data, address: addr };
    render(data, addr);
    
  } catch (e) {
    alert(`Erro: ${e.message}`);
  } finally {
    btn.disabled = false;
    document.getElementById('loading').classList.add('hidden');
  }
}

function render(d, addr) {
  // Rede
  const badge = document.getElementById('chainBadge');
  badge.textContent = d.chain.toUpperCase();
  badge.className = `chain-badge chain-${d.chain}`;

  // Nota
  const ring = document.getElementById('scoreRing');
  ring.classList.remove('score-good','score-mid','score-bad');
  ring.style.setProperty('--p', `${d.score}%`);
  ring.classList.add(d.score>=70?'score-good':d.score>=40?'score-mid':'score-bad');
  document.getElementById('scoreVal').textContent = d.score;

  // Dados
  document.getElementById('tName').textContent = d.real.name;
  document.getElementById('tSym').textContent = d.real.symbol?`(${d.real.symbol})`:'';
  document.getElementById('rAge').textContent = d.real.ageText;
  document.getElementById('rMc').textContent = d.real.mc?`$${fmt(d.real.mc)}`:'—';
  document.getElementById('rLiq').textContent = d.real.liqUsd?`$${fmt(d.real.liqUsd)}`:'—';
  document.getElementById('rVol').textContent = d.real.vol24h?`$${fmt(d.real.vol24h)}`:'—';
  document.getElementById('rBuy').textContent = d.real.buyRatio?`${(d.real.buyRatio*100).toFixed(0)}%`:'—';
  document.getElementById('rBurn').textContent = d.real.burntPct?`${d.real.burntPct.toFixed(2)}%`:'—';
  document.getElementById('rTop10').textContent = `${d.real.top10Pct.toFixed(1)}%`;

  // Auditoria
  document.getElementById('auditList').innerHTML = d.audit.map(x => `
    <div class="row"><span>${x.check}</span><span style="color:${x.pass?'var(--ok)':'var(--danger)'}">${x.pass?'✅':'❌'} ${x.desc}</span></div>
  `).join('');

  // Dev
  document.getElementById('devAddr').textContent = d.dev?.fullAddr?.slice(0,16)+'...' || '—';
  document.getElementById('devSold').textContent = d.dev?.soldPct !== undefined ? `${d.dev.soldPct}%` : '—';

  // Detentores
  document.getElementById('holdersList').innerHTML = d.top20.slice(0,10).map(h => {
    let tc = 'tag-real';
    if (h.isBurn) tc = 'tag-burn';
    else if (h.isDev) tc = 'tag-dev';
    else if (h.type === 'RECEBEU') tc = 'tag-free';
    return `
      <div class="holder">
        <div style="display:flex;justify-content:space-between">
          <span>#${h.rank} ${h.address}</span>
          <span class="tag ${tc}">${h.type}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:4px">
          <span>${h.pct.toFixed(2)}%</span>
          <span>${h.detail || ''}</span>
        </div>
      </div>
    `;
  }).join('');

  // Links
  const links = {
    solana: [`https://solscan.io/token/${addr}`, 'Solscan'],
    ethereum: [`https://etherscan.io/token/${addr}`, 'Etherscan'],
    bsc: [`https://bscscan.com/token/${addr}`, 'BscScan'],
    base: [`https://basescan.org/token/${addr}`, 'BaseScan'],
    arbitrum: [`https://arbiscan.io/token/${addr}`, 'ArbiScan']
  };
  const [explorer, name] = links[d.chain] || links.solana;
  document.getElementById('linksBox').innerHTML = `
    <a href="https://dexscreener.com/${d.chain}/${addr}" target="_blank">📊 DexScreener</a>
    <a href="https://rugcheck.xyz/tokens/${addr}" target="_blank">🛡️ RugCheck</a>
    <a href="${explorer}" target="_blank">📋 ${name}</a>
  `;

  document.getElementById('result').classList.remove('hidden');
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(2)+'K';
  return n.toFixed(2);
}

function save() {
  if (!last) return alert('Nada para salvar!');
  const arr = JSON.parse(localStorage.getItem('saved') || '[]');
  arr.unshift({ ...last, at: new Date().toLocaleString('pt-BR') });
  localStorage.setItem('saved', JSON.stringify(arr.slice(0,50)));
  alert('✅ Salvo!');
}

function renderHist() {
  const arr = JSON.parse(localStorage.getItem('saved') || '[]');
  document.getElementById('histList').innerHTML = arr.length ? arr.map((x,i) => `
    <div style="padding:10px;border-bottom:1px solid var(--border);cursor:pointer" onclick="loadHist(${i})">
      <div style="display:flex;justify-content:space-between">
        <strong>${x.real?.name || 'Token'}</strong>
        <span style="color:${x.score>=70?'var(--ok)':x.score>=40?'var(--warn)':'var(--danger)'}">${x.score}/100</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${x.at} · ${x.chain}</div>
    </div>
  `).join('') : '<p style="text-align:center;color:var(--muted)">Nenhuma ainda</p>';
}

function loadHist(i) {
  const arr = JSON.parse(localStorage.getItem('saved') || '[]');
  last = arr[i];
  document.getElementById('tokenAddress').value = last.address;
  document.querySelector('[data-tab="analyze"]').click();
  render(last, last.address);
}

function clearHist() {
  if (confirm('Apagar tudo?')) { localStorage.removeItem('saved'); renderHist(); }
}

document.getElementById('tokenAddress').addEventListener('keydown', e => e.key==='Enter' && analyze());
</script>
</body>
</html>
  
