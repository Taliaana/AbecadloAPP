const paths = {
  home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z"/>',
  shelf: '<path d="M4 4h5v16H4zM10.5 7h4v13h-4zM16 5l3.6-.8L23 19l-3.6.8z"/>',
  works: '<path d="M5 3h11a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M18 7h2a1 1 0 0 1 1 1v13H7v-2"/>',
  path: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3"/>',
  mouse: '<rect x="7" y="2" width="10" height="20" rx="5"/><path d="M12 2v7M7 10h10"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 13h2m2 0h2m2 0h2m2 0h2M7 16h10"/>',
  brush: '<path d="m14 5 5 5M13 6l4-4 5 5-4 4M14 9l-8 8"/><path d="M10 18c-1 3-4 3-7 3 2-2 0-5 4-6"/>',
  robot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 7V3m-3 9h.01M15 12h.01M8 16h8"/><circle cx="12" cy="3" r="1"/>',
  sequence: '<rect x="3" y="4" width="6" height="6" rx="1"/><rect x="15" y="14" width="6" height="6" rx="1"/><path d="M9 7h6l-2-2m2 12H9l2 2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  leaf: '<path d="M20 4C11 4 5 9 5 16c0 2 1 4 3 5 0-7 4-11 10-14-5 4-8 8-8 14 7 0 11-6 10-17Z"/>',
  kite: '<path d="m12 3 7 8-7 5-7-5Z"/><path d="M12 16c0 4 4 2 4 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4m-5 0h10"/>',
  tower: '<rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="7" r="1.5"/><path d="M10 17h4"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 14h3v6H5a1 1 0 0 1-1-1Zm16 0h-3v6h2a1 1 0 0 0 1-1Z"/>',
}

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.leaf}</svg>`
}

export function avatar(profile, size = 'medium') {
  return `<span class="avatar avatar--${profile.color} avatar--${size}" aria-hidden="true">${icon(profile.avatar)}</span>`
}
