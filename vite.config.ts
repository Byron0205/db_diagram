import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('@codemirror/') || id.includes('@uiw/react-codemirror')) return 'vendor-codemirror'
          if (id.includes('@xyflow/') || id.includes('@dagrejs/')) return 'vendor-diagram'
          if (id.includes('html-to-image') || id.includes('lz-string')) return 'vendor-utils'
        },
      },
    },
  },
})
