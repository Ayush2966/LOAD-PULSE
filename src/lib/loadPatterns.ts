import type { TestConfig, PatternType, StepConfig } from './types'

export function getRps(pattern: PatternType, elapsed: number, totalMs: number, cfg: TestConfig): number {
  switch (pattern) {
    case 'constant': {
      const r = cfg.constRate
      return cfg.constRateUnit === 'm' ? r / 60 : r
    }
    case 'ramp': {
      const p = Math.min(1, elapsed / totalMs)
      return cfg.rampStart + (cfg.rampEnd - cfg.rampStart) * p
    }
    case 'step': {
      let acc = 0
      for (const s of cfg.steps) {
        const sd = s.dur * 1000
        if (elapsed < acc + sd) return s.rate
        acc += sd
      }
      return cfg.steps[cfg.steps.length - 1]?.rate ?? 5
    }
    case 'spike': {
      const spikeStart = cfg.spikeDur * 0.4 * 1000
      const spikeEnd = spikeStart + cfg.spikeBurst * 1000
      return elapsed >= spikeStart && elapsed < spikeEnd ? cfg.spikeRate : cfg.spikeBase
    }
    case 'soak':
      return cfg.soakRate
  }
}

export function getDurationMs(pattern: PatternType, cfg: TestConfig): number {
  switch (pattern) {
    case 'constant':
      return cfg.constDurUnit === 'm' ? cfg.constDur * 60000 : cfg.constDur * 1000
    case 'ramp':
      return cfg.rampDurUnit === 'm' ? cfg.rampDur * 60000 : cfg.rampDur * 1000
    case 'step':
      return cfg.steps.reduce((a, s) => a + s.dur * 1000, 0) || 10000
    case 'spike':
      return cfg.spikeDur * 1000
    case 'soak':
      return cfg.soakDurUnit === 'm' ? cfg.soakDur * 60000 : cfg.soakDur * 1000
  }
}

export function getConcur(pattern: PatternType, cfg: TestConfig): number {
  switch (pattern) {
    case 'constant': return cfg.concur
    case 'ramp': return cfg.rampConcur
    case 'step': return cfg.stepConcur
    case 'spike': return 50
    case 'soak': return cfg.soakConcur
  }
}

export function getTimeout(pattern: PatternType, cfg: TestConfig): number {
  if (pattern === 'step') return cfg.stepTimeout
  return cfg.timeout
}

export function describeTest(pattern: PatternType, cfg: TestConfig, steps: StepConfig[]): string {
  switch (pattern) {
    case 'constant': {
      const rps = cfg.constRateUnit === 'm' ? cfg.constRate / 60 : cfg.constRate
      const secs = cfg.constDurUnit === 'm' ? cfg.constDur * 60 : cfg.constDur
      return `${Math.round(rps * secs)} requests · ${cfg.constRate}/${cfg.constRateUnit === 's' ? 's' : 'min'} · ${cfg.constDur}${cfg.constDurUnit}`
    }
    case 'ramp':
      return `${cfg.rampStart}→${cfg.rampEnd} req/s · ${cfg.rampDur}${cfg.rampDurUnit}`
    case 'step':
      return steps.map((s, i) => `S${i + 1}:${s.rate}/s·${s.dur}s`).join(' → ')
    case 'spike':
      return `Base ${cfg.spikeBase}/s  spike ${cfg.spikeRate}/s×${cfg.spikeBurst}s  total ${cfg.spikeDur}s`
    case 'soak':
      return `${cfg.soakRate} req/s · ${cfg.soakDur}${cfg.soakDurUnit} soak`
  }
}
