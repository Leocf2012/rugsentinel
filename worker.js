export default {
  async fetch(request, env) {
    return new Response("RugSentinel TA VIVO! Helius key: " + (env.HELIUS_KEY? "ON ✅" : "OFF ❌"), {
      headers: { "content-type": "text/plain" }
    });
  }
}
