import { spawn } from 'node:child_process'
import process from 'node:process'

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173')
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Nie udało się uruchomić serwera Vite dla testów UI.')
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const runner = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
    runner.once('error', reject)
    runner.once('exit', (code) => resolve(code ?? 1))
  })
}

try {
  await waitForServer()
  process.exitCode = await runPlaywright()
} finally {
  vite.kill()
}
