# Design Tokens

## Colors (CSS Variables)
- `--bg`: #0a0a0a
- `--surface`: #141414
- `--text`: #fafafa
- `--accent`: #d4ff3a (configurable via settings)
- `--border`: rgba(255,255,255,0.06)

## Typography
- **Headings/UI**: Space Grotesk
- **Data/Numbers**: JetBrains Mono

## Spacing & Corners
- Cards: 14-18px border-radius
- Sheets/Modals: 20-28px border-radius
- Tab bar: 9999px (fully rounded)
- Tab bar: glassmorphism with `backdrop-filter: blur`

## Theme
- Dark mode only (mobile-first iPhone PWA)
- Desktop browsers work too (`npm run dev`)