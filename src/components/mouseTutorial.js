import {speechButton} from './speechButton.js'
import {escapeHtml} from '../utils/html.js'
import {icon} from './icons.js'

const tips=[
  ['mouse','Kliknij raz','Ustaw strzałkę na przedmiocie. Naciśnij i puść lewy przycisk myszy.'],
  ['mouse','Kliknij dwa razy','Naciśnij lewy przycisk dwa razy, szybko jeden po drugim. Tak otworzysz folder.'],
  ['drag','Przeciągnij','Złap plik lewym przyciskiem. Trzymaj przycisk, przesuń plik do folderu i puść.'],
  ['mouse','Przewiń','Ustaw strzałkę w oknie. Obróć kółko myszy lub przesuń dwa palce po gładziku. Możesz też użyć strzałek na klawiaturze.'],
]
export function mouseTutorial() {
  const reading=tips.map(([,title,text])=>`${title}. ${text}`).join(' ')
  return `<details class="mouse-tutorial"><summary>Jak używać myszy?</summary><div class="mouse-tutorial-heading"><h3>Spróbuj krok po kroku.</h3>${speechButton(reading,'Samouczek myszy')}</div><ol>${tips.map(([symbol,title,text])=>`<li>${icon(symbol)}<div><strong>${title}</strong><p>${text}</p></div></li>`).join('')}</ol><p>Pełny ekran jest tylko dodatkiem. Możesz pracować w zwykłym oknie.</p></details>`
}
export const mouseInstruction=(text,help='')=>`<div class="mouse-instruction"><h2>${escapeHtml(text)}</h2>${speechButton(`${text} ${help}`.trim(),'Polecenie')}</div>`
