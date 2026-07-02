# Design System / Style Guide (LoadPulse)

> Fill in actual tokens from `src/index.css` / component styles as they're formalized. Scaffold below.

## 1. Theming
- Light / Dark mode support (confirm source of truth — CSS vars vs Tailwind config)
- Theme toggle persisted locally (localStorage), no server sync needed

## 2. Color roles
| Role | Usage |
|---|---|
| Primary | Run button, active nav, key CTAs |
| Success | 2xx status, passed SLA gate, Apdex "satisfied" |
| Warning | 4xx status, Apdex "tolerating" |
| Danger | 5xx/network failures, Apdex "frustrated", failed SLA gate |
| Neutral/Muted | Chart gridlines, secondary text, disabled controls |

## 3. Chart conventions
- Latency-over-time: line chart, x = elapsed time, y = ms
- Throughput: bar/line, x = elapsed time, y = requests/sec
- Status distribution: stacked/grouped by 2xx/4xx/5xx/network using the color roles above
- Consistent color-per-series across all charts in a single report (don't remap colors between latency chart and status chart)

## 4. Typography
- Monospace font for: cURL input, JSON export preview, CLI output blocks
- Standard UI font for: labels, buttons, nav

## 5. Components inventory (`src/components`)
- Document each shared component's purpose + props here as they stabilize (form controls, chart wrappers, result cards, export buttons)

## 6. Accessibility baseline
- Color is never the only signal for pass/fail (pair with icon/text — important since success/danger colors carry real meaning here)
- Charts need accessible text summaries (screen-reader users can't read a live line chart)
- Keyboard-operable run/stop controls
