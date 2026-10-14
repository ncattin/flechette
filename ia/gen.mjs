// Fabrique le jeu d'entraînement : node gen.mjs <nombre> <dossier> [graine]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [n = "200", outDir = "data/essai", seedArg = "1"] = process.argv.slice(2);
const out = resolve(outDir); mkdirSync(join(out, "img"), { recursive: true });
const port = 9800 + Math.floor(Math.random() * 100), dir = mkdtempSync(join(tmpdir(), "flgen-"));
const ch = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
try {
  let tabs; for (let k = 0; k < 50; k++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r));
  ws.addEventListener("message", m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
  await send("Page.enable"); await send("Page.navigate", { url: pathToFileURL(resolve(import.meta.dirname, "generateur.html")).href }); await sleep(1200);
  const labels = []; let k = 0; const N = +n, B = 50, t0 = Date.now();
  for (let b = 0; k < N; b++) {
    const r = await send("Runtime.evaluate", { expression: `JSON.stringify(genBatch(${Math.min(B, N - k)},${(+seedArg * 100003 + b * 7919) >>> 0}))`, returnByValue: true });
    const arr = JSON.parse(r.result.result.value);
    for (const s of arr) {
      const name = String(k).padStart(6, "0");
      writeFileSync(join(out, "img", name + "_a.jpg"), Buffer.from(s.before.split(",")[1], "base64"));
      writeFileSync(join(out, "img", name + "_b.jpg"), Buffer.from(s.after.split(",")[1], "base64"));
      labels.push({ id: name, tip: s.tip, tail: s.tail, nold: s.nold, blur: s.blur }); k++;
    }
    process.stdout.write(`\r${k}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  writeFileSync(join(out, "labels.json"), JSON.stringify(labels));
  console.log("\nfini :", out);
} catch (e) { console.error(e); } finally { ch.kill(); await sleep(500); try { rmSync(dir, { recursive: true, force: true }); } catch { } }
