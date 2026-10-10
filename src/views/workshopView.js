import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { tools } from '../data/tools.js'
import { getUnlockedTools } from '../storage/studentStorage.js'

export function workshopView({ student }) {
  const unlocked = getUnlockedTools()
  const visibleTools = tools.filter((tool) => unlocked.includes(tool.id))
  const content = `<section class="page-heading"><p class="eyebrow">Pracownia</p><h1>Poznane narzędzia</h1><p>Wybierz narzędzie wskazane przez nauczyciela.</p></section>
    ${visibleTools.length ? `<div class="tool-shelf">${visibleTools.map((tool) => `<a class="tool-card" href="#${tool.route}"><span class="tool-icon">${icon(tool.icon)}</span><span><strong>${tool.title}</strong><small>${tool.description}</small></span>${icon('arrow')}</a>`).join('')}</div>` : `<div class="empty-state"><span class="empty-illustration">${icon('shelf')}</span><h2>Półka czeka na pierwsze narzędzie</h2><p>Po lekcji „Obsługuję mysz” pojawi się tutaj nowe ćwiczenie.</p><a class="button button-primary" href="#/home">Wróć do lekcji</a></div>`}
    <div class="shelf-preview" aria-label="Narzędzia, które pojawią się później"><p class="eyebrow">Później na półce</p><div>${tools.filter((tool) => !unlocked.includes(tool.id)).slice(0, 3).map((tool) => `<span>${icon('lock')} ${tool.title}</span>`).join('')}</div></div>`
  return { html: appLayout(content, student, '/workshop') }
}
