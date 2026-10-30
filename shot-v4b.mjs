import { writeFileSync } from "node:fs";
const TOKEN = (await import("node:fs")).readFileSync("/tmp/admin-jwt.txt", "utf8").trim();
const res = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
function send(method, params = {}) { return new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); }); }
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send("Page.navigate", { url: "http://localhost:3000/login" });
await new Promise((r) => setTimeout(r, 1200));
await send("Network.setCookie", { name: "accessToken", value: TOKEN, domain: "localhost", path: "/" });

const shots = [
  ["http://localhost:3000/dashboard/admin", "v4-overview.png", 1440, 2400],
  ["http://localhost:3000/dashboard/admin/profile", "v4-profile.png", 1440, 2400],
  ["http://localhost:3000/dashboard/admin/newsletter", "v4-newsletter.png", 1440, 1800],
];
for (const [url, file, w, h] of shots) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 5000));
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log("saved", file);
}
ws.close(); await fetch("http://127.0.0.1:9222/json/close/" + target.id); process.exit(0);
