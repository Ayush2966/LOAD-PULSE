import { describe, it, expect } from 'vitest'
import { requestToCurl } from './postmanParser'
import { parseCurl } from './curlParser'

describe('requestToCurl round-trip', () => {
  it('round-trips a urlencoded body through parseCurl without losing the URL or double-encoding', () => {
    const curl = requestToCurl(
      {
        method: 'POST',
        url: 'https://api.example.com/form',
        body: {
          mode: 'urlencoded',
          urlencoded: [
            { key: 'name', value: 'John Doe' },
            { key: 'city', value: 'New York' },
          ],
        },
      },
      'Submit form',
    )

    const parsed = parseCurl(curl)
    expect(parsed.url).toBe('https://api.example.com/form')
    expect(parsed.method).toBe('POST')
    // The body is already form-encoded once by resolveBody; the round-trip must
    // not encode it a second time and must not leak into the URL.
    expect(parsed.body).toBe('name=John%20Doe&city=New%20York')
  })
})
