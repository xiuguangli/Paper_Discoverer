import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/Paper_Discoverer/',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // 指定输出目录
    outDir: 'dist',
    // 确保静态资源被正确复制
    assetsInlineLimit: 4096,
    // 产生 source map 文件
    sourcemap: false,
    // 确保assets目录下的文件被正确复制
    assetsDir: 'assets',
    // 配置分块策略
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
        }
      }
    }
  },
  // 配置开发服务器
  server: {
    port: 3000,
    open: true
  }
})
