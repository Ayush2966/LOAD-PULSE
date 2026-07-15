# Design System / Style Guide (LoadPulse)

Source of truth: `src/index.css` (CSS custom properties + utility classes). The look is a GitHub-dark-inspired dark theme with a light override. No CSS framework — hand-written vars + utility classes.

## 1. Theming
- **Mechanism:** CSS custom properties on `:root` (dark, the default) with a `[data-theme="light"]` override block. Components only reference `var(--token)`, never raw hex.
- **Toggle:** dark/light switch in the top nav, persisted to `localStorage` key **`_lp_theme`**; default is dark.
- **PWA:** manifest `theme_color`/`background_color` = `#0d1117` (matches dark `--bg`).

## 2. Color tokens (`src/index.css`)
| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg` | `#0d1117` | `#f6f8fa` | App background, inputs, log/code panels |
| `--bg1` | `#161b22` | `#ffffff` | Cards, top nav, elevated surfaces |
| `--bg2` | `#21262d` | `#f0f2f4` | Stat boxes, pills, hover rows |
| `--bg3` | `#30363d` | `#d0d7de` | Progress track, scrollbar thumb |
| `--border` / `--border2` | `#30363d` / `#484f58` | `#d0d7de` / `#afb8c1` | Hairlines, input borders |
| `--text` / `--text2` / `--text3` | `#e6edf3` / `#8b949e` / `#6e7681` | (light equivalents) | Primary / secondary / tertiary text |
| `--accent` / `--accent-h` | `#388bfd` / `#58a6ff` | `#0969da` / `#0550ae` | Primary CTA, active nav/tab, links |
| `--green` (+ `--green-t` tint) | `#2ea043` / `#1f6129` | `#1a7f37` / `#d1f0d9` | Success / 2xx / passed SLA / satisfied |
| `--yellow` (+ `--yellow-t`) | `#d29922` / `#5a3e00` | `#9a6700` / `#faecc7` | Warning / 4xx / tolerating |
| `--red` (+ `--red-t`) | `#da3633` / `#6d1b17` | `#cf222e` / `#ffd8d8` | Danger / 5xx+net / failed SLA / frustrated |
| `--orange` | `#db6d28` | `#bc4c00` | Secondary alert accent |

Other tokens: `--radius` `6px`, `--radius-lg` `10px`, `--shadow` `0 1px 3px rgba(0,0,0,.4)`.

## 3. Color roles → tokens
| Role | Tokens / classes |
|---|---|
| Primary | `--accent` / `--accent-h` — `.btn-primary`, `.pattern-tab.active`, `.nav-link.active` |
| Success | `--green` / `--green-t` — `.badge-green`, `.text-green`, `.cmp-win` |
| Warning | `--yellow` / `--yellow-t` — `.badge-yellow` |
| Danger | `--red` / `--red-t` — `.btn-danger`, `.badge-red`, `.text-red`, `.threshold-msg`, `.cmp-lose` |
| Info | `--accent-h` on `#1e3a5f` — `.badge-blue` |
| Neutral/Muted | `--text2`/`--text3`, `--border`, `--bg2`/`--bg3` — gridlines, secondary text, disabled controls |

## 4. Chart conventions (`src/components`)
- **Latency over time** (`LatencyChart`): canvas line chart, x = elapsed time, y = ms
- **Throughput** (`ThroughputChart`): canvas, x = elapsed time, y = requests/sec
- **Latency histogram** (`Histogram`): distribution of request latencies into buckets
- **Status distribution** (`StatusDist`): CSS bar rows (`.dist-bar`) grouped by 2xx/4xx/5xx/network using the semantic color roles above
- **Per-node latency** (`NodeLatencyBars`): swarm-only, one bar per connected node
- Keep color-per-series consistent across all charts in a single report (don't remap 2xx-green between the status chart and the latency chart)
- Numbers use `font-variant-numeric: tabular-nums` (`.stat-value`, tables) so columns align

## 5. Typography
- Base: 14px / line-height 1.5, system sans (`--font`: `-apple-system, BlinkMacSystemFont, 'Segoe UI', …`)
- **Monospace** (`--font-mono`: `ui-monospace, SFMono-Regular, …`) for: all `input`/`textarea`/`select`, cURL input (`.curl-area`), pills, log feed, code blocks, `kbd`
- Section/card/stat labels: 11px, `600`, uppercase, letter-spaced, `--text3`
- `.stat-value`: 22px `600`, tabular numerals

## 6. Component inventory (`src/components`)
- **Input / config:** `CurlInput`, `PostmanImport`, `PatternPicker`, `StepEditor`, `SuccessCriteria`, `Presets`, `ChainBuilder`
- **Live run display:** `LiveStats`, `ProgressBar`, `LogFeed`, `StatusDist`
- **Charts / metrics:** `LatencyChart`, `ThroughputChart`, `Histogram`, `PercentileTable`, `ApdexCard`, `NodeLatencyBars`
- **Report / export / share:** `ReportView` (final report + Share / JSON / Markdown / CSV / Excel buttons), `ExportConfigButton` (CLI config JSON)
- **Swarm:** `QrCode`, `NodeLatencyBars`
- Common building blocks (CSS): `.card` / `.card-title`, `.btn`/`.btn-primary`/`.btn-danger`/`.btn-ghost`/`.btn-sm`, `.badge-*`, `.stat-box`, `.pill`, `.pattern-tab`

## 7. Layout & responsive
- Shell: sticky 52px `.top-nav` + centered `.page-content` (max-width 1100px)
- Breakpoints: `860px` (config columns collapse), `700px` (charts/compare single-column), `600px` (mobile — hamburger nav dropdown, condensed padding, hidden history columns)
- Cards use `--radius-lg`; controls use `--radius`

## 8. Accessibility baseline
- Color is never the only signal for pass/fail — status badges carry text (`.badge-green` "PASS", etc.) alongside color
- Keyboard-operable run/stop controls (⌘/Ctrl+Enter to run, Esc to stop)
- ⚠️ Gap: canvas charts have no screen-reader text summary yet — pair live charts with the textual percentile/stat readouts (a text-summary layer is a future improvement)
