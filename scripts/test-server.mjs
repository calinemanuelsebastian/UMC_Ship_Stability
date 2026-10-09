import { createServer as createViteServer } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// SSR checks must never invalidate the browser's optimized dependencies or HMR port.
export async function createServer(options = {}) {
  const cacheDir = await mkdtemp(join(tmpdir(), 'umc-test-vite-'));
  try {
    const server = await createViteServer({...options, cacheDir, optimizeDeps: {noDiscovery: true, include: []}, server: {...options.server, hmr: false, ws: false, watch: null}});
    const close = server.close.bind(server);
    server.close = async () => { try { await close(); } finally { await rm(cacheDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); } };
    return server;
  } catch (error) { await rm(cacheDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); throw error; }
}
