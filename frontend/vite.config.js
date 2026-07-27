process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET') {
    // Bỏ qua lỗi ngắt kết nối socket để giữ dev server hoạt động ổn định
    return;
  }
  console.error('Uncaught Exception:', err);
});

import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('Vite proxy error caught:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Backend service unavailable' }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            req.on('error', (err) => {
              console.warn('Request socket error caught:', err.message);
            });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            proxyRes.on('error', (err) => {
              console.warn('Response socket error caught:', err.message);
            });
          });
        },
      },
      '/admin/queues': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('Vite proxy error caught:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Backend service unavailable' }));
            }
          });
        },
      },
    },
  },
})
