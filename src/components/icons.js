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
  class: '<path d="M4 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M15 5.5a3 3 0 0 1 0 5.5m2 3a4 4 0 0 1 3 4v2"/>',
  review: '<path d="M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8m-8 4h5m-5 4h3"/>',
  teacher: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0M18 4l3-1v5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 20h16"/>',
  print: '<path d="M7 8V3h10v5M7 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3"/><path d="M7 14h10v7H7z"/>',
  edit: '<path d="m4 20 4-.8L19 8.2 15.8 5 4.8 16Z"/><path d="m14.5 6.3 3.2 3.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
}

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.leaf}</svg>`
}

export function avatar(profile, size = 'medium') {
  const config = profile.avatarConfig || { face: 'round', hair: 'short', hairColor: 'brown', shirtColor: profile.color || 'green', backgroundColor: profile.color || 'mint' }
  const allowed = (value, options, fallback) => options.includes(value) ? value : fallback
  const face = allowed(config.face, ['round', 'soft', 'wide'], 'round')
  const hair = allowed(config.hair, ['short', 'bob', 'tufts'], 'short')
  const hairColor = allowed(config.hairColor, ['dark', 'brown', 'gold', 'copper'], 'brown')
  const shirtColor = allowed(config.shirtColor, ['green', 'blue', 'yellow', 'coral'], 'green')
  const background = allowed(config.backgroundColor, ['mint', 'sky', 'sand', 'rose'], 'mint')
  const faceShapes = {
    round: '<ellipse cx="32" cy="29" rx="15" ry="17"/>',
    soft: '<path d="M17 24c0-10 6-16 15-16s15 6 15 16c0 12-6 21-15 21s-15-9-15-21Z"/>',
    wide: '<ellipse cx="32" cy="29" rx="18" ry="15"/>',
  }
  const hairShapes = {
    short: '<path d="M17 25c-1-11 5-18 15-18 9 0 15 6 15 17-5-5-10-7-17-7-5 0-9 3-13 8Z"/>',
    bob: '<path d="M15 28C13 15 20 6 32 6s19 9 17 22l-5 9-2-14c-6-6-14-7-21 0l-1 14Z"/>',
    tufts: '<path d="M17 24c0-9 5-16 14-17l2-5 3 6 6-3-1 7c4 3 6 7 6 12-5-5-10-7-15-7s-10 2-15 7Z"/>',
  }
  return `<span class="avatar avatar--${size} avatar-bg--${background}" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><path class="avatar-shirt avatar-shirt--${shirtColor}" d="M10 64c1-13 9-20 22-20s21 7 22 20Z"/><g class="avatar-skin avatar-face--${face}">${faceShapes[face]}</g><g class="avatar-hair avatar-hair--${hairColor}">${hairShapes[hair]}</g><circle cx="26" cy="30" r="1.4"/><circle cx="38" cy="30" r="1.4"/><path d="M28 36c2.5 2 5.5 2 8 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>`
}
