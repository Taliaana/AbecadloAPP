import '@fontsource-variable/nunito-sans'
import './styles/index.css'
import { startApp } from './app.js'
import { initializeStorage } from './storage/studentStorage.js'

initializeStorage()
startApp(document.querySelector('#app'))
