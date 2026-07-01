import type { ParsedCurl } from './types'

export function injectVars(s: string): string {
  return s
    .replace(/\{\{uuid\}\}/g, () => crypto.randomUUID())
    .replace(/\{\{timestamp\}\}/g, () => String(Date.now()))
    .replace(/\{\{random_int:(\d+):(\d+)\}\}/g, (_, a, b) =>
      String(Math.floor(Math.random() * (+b - +a + 1)) + +a))
    .replace(/\{\{random_int\}\}/g, () => String(Math.floor(Math.random() * 1e9)))
}

export function applyVars(o: ParsedCurl): ParsedCurl {
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.headers)) {
    headers[injectVars(k)] = injectVars(v)
  }
  return {
    ...o,
    url: injectVars(o.url),
    body: o.body !== null ? injectVars(o.body) : null,
    headers,
  }
}
