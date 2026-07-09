import { describe, it, expect } from 'vitest'
import { parseCurl } from './curlParser'

describe('parseCurl', () => {
  it('parses a bare GET with no flags', () => {
    const r = parseCurl('curl https://api.example.com/users')
    expect(r).toEqual({ url: 'https://api.example.com/users', method: 'GET', headers: {}, body: null })
  })

  it('parses -X, -H, and -d together', () => {
    const r = parseCurl(`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"a"}'`)
    expect(r.method).toBe('POST')
    expect(r.headers['Content-Type']).toBe('application/json')
    expect(r.body).toBe('{"name":"a"}')
    expect(r.url).toBe('https://api.example.com/users')
  })

  it('handles multi-line commands joined with backslash-newline continuations', () => {
    const r = parseCurl('curl https://api.example.com \\\n  -H "Accept: application/json"')
    expect(r.url).toBe('https://api.example.com')
    expect(r.headers['Accept']).toBe('application/json')
  })

  it('parses --data-raw the same as -d', () => {
    const r = parseCurl(`curl https://api.example.com --data-raw '{"x":1}'`)
    expect(r.body).toBe('{"x":1}')
    expect(r.method).toBe('POST')
  })

  it('preserves quoted header values containing spaces', () => {
    const r = parseCurl('curl https://api.example.com -H "X-Custom: some value with spaces"')
    expect(r.headers['X-Custom']).toBe('some value with spaces')
  })

  it('--json sets method and default headers when not already set', () => {
    const r = parseCurl(`curl https://api.example.com --json '{"a":1}'`)
    expect(r.method).toBe('POST')
    expect(r.headers['Content-Type']).toBe('application/json')
    expect(r.headers['Accept']).toBe('application/json')
    expect(r.body).toBe('{"a":1}')
  })

  it('-u encodes user:pass as a Basic auth header', () => {
    const r = parseCurl('curl -u alice:secret https://api.example.com')
    expect(r.headers['Authorization']).toBe('Basic ' + btoa('alice:secret'))
  })

  it('prepends https:// to a scheme-less URL', () => {
    const r = parseCurl('curl example.com/api')
    expect(r.url).toBe('https://example.com/api')
  })

  it('defaults to POST when a body is present but no method is given', () => {
    const r = parseCurl(`curl https://api.example.com -d 'x=1'`)
    expect(r.method).toBe('POST')
  })

  it('throws when no URL is present', () => {
    expect(() => parseCurl('curl -X POST')).toThrow('No URL found in curl command')
  })
})
