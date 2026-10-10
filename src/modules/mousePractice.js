import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { getUnlockedTools } from '../storage/studentStorage.js'

export function mousePracticeView({ student, render }) {
  if (!getUnlockedTools().includes('mouse-practice')) return { html: appLayout('<section class="empty-state"><h1>To narzędzie jeszcze czeka</h1><p>Ukończ lekcję „Obsługuję mysz”.</p><a class="button button--primary" href="#/home">Wróć do domu</a></section>', student, '/workshop') }
  let hits = 0
  let position = 0
  const spots = [[18, 20], [72, 18], [46, 65], [80, 72], [15, 70]]
  function screen() {
    const done = hits === 5
    const content = `<section class="tool-header"><a class="text-link" href="#/workshop">${icon('back')} Wróć do Pracowni</a><p class="eyebrow">Ćwicz mysz</p><h1>${done ? 'Spokojna ręka!' : 'Kliknij koło'}</h1><p>${done ? 'Wszystkie koła znalezione.' : 'Koło zmienia miejsce po każdym kliknięciu.'}</p></section>
      <section class="mouse-practice-card">${done ? `<div class="completion-card completion-card--flat"><span class="completion-check">${icon('check')}</span><h2>5 z 5</h2><button class="button button--primary" type="button" data-again>Powtórz</button></div>` : `<button type="button" class="moving-target" style="left:${spots[position][0]}%;top:${spots[position][1]}%" aria-label="Kliknij koło"></button><span class="mouse-score">${hits} z 5</span>`}</section>`
    return { html: appLayout(content, student, '/workshop'), mount }
  }
  function mount(root) {
    const target = root.querySelector('.moving-target')
    if (target) target.addEventListener('click', () => { hits += 1; position = hits % spots.length; render(screen()) })
    const again = root.querySelector('[data-again]')
    if (again) again.addEventListener('click', () => { hits = 0; position = 0; render(screen()) })
  }
  return screen()
}
