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
.tab{padding:8px 12px;border-bottom:2px solid transparent;cursor:pointer;font-size:12px;font-weight:700;color:#64748b;white-space:nowrap}
.tab.active{border-bottom-color:#06b6d4;color:#06b6d4}
.tabs{display:flex;overflow-x:auto;gap:4px;border-bottom:1px solid rgba(255,255,255,.08);padding:0 4px}
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
      <input id="addr" class="mono flex-1 bg-black border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 outline-none" placeholder="Cole o contrato...">
      <button onclick="scan()" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 rounded-xl font-bold text-sm">🔍</button>
    </div>
  </div>
  <div id="savedBox" class="card p-3 hidden">
    <div class="flex justify-between items-center mb-2">
      <span class="text-[12px] font-bold text-amber-400">⭐ Salvos</span>
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
// === PARTE 2 vai aqui ===
</script>
</body>
</html>`;
}
