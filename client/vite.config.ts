import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// wgpu_utils/src импортирует шейдеры как raw-строку через webpack'ов
// `{ test: /\.wgsl$/, type: 'asset/source' }` (см. webpack.*.config.js в
// корне wgpu_utils). Vite так по умолчанию не делает — эмулируем то же
// поведение для .wgsl под алиасом @wgpu, см.
// wiki/plans/3d_configurator_integration.md, Этап 8.
function wgslRawPlugin(): Plugin {
  return {
    name: 'wgsl-raw-import',
    load(id) {
      if (!id.endsWith('.wgsl')) return null;
      const source = fs.readFileSync(id, 'utf-8');
      return `export default ${JSON.stringify(source)};`;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wgslRawPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      // wgpu_utils/src напрямую (не npm-пакет — оба репозитория живут рядом
      // на диске). См. wiki/plans/3d_configurator_integration.md, Этап 8.
      '@wgpu': path.resolve(__dirname, '../../src'),
      // Пресеты материалов (KES-F) — client/src/data/materialPresets.ts.
      '@kesf-fitting': path.resolve(__dirname, '../../kesf_fitting'),
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
