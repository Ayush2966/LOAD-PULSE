import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunRecord, ReportData } from '../lib/types'

interface HistoryState {
  runs: RunRecord[]
  addRun: (report: ReportData, pattern: string) => void
  clearAll: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      runs: [],
      addRun(report, pattern) {
        const m = report.meta
        const record: RunRecord = {
          id: Date.now(),
          url: m.url,
          method: m.method,
          pattern,
          elapsed: m.elapsed,
          rps: m.rps,
          total: m.total,
          ok: m.ok,
          fail: m.fail,
          sr: m.successRate,
          avg: m.avgLatMs,
          p95: m.p95Ms,
          p99: m.p99Ms,
        }
        set(s => ({ runs: [record, ...s.runs].slice(0, 10) }))
      },
      clearAll() { set({ runs: [] }) },
    }),
    { name: '_alt2_hist' }
  )
)
