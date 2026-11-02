import { icon } from '../../components/icons.js'

// Uses the same completion surface as lessons, in the browser's accessible top layer.
export function robotCompletionHtml({ nextTask, alternative = false, prediction = false }) {
  return `<dialog class="robot-completion" data-robot-complete aria-labelledby="robot-complete-title" aria-describedby="robot-complete-message" hidden>
    <section class="completion-card"><button class="button button-icon robot-completion-close" type="button" data-dismiss-completion aria-label="Wróć do programu">×</button>
    <span class="completion-check" aria-hidden="true">${icon('check')}</span><h2 id="robot-complete-title">Gotowe</h2>
    <p id="robot-complete-message" data-completion-text role="status"></p>${prediction ? '<p data-prediction-position></p><button type="button" class="button button-ghost" data-view-route>Obejrzyj trasę</button>' : ''}
    <p class="robot-completion-note" data-completion-note></p>
    <div class="completion-actions">${nextTask ? `<a class="button button-primary" data-next-robot-task href="#/tools/robot?challenge=${nextTask}" hidden>Następne zadanie ${icon('arrow')}</a>` : ''}<a class="button button-secondary" data-return-robot href="#/tools/robot">Wróć do Robota</a></div>
    ${alternative ? '<button class="button button-secondary" type="button" data-other-route>Czy znajdziesz inną drogę?</button>' : ''}<button class="button button-ghost" type="button" data-repeat-program>Spróbuj ponownie</button></section></dialog>`
}
