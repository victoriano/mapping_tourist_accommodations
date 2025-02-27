import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for deployment (use './' for relative paths)
  base: './',
  
  // Configure the build output directory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Configure assets handling
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
    },
  },
  
  // Configure the development server
  server: {
    port: 3000,
    open: true, // Automatically open browser on start
    cors: true, // Enable CORS for all origins
    fs: {
      // Allow serving files from one level up (the project root)
      allow: ['..'],
    },
  },
  
  // Configure how TypeScript is transformed
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  
  // Configure the resolution of imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}); 