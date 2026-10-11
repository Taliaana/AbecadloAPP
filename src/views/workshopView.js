import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { materialIllustration } from '../components/materialIllustrations.js'
import { tools } from '../data/tools.js'
import { getUnlockedTools } from '../storage/studentStorage.js'

export function workshopView({ student }) {
  const unlocked = getUnlockedTools()
  const visibleTools = tools.filter((tool) => tool.available || unlocked.includes(tool.id))
  const waitingTools = tools.filter((tool) => !tool.available && !unlocked.includes(tool.id)).slice(0, 4)
  const content = `<section class="workshop-heading"><div><p class="eyebrow">Pracownia</p><h1>Półka materiałów</h1></div><p>Wybierz materiał wskazany przez nauczyciela. Każdy wraca na swoje miejsce.</p></section>
    <section class="material-shelf" aria-label="Dostępne materiały">
      <div class="shelf-wall" aria-hidden="true"><span></span><span></span><span></span></div>
      ${visibleTools.length ? `<div class="tool-shelf">${visibleTools.map((tool) => `<a class="tool-card" href="#${tool.route}"><span class="tool-object">${materialIllustration(tool.id, tool.title)}</span><span class="tool-label"><strong>${tool.title}</strong><small>${tool.description}</small></span><span class="tool-open">Otwórz ${icon('arrow')}</span></a>`).join('')}</div>` : `<div class="empty-state empty-state--shelf"><span class="empty-illustration">${materialIllustration('workshop')}</span><h2>Półka czeka na pierwszy materiał</h2><p>Po lekcji „Obsługuję mysz” pojawi się tutaj nowe ćwiczenie.</p><a class="button button-primary" href="#/home">Wróć do lekcji</a></div>`}
      <div class="wooden-shelf" aria-hidden="true"></div>
    </section>
    <section class="shelf-preview" aria-label="Materiały, które pojawią się później"><div><p class="eyebrow">Później</p><h2>Kolejne miejsca na półce</h2></div><div class="waiting-materials">${waitingTools.map((tool) => `<span class="waiting-material"><span>${materialIllustration(tool.id, '')}</span><strong>${tool.title}</strong><small>${icon('lock')} Jeszcze niepoznane</small></span>`).join('')}</div></section>`
  return { html: appLayout(content, student, '/workshop') }
}
