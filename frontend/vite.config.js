import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteConfig from './vite.config.json' assert { type: 'json' };

export default defineConfig({
  ...viteConfig,
  plugins: [react()],
});
