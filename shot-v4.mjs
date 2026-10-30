const TOKEN = (await import("node:fs")).readFileSync("/tmp/admin-jwt.txt", "utf8").trim();
const res = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
function send(method, params = {}) { return new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); }); }
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));

// Seed the auth cookie on the client origin (proxy reads `accessToken`).
await send("Page.navigate", { url: "http://localhost:3000/login" });
await new Promise((r) => setTimeout(r, 1500));
await send("Network.setCookie", {
  name: "accessToken", value: TOKEN, domain: "localhost", path: "/", httpOnly: false,
});

const shots = [
  ["http://localhost:3000/dashboard/admin", "v4-overview.png", 1000, 2000],
  ["http://localhost:3000/dashboard/admin/profile", "v4-profile.png", 1000, 2000],
  ["http://localhost:3000/dashboard/admin/newsletter", "v4-newsletter.png", 1000, 1600],
];
for (const [url, file, w, h] of shots) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 4500));
  const m = await send("Runtime.evaluate", { returnByValue: true, expression: `[document.title, document.body.innerText.slice(0, 120).replace(/\\n/g, ' | ')]` });
  console.log(file, "→", JSON.stringify(m.result.value));
  await send("Page.captureScreenshot", { filename: file, captureBeyondViewport: true }).catch(() => {});
}
ws.close(); await fetch("http://127.0.0.1:9222/json/close/" + target.id); process.exit(0);
