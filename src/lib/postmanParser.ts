export interface PostmanRequest {
  name: string
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  folder: string
}

interface PMHeader { key: string; value: string; disabled?: boolean }
interface PMUrl { raw?: string; protocol?: string; host?: string[]; path?: string[] }
interface PMBody {
  mode?: string
  raw?: string
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>
  formdata?: Array<{ key: string; value: string; type?: string; disabled?: boolean }>
}
interface PMRequest {
  method?: string
  url?: string | PMUrl
  header?: PMHeader[]
  body?: PMBody
  auth?: { type: string; bearer?: Array<{ key: string; value: string }> }
}
interface PMItem {
  name?: string
  request?: PMRequest
  item?: PMItem[]
}

export function flattenItems(items: PMItem[], folder = ''): Array<{ name: string; request: PMRequest; folder: string }> {
  const out: Array<{ name: string; request: PMRequest; folder: string }> = []
  for (const item of items) {
    if (item.item) {
      const sub = flattenItems(item.item, folder ? `${folder}/${item.name ?? ''}` : (item.name ?? ''))
      out.push(...sub)
    } else if (item.request) {
      out.push({ name: item.name ?? 'Request', request: item.request, folder })
    }
  }
  return out
}

function resolveUrl(url: string | PMUrl | undefined): string {
  if (!url) return ''
  if (typeof url === 'string') return url
  if (url.raw) return url.raw
  const proto = url.protocol ?? 'https'
  const host = (url.host ?? []).join('.')
  const path = (url.path ?? []).join('/')
  return `${proto}://${host}/${path}`
}

function resolveBody(body: PMBody | undefined): string | null {
  if (!body) return null
  if (body.mode === 'raw' && body.raw) return body.raw
  if (body.mode === 'urlencoded' && body.urlencoded) {
    const parts = body.urlencoded
      .filter(p => !p.disabled)
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    return parts.join('&') || null
  }
  return null
}

export function requestToCurl(req: PMRequest, _name: string): string {
  const method = (req.method ?? 'GET').toUpperCase()
  const url = resolveUrl(req.url)
  if (!url) return ''

  const parts: string[] = [`curl -X ${method} '${url}'`]

  // Auth
  if (req.auth?.type === 'bearer') {
    const tok = req.auth.bearer?.find(b => b.key === 'token')?.value ?? ''
    parts.push(`  -H 'Authorization: Bearer ${tok}'`)
  }

  // Headers
  for (const h of req.header ?? []) {
    if (h.disabled) continue
    parts.push(`  -H '${h.key}: ${h.value}'`)
  }

  // Body
  const body = resolveBody(req.body)
  if (body) {
    if (req.body?.mode === 'urlencoded') {
      parts.push(`  --data-urlencode '${body}'`)
    } else {
      const escaped = body.replace(/'/g, "'\\''")
      parts.push(`  -d '${escaped}'`)
    }
  }

  return parts.join(' \\\n')
}

export function parsePostmanCollection(json: unknown): PostmanRequest[] {
  if (typeof json !== 'object' || json === null) throw new Error('Invalid JSON')
  const col = json as Record<string, unknown>

  // Support both v2.0 and v2.1
  const info = col.info as Record<string, string> | undefined
  const schema = info?.schema ?? ''
  if (!schema.includes('collection')) throw new Error('Not a Postman collection')

  const items = (col.item as PMItem[] | undefined) ?? []
  const flat = flattenItems(items)

  return flat
    .map(({ name, request, folder }) => {
      const curl = requestToCurl(request, name)
      if (!curl) return null
      const headers: Record<string, string> = {}
      for (const h of request.header ?? []) {
        if (!h.disabled) headers[h.key] = h.value
      }
      return {
        name,
        method: (request.method ?? 'GET').toUpperCase(),
        url: resolveUrl(request.url),
        headers,
        body: resolveBody(request.body),
        folder,
      } satisfies PostmanRequest
    })
    .filter((r): r is PostmanRequest => r !== null)
}
