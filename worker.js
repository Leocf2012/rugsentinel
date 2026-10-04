export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const HELIUS_KEY = env.HELIUS_KEY || env.HELIUS_API_KEY;
    const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

    if (url.pathname === "/api/real") {
      const address = url.searchParams.get("address");
      if (!address) return Response.json({ error: "sem address" }, { status: 400 });
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexJson = await dexRes.json();
        const pair = dexJson.pairs?.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        if (!pair) return Response.json({ error: "não achou" }, { status: 404 });
        const rugRes = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`);
        const rug = rugRes.ok ? await rugRes.json() : null;
        const supplyData = await (await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [address] }) })).json();
        const totalSupply = supplyData?.result?.value?.uiAmount || 0;
        const largestData = await (await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getTokenLargestAccounts", params: [address] }) })).json();
        const largest = largestData?.result?.value || [];
        const burns = ["11111111111111111111111111111111", "1nc1nerator11111111111111111111111111111111"];
        let burnt = 0;
        largest.forEach(a => { if (burns.includes(a.address)) burnt += a.uiAmount || 0; });
        const burntPct = totalSupply ? (burnt / totalSupply * 100) : 0;
        const top20 = largest.slice(0, 20).map((acc, i) => {
          const pct = totalSupply ? (acc.uiAmount / totalSupply * 100) : 0;
          return { rank: i + 1, address: acc.address, amount: acc.uiAmount, pct, isBurn: burns.includes(acc.address), isDev: rug?.creator === acc.address };
        });
        const top10Pct = top20.slice(0, 10).reduce((s, a) => s + a.pct, 0);
        const top20Pct = top20.reduce((s, a) => s + a.pct, 0);
        const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
        const ageH = Math.floor(ageMs / 3600000);
        const ageText = ageH < 24 ? ageH + 'h' : Math.floor(ageH / 24) + 'd';
        let score = 100;
        const audit = [];
        if (rug?.mintAuthority) { score -= 25; audit.push({ t: "Mint", s: "FAIL", d: "pode mintar" }); } else audit.push({ t: "Mint", s: "PASS", d: "desativado" });
        if (rug?.freezeAuthority) { score -= 20; audit.push({ t: "Freeze", s: "FAIL", d: "pode congelar" }); } else audit.push({ t: "Freeze", s: "PASS", d: "desativado" });
        if (top10Pct > 60) { score -= 20; audit.push({ t: "Top10", s: "FAIL", d: top10Pct.toFixed(1) + "%" }); } else if (top10Pct > 35) { score -= 10; audit.push({ t: "Top10", s: "WARN", d: top10Pct.toFixed(1) + "%" }); } else audit.push({ t: "Top10", s: "PASS", d: top10Pct.toFixed(1) + "%" });
        if (burntPct < 1) { score -= 10; audit.push({ t: "Burn", s: "WARN", d: burntPct.toFixed(2) + "%" }); } else audit.push({ t: "Burn", s: "PASS", d: burntPct.toFixed(2) + "%" });
        score = Math.max(0, Math.min(100, Math.round(score)));
        return Response.json({ pair, rug, score, audit, real: { address, name: pair.baseToken?.name, symbol: pair.baseToken?.symbol, ageText, mc: pair.fdv || pair.marketCap || 0, liqUsd: pair.liquidity?.usd || 0, vol24h: pair.volume?.h24 || 0, top10Pct, top20Pct, burntPct, hodls: largest.length, top20, dev: { address: rug?.creator || null, sol: 0, soldPct: 0 } } }, { headers: { "Access-Control-Allow-Origin": "*" } });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RugSentinel V6</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-[#0b0f19] text-white p-3"><div class="max-w-[420px] mx-auto bg-[#151c2c] rounded-2xl overflow-hidden border border-white/10"><div class="bg-blue-600 p-3 text-center font-black">RugSentinel V6 - 100% REAL</div><div class="p-3 flex gap-2"><input id="a" class="flex-1 bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs" value="HmkiLg8BQnXMexzKJYFsMjbq82SfcqFXXfJ78CYypump"><button onclick="go()" class="bg-blue-600 px-4 rounded-xl">🔍</button></div><div id="r" class="p-3 text-[13px]">Cole o contrato e clique na lupa.</div></div><script>
async function go(){
 const addr=document.getElementById('a').value.trim();
 document.getElementById('r').innerHTML='Buscando ON-CHAIN...';
 const res=await fetch('/api/real?address='+addr);
 const data=await res.json();
 if(data.error){ document.getElementById('r').innerHTML='Erro: '+data.error; return; }
 const x=data.real;
 document.getElementById('r').innerHTML = \`
<div class="font-bold text-lg">💊 \${x.name} (\${x.symbol}) - \${data.score}/100</div>
<div class="text-xs text-slate-400">\${x.ageText} • MC $\${(x.mc/1000).toFixed(0)}K • Liq $\${(x.liqUsd/1000).toFixed(1)}K • Vol $\${(x.vol24h/1000).toFixed(0)}K</div>
<div class="mt-2 grid grid-cols-2 gap-2 text-xs bg-black/40 p-2 rounded-xl">
<div>Top10: \${x.top10Pct.toFixed(2)}%</div><div>Top20: \${x.top20Pct.toFixed(2)}%</div>
<div>Burn: \${x.burntPct.toFixed(2)}%</div><div>Holders: \${x.hodls}</div>
</div>
<div class="mt-3 text-xs">\${data.audit.map(a=>'<div>'+a.t+': <b class="'+(a.s==='PASS'?'text-green-400':a.s==='WARN'?'text-yellow-400':'text-red-400')+'">'+a.d+'</b></div>').join('')}</div>
<div class="mt-3 text-[11px]">Top20:<br>\${x.top20.map(t=>'#'+t.rank+' '+t.address.slice(0,4)+'...'+t.address.slice(-4)+' - '+t.pct.toFixed(2)+'% '+(t.isBurn?'🔥':'')+(t.isDev?'🛠️':'')).join('<br>')}</div>
<div class="mt-2 text-[10px] break-all opacity-50">\${x.address}</div>
\`;
}
go();
</script></body></html>`, {headers:{"content-type":"text/html"}});
  }
}
