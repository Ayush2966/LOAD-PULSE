export default function Docs() {
  return (
    <div className="docs-page">

      {/* Hero */}
      <div className="docs-hero">
        <div className="docs-hero-icon">⚡</div>
        <h1 className="docs-hero-title">LoadPulse Documentation</h1>
        <p className="docs-hero-sub">Everything you need to load-test any API — from a single cURL command to complex chained auth flows.</p>
      </div>

      {/* TOC */}
      <div className="docs-toc card">
        <div className="card-title">On this page</div>
        <div className="docs-toc-grid">
          {[
            ['#quickstart', '1. Quick Start'],
            ['#curl', '2. cURL Input'],
            ['#variables', '3. Variable Injection'],
            ['#patterns', '4. Load Patterns'],
            ['#criteria', '5. Success Criteria'],
            ['#chaining', '6. Request Chaining'],
            ['#charts', '7. Live Charts'],
            ['#report', '8. Final Report'],
            ['#export', '9. Export'],
            ['#history', '10. History & Compare'],
            ['#shortcuts', '11. Keyboard Shortcuts'],
            ['#presets', '12. Presets'],
            ['#postman', '13. Postman Import'],
            ['#apdex', '13. Apdex & SLA'],
            ['#sharing', '13. Sharing Reports'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="docs-toc-link">{label}</a>
          ))}
        </div>
      </div>

      {/* 1. Quick Start */}
      <section id="quickstart" className="docs-section">
        <h2 className="docs-h2">1. Quick Start</h2>
        <div className="docs-steps">
          {[
            ['Paste your cURL', 'Copy any cURL command from your browser DevTools, Postman, or terminal and paste it into the cURL input box at the top of the Run page.'],
            ['Pick a load pattern', 'Choose Constant for a steady rate, Ramp to gradually increase load, or Spike to simulate a traffic burst.'],
            ['Set rate & duration', 'Configure how many requests per second and for how long. Start small — 5 req/s for 30 seconds is a good first test.'],
            ['Hit Run Test', 'Click the button (or press ⌘↵). Charts and stats update live. Press Esc or click Stop to end early.'],
            ['Read the report', 'When the test finishes, scroll down to see success rate, latency percentiles, failure breakdown, and export options.'],
          ].map(([title, desc], i) => (
            <div key={i} className="docs-step">
              <div className="docs-step-num">{i + 1}</div>
              <div>
                <div className="docs-step-title">{title}</div>
                <div className="docs-step-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. cURL Input */}
      <section id="curl" className="docs-section">
        <h2 className="docs-h2">2. cURL Input</h2>
        <p className="docs-p">Paste any valid cURL command. LoadPulse parses it automatically and shows a confirmation line with the detected method, URL, header count, and body.</p>
        <div className="docs-code-block">
          <div className="docs-code-label">Supported flags</div>
          <pre>{`curl -X POST https://api.example.com/endpoint \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'

# Also supported:
#   --json          (sets Content-Type + body)
#   -u user:pass    (Basic auth)
#   --url           (explicit URL flag)
#   --data-raw      (same as -d)`}</pre>
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>You can copy cURL from Chrome DevTools → Network tab → right-click any request → <strong>Copy as cURL</strong>.</span>
        </div>
      </section>

      {/* 3. Variable Injection */}
      <section id="variables" className="docs-section">
        <h2 className="docs-h2">3. Variable Injection</h2>
        <p className="docs-p">Use template variables anywhere in your cURL — URL, headers, or body. Each request gets a freshly generated value, making every call unique.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Variable</th><th>Output example</th><th>Use case</th></tr></thead>
            <tbody>
              <tr><td><code>{'{{uuid}}'}</code></td><td>550e8400-e29b-41d4-a716-446655440000</td><td>Unique request IDs, idempotency keys</td></tr>
              <tr><td><code>{'{{timestamp}}'}</code></td><td>1719825600000</td><td>Unix ms timestamps, cache-busting</td></tr>
              <tr><td><code>{'{{random_int}}'}</code></td><td>47382</td><td>Random numbers 0–99999</td></tr>
              <tr><td><code>{'{{random_int:1:100}}'}</code></td><td>42</td><td>Random int in a custom range (min:max)</td></tr>
              <tr><td><code>{'{{chain.token}}'}</code></td><td>eyJhbGci...</td><td>Value extracted from a chain step (see §6)</td></tr>
            </tbody>
          </table>
        </div>
        <div className="docs-code-block">
          <div className="docs-code-label">Example — unique body per request</div>
          <pre>{`curl -X POST https://api.example.com/orders \\
  -H "Idempotency-Key: {{uuid}}" \\
  -H "Content-Type: application/json" \\
  -d '{"orderId":"{{uuid}}","qty":{{random_int:1:10}}}'`}</pre>
        </div>
      </section>

      {/* 4. Load Patterns */}
      <section id="patterns" className="docs-section">
        <h2 className="docs-h2">4. Load Patterns</h2>
        <p className="docs-p">LoadPulse supports five traffic shapes. Pick the one that matches how real users hit your API.</p>
        <div className="docs-patterns">
          {[
            {
              name: 'Constant',
              icon: '▬',
              color: '#388bfd',
              desc: 'Sends a fixed number of requests every second for the entire duration. Best for baseline benchmarks — "how does my API behave under steady load?"',
              params: ['Rate — requests per second or per minute', 'Duration — how long to run (seconds or minutes)', 'Concurrency — max simultaneous in-flight requests', 'Timeout — per-request timeout in ms'],
            },
            {
              name: 'Ramp',
              icon: '↗',
              color: '#2ea043',
              desc: 'Linearly increases the request rate from a start value to an end value over the duration. Good for finding the breaking point — keep going until error rate climbs.',
              params: ['Start req/s — initial rate', 'End req/s — final rate at the end of the ramp', 'Duration — ramp length', 'Concurrency — max in-flight requests'],
            },
            {
              name: 'Step',
              icon: '⌐',
              color: '#d29922',
              desc: 'Runs through a user-defined sequence of steps, each with its own rate and duration. Perfect for capacity planning — test 10/s, then 50/s, then 100/s, see where things break.',
              params: ['Steps — list of (rate, duration) pairs', 'Concurrency — shared cap across all steps', 'Timeout — per-request timeout'],
            },
            {
              name: 'Spike',
              icon: '⚡',
              color: '#f85149',
              desc: 'Runs at a low base rate, then fires a sudden burst at 40% of the total duration, then returns to base. Simulates a flash sale, viral moment, or marketing email drop.',
              params: ['Base req/s — quiet traffic rate', 'Spike req/s — burst rate', 'Total duration — full test length (s)', 'Burst duration — how long the spike lasts (s)'],
            },
            {
              name: 'Soak',
              icon: '⏳',
              color: '#bc8cff',
              desc: 'Runs a low, steady rate for a long time (minutes to hours). Not about maximum throughput — about finding memory leaks, connection pool exhaustion, and gradual degradation.',
              params: ['Rate req/s — low sustained rate', 'Duration — minutes or hours', 'Concurrency — keep this low (5–20)'],
            },
          ].map(p => (
            <div key={p.name} className="docs-pattern-card">
              <div className="docs-pattern-header">
                <span className="docs-pattern-icon" style={{ background: p.color + '22', color: p.color }}>{p.icon}</span>
                <span className="docs-pattern-name">{p.name}</span>
              </div>
              <p className="docs-pattern-desc">{p.desc}</p>
              <div className="docs-pattern-params">
                <div className="docs-param-label">Parameters</div>
                <ul>{p.params.map(param => <li key={param}>{param}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Success Criteria */}
      <section id="criteria" className="docs-section">
        <h2 className="docs-h2">5. Success Criteria</h2>
        <p className="docs-p">By default, any 2xx response is a success. You can tighten or loosen this with custom criteria.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Setting</th><th>What it does</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Status code range</strong></td>
                <td>A response is only counted as success if its HTTP status is within this range. Default 200–299. Change to 200–499 if redirects and client errors are acceptable.</td>
              </tr>
              <tr>
                <td><strong>Max latency (ms)</strong></td>
                <td>If a response takes longer than this threshold, it counts as a failure even if the status code was OK. Useful for SLA testing.</td>
              </tr>
              <tr>
                <td><strong>Body must contain</strong></td>
                <td>The response body must include this exact substring. Useful when your API always returns 200 but signals errors in the body (e.g. <code>{'"status":"error"'}</code>).</td>
              </tr>
              <tr>
                <td><strong>Auto-stop on error rate</strong></td>
                <td>Stops the test automatically if the rolling error rate exceeds the configured percentage. Prevents hammering a failing service.</td>
              </tr>
              <tr>
                <td><strong>Capture response body</strong></td>
                <td>When enabled, stores the first 300 chars of failed response bodies so you can see the actual error messages in the report.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Request Chaining */}
      <section id="chaining" className="docs-section">
        <h2 className="docs-h2">6. Request Chaining</h2>
        <p className="docs-p">Most real-world APIs require authentication. Request chaining lets you run a setup request once before the load test starts, extract values from its response, and inject them into every load test request.</p>
        <div className="docs-steps">
          {[
            ['Expand "Request Chaining"', 'Click the Request Chaining card on the Run page to expand it.'],
            ['Add a setup step', 'Paste your login or token-fetch cURL into the setup step. This runs once, not during the load test.'],
            ['Add an extractor', 'Click "+ Extract variable". Give it a name (e.g. token), choose source (body or header), and enter the JSON path (e.g. data.access_token).'],
            ['Use it in your main cURL', 'In your main cURL command, reference it as {{chain.token}}. Every load test request will use the real token.'],
          ].map(([title, desc], i) => (
            <div key={i} className="docs-step">
              <div className="docs-step-num">{i + 1}</div>
              <div><div className="docs-step-title">{title}</div><div className="docs-step-desc">{desc}</div></div>
            </div>
          ))}
        </div>
        <div className="docs-code-block">
          <div className="docs-code-label">Chain step — login request</div>
          <pre>{`curl -X POST https://api.example.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"secret"}'

# Extract: chain.token  from body  path: data.accessToken`}</pre>
        </div>
        <div className="docs-code-block">
          <div className="docs-code-label">Main cURL — uses extracted token</div>
          <pre>{`curl https://api.example.com/users/me \\
  -H "Authorization: Bearer {{chain.token}}"`}</pre>
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">⚠️</span>
          <span>The chain runs once before the test. If the token expires mid-test (short-lived JWTs), re-run the test to get a fresh one.</span>
        </div>
      </section>

      {/* 7. Charts */}
      <section id="charts" className="docs-section">
        <h2 className="docs-h2">7. Live Charts</h2>
        <div className="docs-cards-grid">
          {[
            {
              title: 'Latency over time',
              icon: '📈',
              desc: 'Scatter plot of every request\'s latency (y-axis, ms) plotted against when it fired (x-axis, seconds). Green dots = success, red dots = failure.',
              details: ['Helps spot latency spikes at a specific point in time', 'A cluster of red dots reveals when failures started', 'Watch for upward drift in soak tests — it signals memory leaks'],
            },
            {
              title: 'Throughput (req/s)',
              icon: '⚡',
              desc: 'Line chart showing how many requests actually completed per second. Compare this to your target rate to see if the server can keep up.',
              details: ['Flat line = server processing at your set rate', 'Downward slope = server slowing down under load', 'Useful for verifying ramp patterns are working correctly'],
            },
            {
              title: 'Status distribution',
              icon: '🟦',
              desc: 'Horizontal bar chart showing how responses are distributed across 2xx, 3xx, 4xx, 5xx, and network errors.',
              details: ['2xx (green) = successful responses', '4xx (yellow) = client errors (bad auth, wrong input)', '5xx (red) = server errors', 'net (purple) = timeouts and connection failures'],
            },
            {
              title: 'Latency histogram',
              icon: '📊',
              desc: 'Groups all requests into latency buckets (0–50ms, 50–100ms, etc.) showing the distribution shape.',
              details: ['A tight distribution = predictable performance', 'A long right tail = occasional very slow requests (check p99)', 'Most requests should fall in the first 2–3 buckets'],
            },
          ].map(c => (
            <div key={c.title} className="docs-chart-card">
              <div className="docs-chart-icon">{c.icon}</div>
              <div>
                <div className="docs-chart-title">{c.title}</div>
                <p className="docs-chart-desc">{c.desc}</p>
                <ul className="docs-chart-details">{c.details.map(d => <li key={d}>{d}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Report */}
      <section id="report" className="docs-section">
        <h2 className="docs-h2">8. Final Report</h2>
        <p className="docs-p">When the test finishes, the full report appears below the charts. Here's what every number means.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Metric</th><th>What it means</th><th>Good range</th></tr></thead>
            <tbody>
              <tr><td><strong>Success Rate</strong></td><td>% of requests that matched your success criteria (status code, latency, body check)</td><td>≥ 99%</td></tr>
              <tr><td><strong>Total / OK / Failed</strong></td><td>Raw request counts. Failed = anything that didn't match your success criteria</td><td>Failed = 0</td></tr>
              <tr><td><strong>Req/s</strong></td><td>Actual throughput achieved — total requests divided by elapsed time</td><td>Should match target rate</td></tr>
              <tr><td><strong>Avg latency</strong></td><td>Mean response time. Sensitive to outliers — use p95/p99 for SLA decisions</td><td>Depends on API</td></tr>
              <tr><td><strong>p50</strong></td><td>50% of requests completed within this time. The "typical" user experience</td><td>&lt; 200ms</td></tr>
              <tr><td><strong>p75</strong></td><td>75th percentile. Most users see at most this latency</td><td>&lt; 500ms</td></tr>
              <tr><td><strong>p90</strong></td><td>90th percentile. Only 1 in 10 requests is slower than this</td><td>&lt; 1s</td></tr>
              <tr><td><strong>p95</strong></td><td>Common SLA target — 95% of requests must be faster than this</td><td>&lt; 1s</td></tr>
              <tr><td><strong>p99</strong></td><td>The tail — 1 in 100 requests is slower. Catches worst-case behaviour</td><td>&lt; 2s</td></tr>
              <tr><td><strong>Max</strong></td><td>The single slowest request. Often a timeout or GC pause</td><td>Check if it's a timeout</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="docs-h3">Failure types</h3>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Badge</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><span className="badge badge-red">net</span></td><td>Network error — timeout, DNS failure, connection refused, or CORS block</td></tr>
              <tr><td><span className="badge badge-yellow">h4xx</span></td><td>4xx HTTP error — bad request, unauthorized, not found, rate-limited</td></tr>
              <tr><td><span className="badge badge-red">h5xx</span></td><td>5xx HTTP error — server crashed, gateway error, overloaded</td></tr>
              <tr><td><span className="badge badge-blue">lat</span></td><td>Latency threshold exceeded — request succeeded but was too slow</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Export */}
      <section id="export" className="docs-section">
        <h2 className="docs-h2">9. Export</h2>
        <p className="docs-p">After a test completes, the report section shows four export buttons.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Button</th><th>What you get</th></tr></thead>
            <tbody>
              <tr><td><strong>↓ JSON</strong></td><td>Full report as a JSON file — meta, all failure groups with body samples. Good for storing in CI artifacts or feeding into dashboards.</td></tr>
              <tr><td><strong>⎘ Markdown</strong></td><td>Copies a formatted markdown table to clipboard. Paste directly into GitHub issues, Notion, or Slack.</td></tr>
              <tr><td><strong>↓ CSV</strong></td><td>Every individual request as a CSV row — timestamp, status, latency, ok/fail, message. Import into Excel, Google Sheets, or Grafana.</td></tr>
              <tr><td><strong>↓ Excel (.xlsx)</strong></td><td>Three-sheet Excel workbook: Request Log, Summary metrics, and Failures. Share with non-technical stakeholders.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 10. History & Compare */}
      <section id="history" className="docs-section">
        <h2 className="docs-h2">10. History & Compare</h2>
        <p className="docs-p">LoadPulse automatically saves the last 10 test runs in your browser's localStorage — no account needed.</p>
        <div className="docs-cards-grid">
          <div className="docs-info-card">
            <div className="docs-info-title">📋 History page</div>
            <p>Shows a table of all past runs with key metrics. Click <strong>Select</strong> next to any run to see a detailed breakdown below the table. Select two runs to compare them side-by-side with green/red win indicators.</p>
          </div>
          <div className="docs-info-card">
            <div className="docs-info-title">⚖️ Compare page</div>
            <p>Dedicated side-by-side comparison. Select Run A and Run B from dropdowns. Every metric is highlighted — green = better, red = worse — so you can instantly see whether a code change improved or degraded performance.</p>
          </div>
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>History is stored in <code>localStorage</code> under key <code>_alt2_hist</code>. It persists across browser sessions but is cleared if you clear site data. Export your report as JSON before clearing.</span>
        </div>
      </section>

      {/* 11. Keyboard Shortcuts */}
      <section id="shortcuts" className="docs-section">
        <h2 className="docs-h2">11. Keyboard Shortcuts</h2>
        <div className="docs-shortcuts">
          {[
            ['⌘ ↵', 'Ctrl + Enter', 'Start the test (only works if a valid cURL is pasted)'],
            ['Esc', 'Esc', 'Stop a running test immediately'],
          ].map(([mac, win, desc]) => (
            <div key={mac} className="docs-shortcut-row">
              <div className="docs-shortcut-keys">
                <kbd>{mac}</kbd>
                <span className="docs-shortcut-sep">/</span>
                <kbd>{win}</kbd>
              </div>
              <span className="docs-shortcut-desc">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 12. Presets */}
      <section id="presets" className="docs-section">
        <h2 className="docs-h2">12. Presets</h2>
        <p className="docs-p">Save your current cURL + pattern + rate/duration as a named preset so you don't have to reconfigure every time.</p>
        <div className="docs-steps">
          {[
            ['Configure your test', 'Paste your cURL, set your pattern and rate settings.'],
            ['Open Presets', 'Click the Presets card to expand it.'],
            ['Save current', 'Click "Save current", enter a name (e.g. "Auth API - 50rps"), and press OK.'],
            ['Load later', 'Click any preset chip to instantly restore the saved cURL and settings. Click × to delete a preset.'],
          ].map(([title, desc], i) => (
            <div key={i} className="docs-step">
              <div className="docs-step-num">{i + 1}</div>
              <div><div className="docs-step-title">{title}</div><div className="docs-step-desc">{desc}</div></div>
            </div>
          ))}
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>Presets are saved in <code>localStorage</code> and persist across sessions. They store the cURL command, pattern type, and rate/duration values.</span>
        </div>
      </section>

      {/* 13. Postman Import */}
      <section id="postman" className="docs-section">
        <h2 className="docs-h2">13. Postman Import</h2>
        <p className="docs-p">Already have a Postman collection? Import it directly — no copy-pasting cURL required. LoadPulse parses Postman Collection v2.0 and v2.1 JSON files and lets you search and pick any request to load test.</p>
        <div className="docs-steps">
          {[
            ['Export your collection', 'In Postman, open the Collections sidebar → click ··· next to your collection → Export → select Collection v2.1 → Save.'],
            ['Click "Import from Postman"', 'On the Run page, click the "📦 Import from Postman" button above the cURL input.'],
            ['Load the file or paste JSON', 'Either choose the exported .json file, or paste the raw JSON directly into the text area.'],
            ['Search and select a request', 'Browse or search by name, URL, or folder. Click any request row to load it into the cURL input.'],
            ['Run your test', 'The request is now in the cURL box — add variables, configure your load pattern, and run as normal.'],
          ].map(([title, desc], i) => (
            <div key={i} className="docs-step">
              <div className="docs-step-num">{i + 1}</div>
              <div><div className="docs-step-title">{title}</div><div className="docs-step-desc">{desc}</div></div>
            </div>
          ))}
        </div>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Feature</th><th>Supported</th></tr></thead>
            <tbody>
              <tr><td>Collection v2.0 &amp; v2.1</td><td>✓</td></tr>
              <tr><td>Nested folders</td><td>✓ — shown as grouped sections</td></tr>
              <tr><td>Headers (including auth headers)</td><td>✓</td></tr>
              <tr><td>Bearer token auth</td><td>✓ — converted to Authorization header</td></tr>
              <tr><td>JSON / raw body</td><td>✓</td></tr>
              <tr><td>URL-encoded body</td><td>✓</td></tr>
              <tr><td>Form-data body</td><td>Text fields only — binary files skipped</td></tr>
              <tr><td>Disabled headers / params</td><td>✓ — automatically excluded</td></tr>
              <tr><td>Environment variables (e.g. <code>{'{{baseUrl}}'}</code>)</td><td>Preserved as-is — replace manually or use LoadPulse variables</td></tr>
            </tbody>
          </table>
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>Postman environment variables like <code>{'{{baseUrl}}'}</code> are kept in the cURL output. You can replace them with LoadPulse variables like <code>{'{{uuid}}'}</code> or hard-code the values before running.</span>
        </div>
      </section>

      {/* 14. Apdex & SLA */}
      <section id="apdex" className="docs-section">
        <h2 className="docs-h2">13. Apdex Score & SLA Checker</h2>
        <p className="docs-p">After a test completes, LoadPulse automatically calculates an <strong>Apdex score</strong> and runs your <strong>SLA rules</strong> against the results. Both panels appear in the Final Report section.</p>

        <h3 className="docs-h3">Apdex Score</h3>
        <p className="docs-p">Apdex (Application Performance Index) converts latency data into a single 0–1 score by classifying every request into one of three buckets relative to a target threshold T.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Bucket</th><th>Condition</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><strong>Satisfied</strong></td><td>latency ≤ T</td><td>Fast enough — user is happy</td></tr>
              <tr><td><strong>Tolerating</strong></td><td>T &lt; latency ≤ 4T</td><td>Slow but acceptable</td></tr>
              <tr><td><strong>Frustrated</strong></td><td>latency &gt; 4T</td><td>Too slow — bad user experience</td></tr>
            </tbody>
          </table>
        </div>
        <div className="docs-code-block">
          <div className="docs-code-label">Formula</div>
          <pre>{`Apdex = (Satisfied + Tolerating / 2) / Total

Example: 800 satisfied, 150 tolerating, 50 frustrated, T=500ms
  Apdex = (800 + 75) / 1000 = 0.875  →  "Good"`}</pre>
        </div>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Score range</th><th>Rating</th><th>Interpretation</th></tr></thead>
            <tbody>
              <tr><td>0.94 – 1.00</td><td><strong style={{ color: '#2ea043' }}>Excellent</strong></td><td>Virtually all users are satisfied</td></tr>
              <tr><td>0.85 – 0.93</td><td><strong style={{ color: '#388bfd' }}>Good</strong></td><td>Most users are satisfied</td></tr>
              <tr><td>0.70 – 0.84</td><td><strong style={{ color: '#d29922' }}>Fair</strong></td><td>A notable portion is experiencing slow responses</td></tr>
              <tr><td>0.50 – 0.69</td><td><strong style={{ color: '#f85149' }}>Poor</strong></td><td>Many users are frustrated</td></tr>
              <tr><td>0.00 – 0.49</td><td><strong style={{ color: '#b91c1c' }}>Unacceptable</strong></td><td>Most users are having a bad experience</td></tr>
            </tbody>
          </table>
        </div>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>The default T is <strong>500ms</strong>. You can adjust it in the report panel — try T=200ms for strict APIs or T=2000ms for batch endpoints. The score recalculates live.</span>
        </div>

        <h3 className="docs-h3">SLA Checker</h3>
        <p className="docs-p">The SLA panel runs a set of configurable pass/fail rules against the test results. Each rule compares a metric to a threshold you define.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Metric</th><th>Default rule</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td><strong>Success rate</strong></td><td>≥ 99%</td><td>% of requests matching your success criteria</td></tr>
              <tr><td><strong>p95 latency</strong></td><td>≤ 1000ms</td><td>95th percentile response time</td></tr>
              <tr><td><strong>p99 latency</strong></td><td>≤ 2000ms</td><td>Tail latency — worst-case for 1 in 100 users</td></tr>
              <tr><td><strong>Apdex score</strong></td><td>≥ 0.85</td><td>Computed at the current T threshold</td></tr>
            </tbody>
          </table>
        </div>
        <p className="docs-p">Click the threshold number next to any rule to edit it inline. The overall badge shows <strong>✓ ALL PASS</strong> (green) or <strong>N/M PASS</strong> (red) so you can instantly see if you hit your SLA targets.</p>
        <div className="docs-callout">
          <span className="docs-callout-icon">💡</span>
          <span>SLA rules are local to the report view and reset each session. To save a custom SLA profile, export the report as JSON and re-load it from History.</span>
        </div>
      </section>

      {/* 15. Sharing Reports */}
      <section id="sharing" className="docs-section">
        <h2 className="docs-h2">13. Sharing Reports</h2>
        <p className="docs-p">After a test completes, click <strong>🔗 Share Report</strong> in the report section. This copies a URL to your clipboard that encodes the entire report — anyone who opens the link sees the full results instantly, no account or backend needed.</p>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead><tr><th>Detail</th><th>Info</th></tr></thead>
            <tbody>
              <tr><td><strong>How it works</strong></td><td>The report JSON is Base64-encoded and stored in the URL hash (<code>#data=…</code>). Nothing is sent to a server.</td></tr>
              <tr><td><strong>URL length</strong></td><td>Typical reports are 2–10 KB encoded. Works in Slack, email, and most browsers. Very large logs (&gt;2000 requests) may produce long URLs.</td></tr>
              <tr><td><strong>Privacy</strong></td><td>Anyone with the link can see the full report including your API URL. Headers and bodies are not included — only response metadata.</td></tr>
              <tr><td><strong>Route</strong></td><td>Shared reports open at <code>/report#data=…</code> — a clean standalone view with an "Open LoadPulse" link.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
