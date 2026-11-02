import { spawn } from 'node:child_process'
const api = spawn(process.execPath, ['--env-file-if-exists=.env','--import','tsx','server/local.ts'], { stdio: 'inherit' })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], { stdio: 'inherit' })
const close = () => { api.kill(); vite.kill() }
process.on('SIGINT', close); process.on('SIGTERM', close)
vite.on('exit', () => api.kill())
