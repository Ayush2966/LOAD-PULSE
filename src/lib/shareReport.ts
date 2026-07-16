import type { ReportData, ChartPoint, TputPoint } from './types'

// A shared report is self-contained: the summary plus the per-request series
// the report view needs to redraw its charts, histogram, percentiles and Apdex.
export interface SharePayload {
  report: ReportData
  chartPts: ChartPoint[]
  tputPts: TputPoint[]
}

// ── URL-safe Base64 <-> bytes ──
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000 // avoid arg-count limits on String.fromCharCode(...)
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ── gzip via the platform CompressionStream (browser + Node 20+) ──
async function gzip(str: string): Promise<Uint8Array> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  // `bytes as BlobPart`: a Uint8Array is a valid BlobPart at runtime; the cast
  // sidesteps TS 6's Uint8Array<ArrayBufferLike> vs BlobPart<ArrayBuffer> generic mismatch.
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export async function encodeReport(payload: SharePayload): Promise<string> {
  const gz = await gzip(JSON.stringify(payload))
  return bytesToBase64Url(gz)
}

export async function decodeReport(token: string): Promise<SharePayload | null> {
  // Current format: URL-safe Base64 of a gzipped SharePayload.
  try {
    const json = await gunzip(base64UrlToBytes(token))
    const obj = JSON.parse(json)
    if (obj && typeof obj === 'object' && 'report' in obj) {
      return {
        report: obj.report as ReportData,
        chartPts: Array.isArray(obj.chartPts) ? obj.chartPts : [],
        tputPts: Array.isArray(obj.tputPts) ? obj.tputPts : [],
      }
    }
  } catch {
    // fall through to the legacy decoder
  }

  // Legacy format: standard Base64 of a bare ReportData (pre-compression links).
  // Kept so old shared URLs still open — they render as summary-only (no series).
  try {
    const report = JSON.parse(decodeURIComponent(escape(atob(token)))) as ReportData
    if (report && report.meta) return { report, chartPts: [], tputPts: [] }
  } catch {
    // not decodable
  }

  return null
}

export async function buildShareUrl(payload: SharePayload): Promise<string> {
  return window.location.origin + '/report#data=' + (await encodeReport(payload))
}
