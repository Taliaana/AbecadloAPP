export function progressDots(progress, limit = 6) {
  return `<div class="progress-dots" aria-label="Postęp pierwszych ${limit} lekcji">
    ${Array.from({ length: limit }, (_, index) => {
      const status = progress[index + 1]
      const symbol = status === 'completed' ? '✓' : status === 'available' || status === 'in-progress' ? '●' : '○'
      const label = status === 'completed' ? 'ukończona' : status === 'available' || status === 'in-progress' ? 'aktualna' : 'przyszła'
      return `<span class="progress-dot progress-dot--${status}" aria-label="Lekcja ${index + 1}: ${label}">${symbol}</span>`
    }).join('')}
  </div>`
}
