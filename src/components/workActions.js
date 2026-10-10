import { icon } from './icons.js'

export function workActions() {
  return `<div class="work-actions no-print" aria-label="Co chcesz zrobić z pracą?">
    <button class="button button-secondary" type="button" data-work-action="draft">Kontynuuj później</button>
    <button class="button button-primary" type="button" data-work-action="waiting-review">Pokaż nauczycielowi ${icon('arrow')}</button>
  </div>`
}

export function waitingReviewScreen() {
  return `<section class="completion-card" role="status" aria-live="polite">
    <span class="completion-check">${icon('check')}</span><p class="eyebrow">Zapisano</p>
    <h2>Praca czeka na nauczyciela.</h2><p>Możesz spokojnie wrócić do domu.</p>
    <a class="button button-primary" href="#/home">Wróć do domu</a>
  </section>`
}
