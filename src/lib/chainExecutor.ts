import { parseCurl } from './curlParser'

export interface ChainStep {
  id: string
  curl: string
  extractors: Extractor[]
}

export interface Extractor {
  varName: string
  source: 'body' | 'header'
  path: string
}

export type ChainVars = Record<string, string>

async function getNestedValue(obj: unknown, path: string): Promise<string | null> {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else return null
  }
  return cur != null ? String(cur) : null
}

export async function runChain(steps: ChainStep[], timeout = 10000): Promise<ChainVars> {
  const vars: ChainVars = {}

  for (const step of steps) {
    if (!step.curl.trim()) continue
    let parsed
    try { parsed = parseCurl(step.curl) } catch { continue }

    const injected = applyVarsWithChain(parsed, vars)

    const ctrl = new AbortController()
    const th = setTimeout(() => ctrl.abort(), timeout)

    try {
      const init: RequestInit = {
        method: injected.method,
        headers: injected.headers,
        signal: ctrl.signal,
      }
      if (injected.body !== null) init.body = injected.body

      const res = await fetch(injected.url, init)
      clearTimeout(th)

      let bodyText = ''
      try { bodyText = await res.text() } catch { /* ignore */ }

      let bodyJson: unknown = null
      try { bodyJson = JSON.parse(bodyText) } catch { /* ignore */ }

      for (const ex of step.extractors) {
        if (ex.source === 'body' && bodyJson) {
          const val = await getNestedValue(bodyJson, ex.path)
          if (val !== null) vars[ex.varName] = val
        } else if (ex.source === 'header') {
          const val = res.headers.get(ex.path)
          if (val) vars[ex.varName] = val
        }
      }
    } catch {
      clearTimeout(th)
    }
  }

  return vars
}

function applyVarsWithChain(parsed: ReturnType<typeof parseCurl>, chainVars: ChainVars) {
  function replaceChain(s: string): string {
    return s.replace(/\{\{chain\.([^}]+)\}\}/g, (_, name) => chainVars[name] ?? `{{chain.${name}}}`)
  }

  return {
    ...parsed,
    url: replaceChain(parsed.url),
    headers: Object.fromEntries(Object.entries(parsed.headers).map(([k, v]) => [k, replaceChain(v)])),
    body: parsed.body ? replaceChain(parsed.body) : null,
  }
}

export function applyChainVarsToString(s: string, vars: ChainVars): string {
  return s.replace(/\{\{chain\.([^}]+)\}\}/g, (_, name) => vars[name] ?? `{{chain.${name}}}`)
}
