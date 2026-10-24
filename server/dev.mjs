import { createServer } from 'node:net';
import { existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Safely initialize .env from .env.example only if .env does not already exist
const envPath = path.resolve(process.cwd(), '.env');
const envExample = path.resolve(process.cwd(), '.env.example');
if (!existsSync(envPath) && existsSync(envExample)) {
  try { copyFileSync(envExample, envPath); } catch {}
}

dotenv.config();

async function canBind(port, host, ipv6Only = false) {
  return new Promise(resolve => {
    const probe = createServer();
    probe.once('error', error => resolve(['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)));
    probe.listen({ port, host, ipv6Only }, () => probe.close(() => resolve(true)));
  });
}

async function portIsFree(port) {
  return (await canBind(port, '0.0.0.0')) && (await canBind(port, '::', true));
}

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    if (await portIsFree(port)) return port;
  }
  throw new Error('Could not find an available preview port. Set PORT to a free port and try again.');
}

const port = await findAvailablePort(Number(process.env.VITE_PORT || process.env.PORT) || 3000);
process.env.PORT = String(port);
process.env.CONNEC_UNIFIED_DEV = '1';
console.log(`Starting the unified Connec-ToCode preview on port ${port}; API and Vite share one server.`);
await import('./index.mjs');

const base = `http://127.0.0.1:${port}`;
const deadline = Date.now() + 20_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const healthResponse = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) });
    const health = healthResponse.ok ? await healthResponse.json() : null;
    const historyResponse = await fetch(`${base}/api/competition-history`, { signal: AbortSignal.timeout(1000) });
    const history = historyResponse.ok ? await historyResponse.json() : null;
    const pageResponse = await fetch(base, { signal: AbortSignal.timeout(1000) });
    const page = pageResponse.ok ? await pageResponse.text() : '';
    const roomResponse = await fetch(`${base}/api/rooms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(1500),
    });
    const room = roomResponse.ok ? await roomResponse.json() : null;
    if (health?.ok && Array.isArray(history?.rounds) && /<div id="root"><\/div>/i.test(page) && room?.roomId) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!ready) {
  console.error(`Unified preview failed its API health, page, or room check at ${base}.`);
  process.exit(1);
}
console.log(`API health, competition history, Vite page, and room creation passed at ${base}.`);
console.log(`Open http://localhost:${port}/`);
