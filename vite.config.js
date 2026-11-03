import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]

// GitHub Pages serves project sites from /<repo>/, while local dev uses /.
export default defineConfig({
  base:
    process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : '/',
  plugins: [react()],
})
