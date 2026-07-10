import { describe, it, expect } from 'vitest'
import { getRps, getDurationMs, getConcur, getTimeout } from './loadPatterns'
import type { TestConfig, ParsedCurl } from './types'

const baseParsed: ParsedCurl = { url: 'https://example.com', method: 'GET', headers: {}, body: null }

function makeConfig(overrides: Partial<TestConfig> = {}): TestConfig {
  return {
    parsed: baseParsed,
    pattern: 'constant',
    constRate: 10, constRateUnit: 's', constDur: 30, constDurUnit: 's',
    rampStart: 0, rampEnd: 100, rampDur: 60, rampDurUnit: 's', rampConcur: 10,
    steps: [], stepConcur: 10, stepTimeout: 5000,
    spikeBase: 5, spikeRate: 50, spikeDur: 30, spikeBurst: 5,
    soakRate: 20, soakDur: 5, soakDurUnit: 'm', soakConcur: 10,
    timeout: 5000, concur: 10,
    scMin: 200, scMax: 299,
    latThreshOn: false, latThresh: 1000,
    bodyCheckOn: false, bodyCheck: '',
    errStopOn: false, errStopPct: 50,
    captureBody: false,
    ...overrides,
  }
}

describe('getRps', () => {
  it('constant: returns the configured rate as-is when unit is seconds', () => {
    expect(getRps('constant', 0, 30000, makeConfig({ constRate: 10, constRateUnit: 's' }))).toBe(10)
  })

  it('constant: converts per-minute rate to per-second', () => {
    expect(getRps('constant', 0, 30000, makeConfig({ constRate: 120, constRateUnit: 'm' }))).toBe(2)
  })

  it('ramp: interpolates linearly between start and end', () => {
    const cfg = makeConfig({ rampStart: 0, rampEnd: 100 })
    expect(getRps('ramp', 5000, 10000, cfg)).toBe(50)
  })

  it('ramp: clamps progress at 1 once elapsed exceeds total duration', () => {
    const cfg = makeConfig({ rampStart: 0, rampEnd: 100 })
    expect(getRps('ramp', 20000, 10000, cfg)).toBe(100)
  })

  it('step: returns the rate of the step containing the elapsed time', () => {
    const cfg = makeConfig({ steps: [{ rate: 5, dur: 2 }, { rate: 10, dur: 3 }] })
    expect(getRps('step', 1000, 0, cfg)).toBe(5)
    expect(getRps('step', 2500, 0, cfg)).toBe(10)
  })

  it('step: falls back to the last step rate once elapsed exceeds all steps', () => {
    const cfg = makeConfig({ steps: [{ rate: 5, dur: 2 }, { rate: 10, dur: 3 }] })
    expect(getRps('step', 6000, 0, cfg)).toBe(10)
  })

  it('step: falls back to 5 when there are no steps at all', () => {
    const cfg = makeConfig({ steps: [] })
    expect(getRps('step', 0, 0, cfg)).toBe(5)
  })

  it('spike: returns spikeRate only during the burst window, spikeBase otherwise', () => {
    const cfg = makeConfig({ spikeBase: 5, spikeRate: 50, spikeDur: 10, spikeBurst: 2 })
    expect(getRps('spike', 3000, 0, cfg)).toBe(5)
    expect(getRps('spike', 5000, 0, cfg)).toBe(50)
    expect(getRps('spike', 7000, 0, cfg)).toBe(5)
  })

  it('soak: returns the configured soak rate regardless of elapsed time', () => {
    const cfg = makeConfig({ soakRate: 20 })
    expect(getRps('soak', 999999, 0, cfg)).toBe(20)
  })
})

describe('getDurationMs', () => {
  it('constant: converts seconds and minutes to ms', () => {
    expect(getDurationMs('constant', makeConfig({ constDur: 30, constDurUnit: 's' }))).toBe(30000)
    expect(getDurationMs('constant', makeConfig({ constDur: 2, constDurUnit: 'm' }))).toBe(120000)
  })

  it('ramp: converts seconds and minutes to ms', () => {
    expect(getDurationMs('ramp', makeConfig({ rampDur: 45, rampDurUnit: 's' }))).toBe(45000)
    expect(getDurationMs('ramp', makeConfig({ rampDur: 1, rampDurUnit: 'm' }))).toBe(60000)
  })

  it('step: sums each step duration in ms', () => {
    const cfg = makeConfig({ steps: [{ rate: 5, dur: 2 }, { rate: 10, dur: 3 }] })
    expect(getDurationMs('step', cfg)).toBe(5000)
  })

  it('step: falls back to 10000 when there are no steps (dur=0 edge case)', () => {
    expect(getDurationMs('step', makeConfig({ steps: [] }))).toBe(10000)
  })

  it('spike: converts spikeDur seconds to ms', () => {
    expect(getDurationMs('spike', makeConfig({ spikeDur: 15 }))).toBe(15000)
  })

  it('soak: converts seconds and minutes to ms', () => {
    expect(getDurationMs('soak', makeConfig({ soakDur: 5, soakDurUnit: 's' }))).toBe(5000)
    expect(getDurationMs('soak', makeConfig({ soakDur: 5, soakDurUnit: 'm' }))).toBe(300000)
  })
})

describe('getConcur', () => {
  it('reads the pattern-specific concurrency field, and hardcodes 50 for spike', () => {
    expect(getConcur('constant', makeConfig({ concur: 7 }))).toBe(7)
    expect(getConcur('ramp', makeConfig({ rampConcur: 8 }))).toBe(8)
    expect(getConcur('step', makeConfig({ stepConcur: 9 }))).toBe(9)
    expect(getConcur('spike', makeConfig())).toBe(50)
    expect(getConcur('soak', makeConfig({ soakConcur: 11 }))).toBe(11)
  })
})

describe('getTimeout', () => {
  it('uses stepTimeout only for the step pattern, and timeout for everything else', () => {
    const cfg = makeConfig({ timeout: 3000, stepTimeout: 9000 })
    expect(getTimeout('step', cfg)).toBe(9000)
    expect(getTimeout('constant', cfg)).toBe(3000)
    expect(getTimeout('ramp', cfg)).toBe(3000)
    expect(getTimeout('spike', cfg)).toBe(3000)
    expect(getTimeout('soak', cfg)).toBe(3000)
  })
})
