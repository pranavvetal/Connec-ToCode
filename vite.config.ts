import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = process.env.CONNEC_SERVER_URL || `http://localhost:${process.env.PORT || env.PORT || 5002}`;
  return {
    plugins: [react()],
    server: { host: '0.0.0.0', port: 3000, proxy: { '/api': apiTarget, '/socket.io': { target: apiTarget, ws: true } } },
  };
});
