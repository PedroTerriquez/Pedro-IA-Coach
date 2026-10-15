# Platform Context

## Device & Browser
- **Device**: iPhone with iOS (PWA installed from Safari)
- **Browser**: Safari (PWA standalone mode)
- **Notifications**: Web Push via Cloudflare Worker; `showNotification()` actions NOT supported on iOS
- **Watch mirror**: Notifications mirror to Apple Watch, but long-press actions don't work on iOS. "Iniciar" starts the rest on the tap (timer up, delayed push queued) and sends the start notification 3s later (time to lock the phone, so it reaches the Watch) without blocking; the tap only opens the app on a rest that's already running. When the rest ends, the full-screen timer stays up in phase `done` asking for the next serie. Full cycle: `docs/superpowers/specs/2026-09-24-ciclo-de-series-descanso-design.md`

## Key Constraints
- iOS suspends all JS (setTimeout, fetch, postMessage) when backgrounded — only server-timed mechanisms (Worker queue → Web Push) can deliver at exact times
- Single subscription (one device at a time)
- No runtime backend — everything client-side + Cloudflare Worker for push/AI