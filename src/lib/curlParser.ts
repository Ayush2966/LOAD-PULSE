import type { ParsedCurl } from './types'

// Split a curl command into arguments the way a POSIX shell would: one token
// per *word*, where a word is any run of adjacent quoted, escaped and bare
// characters uninterrupted by unquoted whitespace. Accumulating across segments
// (rather than emitting a token per quoted span) is what lets the '\'' idiom
// that requestToCurl emits for a body containing ' — e.g. 'O'\''Brien' — collapse
// back into the single argument O'Brien instead of being split and mangled.
function tokenize(s: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break

    let buf = ''
    while (i < s.length && !/\s/.test(s[i])) {
      const c = s[i]
      if (c === "'") {
        // Single quotes are literal in POSIX: everything up to the next ' is
        // taken verbatim, backslashes included.
        i++
        while (i < s.length && s[i] !== "'") buf += s[i++]
        i++
      } else if (c === '"') {
        // Double quotes allow backslash escapes.
        i++
        while (i < s.length && s[i] !== '"') {
          if (s[i] === '\\' && i + 1 < s.length) { i++; buf += s[i] }
          else buf += s[i]
          i++
        }
        i++
      } else if (c === '\\' && i + 1 < s.length) {
        // Backslash outside quotes escapes the next character.
        i++
        buf += s[i++]
      } else {
        buf += c
        i++
      }
    }
    tokens.push(buf)
  }
  return tokens
}

export function parseCurl(raw: string): ParsedCurl {
  const s = raw.replace(/\\\r?\n/g, ' ').replace(/^curl\s+/, '').trim()
  const tokens = tokenize(s)

  let url = ''
  let method = ''
  const headers: Record<string, string> = {}
  let body: string | null = null

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti]
    if (t === '-X' || t === '--request') {
      method = tokens[++ti] || 'GET'
    } else if (t === '-H' || t === '--header') {
      const h = tokens[++ti] || ''
      const c = h.indexOf(':')
      if (c > -1) headers[h.slice(0, c).trim()] = h.slice(c + 1).trim()
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'].includes(t)) {
      body = tokens[++ti] || ''
    } else if (t === '--json') {
      body = tokens[++ti] || ''
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      headers['Accept'] = headers['Accept'] || 'application/json'
      method = method || 'POST'
    } else if (t === '-u' || t === '--user') {
      headers['Authorization'] = 'Basic ' + btoa(tokens[++ti] || '')
    } else if (t === '--url') {
      url = tokens[++ti] || ''
    } else if (!t.startsWith('-')) {
      url = t
    }
  }

  if (!url) throw new Error('No URL found in curl command')
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
  method = (method || (body !== null ? 'POST' : 'GET')).toUpperCase()

  return { url, method, headers, body }
}
