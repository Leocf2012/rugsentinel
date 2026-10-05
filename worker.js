import { getHTML } from './html.js';

export default {
  async fetch(request, env) {
    const HELIUS_KEY = env.HELIUS_KEY || env.HELIUS_API_KEY;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!HELIUS_KEY) return Response.json({ error: "Falta HELIUS_KEY" }, { status: 500, headers: cors });

    const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
    const url = new URL(request.url);

    async function rpc(method, params) {
      try {
        const r = await fetch(RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
        });
        const j = await r.json();
        return j.result;
      } catch (e) { return null; }
    }

    if (url.pathname === "/api/real") {
      const address = url.searchParams.get("address");
      if (!address) return Response.json({ error: "sem address" }, { status: 400, headers: cors });

      try {
        const [dexRes, rugRes, supplyData, largestData, sigsData] = await Promise.all([
          fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`).then(r => r.json()).catch(() => null),
          fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`).then(r => r.ok ? r.json() : null).catch(() => null),
          rpc("getTokenSupply", [address]),
          rpc("getTokenLargestAccounts", [address]),
          rpc("getSignaturesForAddress", [address, { limit: 100 }])
        ]);

        const pair = dexRes?.pairs?.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        if (!pair) return Response.json({ error: "Token não encontrado" }, { status: 404, headers: cors });

        const rug = rugRes || null;
        const totalSupply = supplyData?.value?.uiAmount || 1;
        const largest = largestData?.value || [];
        const sigs = sigsData || [];

        const burns = ["11111111111111111111111111111111", "1nc1nerator11111111111111111111111111111111"];
        let burnt = 0;
        largest.forEach(a => { if (burns.includes(a.address)) burnt += a.uiAmount || 0; });
        const burntPct = (burnt / totalSupply) * 100;

        const devAddr = rug?.creator || null;
        const top20 = largest.slice(0, 20).map((acc, i) => {
          const pct = (acc.uiAmount / totalSupply) * 100;
          return { rank: i + 1, address: acc.address, amount: acc.uiAmount, pct, isBurn: burns.includes(acc.address), isDev: devAddr === acc.address };
        });
        const top10Pct = top20.slice(0, 10).reduce((s, a) => s + a.pct, 0);
        const top20Pct = top20.reduce((s, a) => s + a.pct, 0);

        let bundlePct = 0;
        if (sigs.length >= 5) {
          const slots = sigs.slice(0, 20).map(s => s.slot).filter(Boolean);
          const unique = new Set(slots);
          bundlePct = ((slots.length - unique.size) / slots.length) * 100;
        }
        let snipers = 0;
        if (sigs.length > 0) {
          const firstSlot = sigs[sigs.length - 1].slot;
          snipers = sigs.filter(s => s.slot === firstSlot).length;
        }
        const fakeHolders = top20.filter(h => h.pct < 0.01 && h.pct > 0).length;
        const fakeHoldersPct = largest.length ? (fakeHolders / largest.length * 100) : 0;
        const buys = pair.txns?.h24?.buys || 0;
        const sells = pair.txns?.h24?.sells || 0;
        const totalTx = buys + sells;
        const buyRatio = totalTx ? buys / totalTx : 0.5;
        const fakeVolPct = Math.min(100, Math.abs(0.5 - buyRatio) * 200);

        let devSol = 0, devSoldPct = 0;
        if (devAddr) {
          try {
            const [bal, devTokens] = await Promise.all([
              rpc("getBalance", [devAddr]),
              rpc("getTokenAccountsByOwner", [devAddr, { mint: address }, { encoding: "jsonParsed" }])
            ]);
            devSol = (bal?.value || 0) / 1e9;
            const holding = devTokens?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
            const devTop = top20.find(t => t.isDev);
            if (devTop && devTop.amount > 0) devSoldPct = Math.max(0, (1 - holding / devTop.amount) * 100);
          } catch (e) {}
        }

        const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
        const ageH = Math.floor(ageMs / 3600000);
        const ageText = ageH < 24 ? `${ageH}h` : `${Math.floor(ageH / 24)}d`;

        const mintAuth = rug?.mintAuthority || rug?.token?.mintAuthority || null;
        const freezeAuth = rug?.freezeAuthority || rug?.token?.freezeAuthority || null;
        const lpLocked = rug?.markets?.[0]?.lp?.lpLockedPct || 0;

        let score = 100;
        const audit = [];
        if (mintAuth) { score -= 25; audit.push({ check: "Mint Authority", pass: false, desc: "Ativo — pode emitir mais" }); }
        else audit.push({ check: "Mint Authority", pass: true, desc: "Desativado" });
        if (freezeAuth) { score -= 20; audit.push({ check: "Freeze Authority", pass: false, desc: "Ativo — pode congelar" }); }
        else audit.push({ check: "Freeze Authority", pass: true, desc: "Desativado" });
        if (bundlePct > 50) { score -= 15; audit.push({ check: "Bundle", pass: false, desc: bundlePct.toFixed(0) + "% mesmo bloco" }); }
        else audit.push({ check: "Bundle", pass: true, desc: bundlePct.toFixed(0) + "% mesmo bloco" });
        if (burntPct < 1) { score -= 5; audit.push({ check: "Burn", pass: false, desc: burntPct.toFixed(2) + "% baixo" }); }
        else audit.push({ check: "Burn", pass: true, desc: burntPct.toFixed(2) + "%" });
        if (devSoldPct > 50) { score -= 20; audit.push({ check: "Dev Sold", pass: false, desc: devSoldPct.toFixed(0) + "% vendido" }); }
        else audit.push({ check: "Dev Sold", pass: true, desc: devSoldPct.toFixed(0) + "% vendido" });
        if (top10Pct > 60) { score -= 20; audit.push({ check: "Top 10", pass: false, desc: top10Pct.toFixed(1) + "%" }); }
        else audit.push({ check: "Top 10", pass: true, desc: top10Pct.toFixed(1) + "%" });
        score = Math.max(0, Math.min(100, Math.round(score)));

        return Response.json({
          pair, rug, score, audit,
          real: {
            address, name: pair.baseToken?.name, symbol: pair.baseToken?.symbol,
            ageText, mc: pair.fdv || pair.marketCap || 0, liqUsd: pair.liquidity?.usd || 0,
            vol24h: pair.volume?.h24 || 0, dex: pair.dexId || 'unknown',
            priceUsd: pair.priceUsd, ch24: pair.priceChange?.h24 || 0,
            top10Pct, top20Pct, burntPct, bundlePct, fakeVolPct, fakeHolders, fakeHoldersPct,
            hodls: rug?.totalHolders || largest.length, snipers,
            mintAuth: !!mintAuth, freezeAuth: !!freezeAuth,
            top20, dev: { address: devAddr, sol: devSol, soldPct: devSoldPct }
          }
        }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    if (url.pathname === "/api/wallets") {
      const address = url.searchParams.get("address");
      const start = parseInt(url.searchParams.get("start") || "0");
      const end = parseInt(url.searchParams.get("end") || "10");
      if (!address) return Response.json({ error: "sem address" }, { status: 400, headers: cors });
      try {
        const largestData = await rpc("getTokenLargestAccounts", [address]);
        const largest = (largestData?.value || []).slice(start, end);
        const wallets = await Promise.all(largest.map(async (acc) => {
          let tipo = "RECEBEU", detalhe = "Recebeu sem gastar SOL";
          try {
            const sigsData = await rpc("getSignaturesForAddress", [acc.address, { limit: 3 }]);
            if (sigsData && sigsData.length > 0) {
              const txData = await rpc("getTransaction", [sigsData[0].signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
              if (txData) {
                const pre = txData.meta?.preBalances || [];
                const post = txData.meta?.postBalances || [];
                const solDiff = (post[0] || 0) - (pre[0] || 0);
                if (solDiff < -1000000) { tipo = "COMPROU"; detalhe = "Comprou " + Math.abs(solDiff / 1e9).toFixed(2) + " SOL"; }
              }
            }
          } catch (e) {}
          return { address: acc.address, amount: acc.uiAmount, tipo, detalhe };
        }));
        return Response.json({ wallets }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    return new Response(getHTML(), { headers: { "content-type": "text/html;charset=UTF-8" } });
  }
};
