export const workStatuses = ['draft', 'waiting-review', 'completed', 'returned']

export const workStatusLabels = {
  draft: 'W trakcie',
  'waiting-review': 'Czeka na obejrzenie',
  completed: 'Zakończona',
  returned: 'Do kontynuowania',
}

export function isWorkStatus(status) {
  return workStatuses.includes(status)
}
