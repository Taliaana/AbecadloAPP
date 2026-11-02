import '@fontsource-variable/nunito-sans'
import './styles/index.css'
import './styles/shared.css'
import './styles/researchBoard.css'
import './styles/equipmentLesson.css'
import './styles/typography.css'
import { startApp } from './app.js'
import { initializeStorage } from './storage/studentStorage.js'

const root = document.querySelector('#app')
async function boot() {
  root.innerHTML = '<main class="main-content" role="status">Ładowanie PinkTower…</main>'
  try { await initializeStorage(); startApp(root) }
  catch {
    root.innerHTML = '<main class="main-content"><p role="alert">Nie udało się połączyć. Spróbuj ponownie.</p><button class="button button-primary">Spróbuj ponownie</button></main>'
    root.querySelector('button').onclick = boot
  }
}
boot()
