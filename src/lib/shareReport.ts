import type { ReportData } from './types'

export function encodeReport(report: ReportData): string {
  const json = JSON.stringify(report)
  return btoa(unescape(encodeURIComponent(json)))
}

export function decodeReport(hash: string): ReportData | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)))
    return JSON.parse(json) as ReportData
  } catch {
    return null
  }
}

export function buildShareUrl(report: ReportData): string {
  return window.location.origin + '/report#data=' + encodeReport(report)
}
