import '@fontsource-variable/nunito-sans'
import './styles/index.css'
import './styles/shared.css'
import './styles/researchBoard.css'
import './styles/equipmentLesson.css'
import './styles/typography.css'
import { startApp } from './app.js'
import { initializeStorage } from './storage/studentStorage.js'

initializeStorage()
startApp(document.querySelector('#app'))
