const BRAND_PATHS = Object.freeze({
  logo: '/brand/pinktower-logo.png',
  icon: '/brand/pinktower-icon.png',
})

export function brandLockup(className = '') {
  return `<span class="brand-lockup ${className}" aria-hidden="true"><img class="brand-logo brand-logo--header" src="${BRAND_PATHS.logo}" alt="" /></span>`
}

export function brandLogo(className = '') {
  return `<img class="brand-logo ${className}" src="${BRAND_PATHS.logo}" alt="PinkTower" />`
}
