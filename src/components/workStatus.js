import { workStatusLabels } from '../data/workModel.js'

export function workStatus(status) {
  return `<span class="status-badge status-badge--${status}">${workStatusLabels[status] || status}</span>`
}
