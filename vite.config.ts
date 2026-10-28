import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = process.env.OVERLOAD_DEV_API_TARGET ?? loadEnv(mode, process.cwd(), 'OVERLOAD_').OVERLOAD_DEV_API_TARGET ?? 'http://127.0.0.1:8080';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(target)) throw new Error('Development proxy requires an explicit loopback HTTP target');
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': { target },
        '/oauth2/authorization/google': { target },
      },
    },
  };
});
