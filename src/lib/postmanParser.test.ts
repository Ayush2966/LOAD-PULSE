import { describe, it, expect } from 'vitest'
import { parsePostmanCollection } from './postmanParser'

const collection = (item: unknown) => ({
  info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  item: Array.isArray(item) ? item : [item],
})

describe('parsePostmanCollection', () => {
  it('imports request-level bearer auth as an Authorization header', () => {
    const [req] = parsePostmanCollection(
      collection({
        name: 'Get user',
        request: {
          method: 'GET',
          url: 'https://api.example.com/me',
          auth: { type: 'bearer', bearer: [{ key: 'token', value: 'abc123' }] },
        },
      }),
    )
    expect(req.headers['Authorization']).toBe('Bearer abc123')
  })

  it('keeps existing headers alongside bearer auth', () => {
    const [req] = parsePostmanCollection(
      collection({
        name: 'Get user',
        request: {
          method: 'GET',
          url: 'https://api.example.com/me',
          header: [{ key: 'Accept', value: 'application/json' }],
          auth: { type: 'bearer', bearer: [{ key: 'token', value: 'abc123' }] },
        },
      }),
    )
    expect(req.headers['Accept']).toBe('application/json')
    expect(req.headers['Authorization']).toBe('Bearer abc123')
  })

  it('leaves headers untouched when there is no auth', () => {
    const [req] = parsePostmanCollection(
      collection({
        name: 'Get user',
        request: {
          method: 'GET',
          url: 'https://api.example.com/me',
          header: [{ key: 'Accept', value: 'application/json' }],
        },
      }),
    )
    expect(req.headers).toEqual({ Accept: 'application/json' })
  })
})
