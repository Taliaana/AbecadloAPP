import { icon } from './icons.js'
import { escapeHtml } from '../utils/html.js'

export function emptyState(title, description, symbol = 'works') {
  return `<section class="empty-state"><span class="empty-illustration" aria-hidden="true">${icon(symbol)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`
}
