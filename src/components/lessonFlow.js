import { icon } from './icons.js'

export function createStepFlow(totalSteps) {
  let currentStep = 1
  let phase = 'activity'
  const completedSteps = new Set()

  return {
    get currentStep() { return currentStep },
    get phase() { return phase },
    get isFinalStep() { return currentStep === totalSteps },
    get completedSteps() { return new Set(completedSteps) },
    completeStep() {
      completedSteps.add(currentStep)
      phase = 'complete'
      return { step: currentStep, isFinal: currentStep === totalSteps, phase }
    },
    continue() {
      if (phase !== 'complete') return { advanced: false, finished: false }
      if (currentStep === totalSteps) return { advanced: false, finished: true }
      currentStep += 1
      phase = 'activity'
      return { advanced: true, finished: false, step: currentStep }
    },
  }
}

export function getCompletionModel({ final = false, nextLessonId = null, nextUnlocked = false } = {}) {
  return {
    kind: final ? 'lesson' : 'step',
    announcement: final ? 'Lekcja ukończona.' : 'Etap ukończony.',
    canContinue: !final,
    nextLessonId: final && nextUnlocked ? nextLessonId : null,
  }
}

export function completionScreen({ final = false, lessonTitle = '', nextLessonId = null, nextUnlocked = false, finalMessage = '' } = {}) {
  const model = getCompletionModel({ final, nextLessonId, nextUnlocked })
  if (!final) {
    return `<section class="completion-card completion-card--step" role="status" aria-live="polite">
      <span class="completion-check">${icon('check')}</span><p class="eyebrow">Gotowe</p>
      <h2>Ukończyłeś ten etap.</h2><p>Kliknij Dalej, kiedy jesteś gotowy.</p>
      <button class="button button--primary" type="button" data-step-continue>Dalej ${icon('arrow')}</button>
    </section>`
  }
  return `<section class="completion-card" role="status" aria-live="polite">
    <span class="completion-check">${icon('check')}</span><p class="eyebrow">Lekcja ukończona</p>
    <h2>${lessonTitle} ukończona.</h2><p>${finalMessage || (model.nextLessonId ? 'Następna lekcja jest już dostępna.' : 'Dobra praca. Możesz wrócić do domu.')}</p>
    <div class="completion-actions">
      <a class="button button--secondary" href="#/home">Wróć do domu</a>
      ${model.nextLessonId ? `<a class="button button--primary" href="#/lesson/${model.nextLessonId}">Przejdź dalej ${icon('arrow')}</a>` : ''}
    </div>
  </section>`
}
