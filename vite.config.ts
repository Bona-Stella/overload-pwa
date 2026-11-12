import react from "@vitejs/plugin-react";
import { BlockList } from 'node:net';
import { networkInterfaces } from 'node:os';
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import { appShell } from './scripts/pwa-build.ts';
import { reviewMedia } from './scripts/review-media.ts';

function mockReview(lanIp?: string): Plugin {
  const media = reviewMedia({
    file: process.env.OVERLOAD_REVIEW_GIF_FILE,
    accessKey: process.env.OVERLOAD_REVIEW_MEDIA_KEY,
    origins: ['http://127.0.0.1:4173', 'http://localhost:4173', ...(lanIp ? ['http://' + lanIp + ':4173'] : [])],
  });
  const addresses = new BlockList();
  addresses.addSubnet('127.0.0.0', 8, 'ipv4');
  if (lanIp) {
    const lan = Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && item.address === lanIp);
    if (!lan?.cidr || !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanIp)) throw new Error('Select a private local IPv4 address for UI review');
    addresses.addSubnet(lanIp, Number(lan.cidr.split('/')[1]), 'ipv4');
  }
  return {
    name: 'overload-mock-review',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace('/src/main.tsx', '/src/review/main.tsx'),
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const address = req.socket.remoteAddress?.replace(/^::ffff:/, '');
        if (!address || !addresses.check(address, 'ipv4')) { res.writeHead(403).end(); return; }
        void media(req, res, () => {
          const path = new URL(req.url ?? '/', 'http://localhost').pathname;
          if (/^\/(api|oauth2|__review)(\/|$)/.test(path)) { res.writeHead(404).end(); return; }
          next();
        }).catch(() => { if (!res.headersSent) res.writeHead(503).end(); else res.end(); });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode, isPreview }) => {
  if (command === 'serve' && mode === 'ui-review' && !isPreview) {
    const lanIp = process.env.OVERLOAD_MOCK_LAN_IP;
    return {
      plugins: [react(), mockReview(lanIp)],
      cacheDir: 'node_modules/.vite-ui-review',
      optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
      server: {
        host: lanIp ? '0.0.0.0' : '127.0.0.1',
        port: 4173,
        strictPort: true,
        watch: { ignored: ['**/logs/**'] },
      },
    };
  }
  const target = process.env.OVERLOAD_DEV_API_TARGET ?? loadEnv(mode, process.cwd(), 'OVERLOAD_').OVERLOAD_DEV_API_TARGET ?? 'http://127.0.0.1:8080';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(target)) throw new Error('Development proxy requires an explicit loopback HTTP target');
  return {
    plugins: [react(), appShell()],
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': { target },
        '/oauth2/authorization/google': { target },
        '/oauth2/contact/google': { target },
        '/oauth2/link/google': { target },
      },
    },
  };
});
