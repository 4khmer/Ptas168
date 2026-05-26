/**
 * Telegram Mini App helpers
 */

export const tg = window.Telegram?.WebApp || null

export function isTelegramWebApp() {
  return !!(window.Telegram?.WebApp?.initData)
}

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  if (tg.setHeaderColor) tg.setHeaderColor('#ff385c')
  // Bot API 7.7+: prevents swipe-down gestures inside the app body from
  // minimizing/dismissing the Mini App. The Telegram header can still be
  // swiped by the user, which keeps the native escape route available.
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
  // Native confirm popup before the WebApp closes — fired when the user
  // taps the close (X) button in the Telegram chrome.
  if (tg.enableClosingConfirmation) tg.enableClosingConfirmation()
  // Marker class so CSS can adjust layout for the Telegram chrome.
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('tg-app')
  }
  // Push Telegram's safe-area insets into CSS variables so the layout
  // can pad around the Telegram header / system status bar / bottom
  // chrome. These are the authoritative values — env() can return 0
  // inside the Telegram WebView even when there IS chrome to avoid.
  applyTelegramInsets()
  for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged']) {
    try { tg.onEvent?.(ev, applyTelegramInsets) } catch { /* SDK too old */ }
  }
}

function applyTelegramInsets() {
  if (!tg || typeof document === 'undefined') return
  // contentSafeAreaInset wraps the area where Telegram WON'T draw chrome
  // over the WebApp; safeAreaInset is the system inset (status bar, notch).
  // We want max of both so we never overlap either.
  const sys = tg.safeAreaInset || {}
  const ctx = tg.contentSafeAreaInset || {}
  const top    = Math.max(sys.top || 0,    ctx.top || 0)
  const bottom = Math.max(sys.bottom || 0, ctx.bottom || 0)
  const left   = Math.max(sys.left || 0,   ctx.left || 0)
  const right  = Math.max(sys.right || 0,  ctx.right || 0)
  const root = document.documentElement.style
  root.setProperty('--tg-safe-top',    `${top}px`)
  root.setProperty('--tg-safe-bottom', `${bottom}px`)
  root.setProperty('--tg-safe-left',   `${left}px`)
  root.setProperty('--tg-safe-right',  `${right}px`)
}

/**
 * Trigger native haptic feedback (vibration) inside Telegram.
 * `style` is one of 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'.
 * No-op outside the Telegram WebApp.
 */
export function hapticImpact(style = 'light') {
  try { tg?.HapticFeedback?.impactOccurred(style) } catch { /* noop */ }
}

/**
 * Show the Telegram BackButton (top-left of the Telegram header) and
 * route taps through `handler`. The handler is wrapped to fire a light
 * haptic impact before running. Returns a cleanup function that removes
 * the handler and hides the button — call from a useEffect cleanup.
 */
export function showBackButton(handler) {
  if (!tg?.BackButton) return () => {}
  const wrapped = () => {
    hapticImpact('light')
    handler()
  }
  tg.BackButton.onClick(wrapped)
  tg.BackButton.show()
  return () => {
    tg.BackButton.offClick(wrapped)
    tg.BackButton.hide()
  }
}

export function hideBackButton() {
  if (!tg?.BackButton) return
  tg.BackButton.hide()
}
