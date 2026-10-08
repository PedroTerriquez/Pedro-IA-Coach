// Amigos is used between sets, so its actions are thumb-sized (52 px) instead of
// the compact shared Button. Passed through Button's `style` prop so the shared
// component keeps its look everywhere else.
const TEXT_SIZE = 'height:48px;font-size:15px;font-weight:500;gap:8px'

export const TOUCH = 'height:52px;border-radius:16px;font-size:16px;font-weight:600;letter-spacing:-0.2px;gap:8px;padding:0 18px'
export const TOUCH_SECONDARY = `${TOUCH};color:var(--text)`
export const TOUCH_TEXT = `${TEXT_SIZE};color:var(--text-secondary)`
// On top of Button's `danger` variant: keeps its red, drops its fill.
export const TOUCH_DANGER_TEXT = `${TEXT_SIZE};background:transparent`
export const TOUCH_PILL = 'height:44px;border-radius:999px;font-size:14px;font-weight:600;gap:8px;padding:0 18px;color:var(--text)'
