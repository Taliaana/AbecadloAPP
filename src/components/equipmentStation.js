import { equipment, workstationImage } from '../data/computerEquipment.js'
import { escapeHtml } from '../utils/html.js'

export function equipmentImage(item, className = '') {
  return `<img class="equipment-image ${className}" src="${item.image}" alt="${escapeHtml(item.name)}" draggable="false" />`
}
export function equipmentStation(placed = new Set(), model = false) {
  if (model) return `<figure class="equipment-station equipment-station--model"><img class="equipment-image" src="${workstationImage}" alt="Stanowisko: monitor pośrodku, klawiatura przed nim, mysz obok, dwa głośniki po bokach monitora, komputer z lewej, drukarka z prawej." /></figure>`
  return `<div class="equipment-station ${model ? 'equipment-station--model' : ''}" ${model ? 'role="img" aria-label="Stanowisko: monitor pośrodku, klawiatura przed nim, mysz obok, głośniki po bokach, komputer z boku, drukarka w pobliżu."' : 'data-station aria-label="Ułóż sprzęt na biurku"'}><div class="equipment-desktop" aria-hidden="true"></div>${equipment.flatMap(item => (item.id === 'speakers' ? ['left', 'right'] : ['']).map(side => {
    const filled = model || placed.has(item.id)
    const inside = filled ? `<span class="equipment-station-object ${side ? `equipment-speaker equipment-speaker--${side}` : ''}">${equipmentImage(item)}</span>` : '<span aria-hidden="true">＋</span>'
    return model ? `<div class="equipment-slot equipment-slot--${item.id} ${side ? `equipment-slot--${side}` : ''}">${inside}</div>` : `<button type="button" class="equipment-slot equipment-slot--${item.id} ${side ? `equipment-slot--${side}` : ''} ${filled ? 'is-filled' : ''}" data-zone="${item.id}" aria-label="Miejsce: ${escapeHtml(item.name)}${filled ? ', ustawiono' : ''}">${inside}</button>`
  })).join('')}</div>`
}
