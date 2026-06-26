import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '^/(hackathon|identity_|pims_|maestro_|orchestrator_|api_|odata_|llmopstenant_|insightsrtm_|df_)': {
        target: 'https://staging.uipath.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
