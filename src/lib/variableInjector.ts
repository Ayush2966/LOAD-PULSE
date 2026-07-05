import type { ParsedCurl } from './types'

/**
 * State behind {{seq}}/{{phone}}/{{email}}/{{repeat_uuid:n}} — unlike
 * {{random_int}}, these are guaranteed collision-free within a test run, which
 * is what idempotency testing needs (a duplicate value would let the server
 * dedupe the request and skew results).
 *
 * Isolated per VarSpace so independent engines in one JS context (e.g. a solo
 * test on the Run page while this tab is also a swarm node) can't rewind or
 * clear each other's counters mid-run.
 */
export interface VarSpace {
  seqCounter: number
  repeatState: Map<number, { uses: number; uuid: string }>
}

/** `base` offsets the sequence so concurrent generators (e.g. swarm nodes) draw from disjoint blocks. */
export function createVarSpace(base = 0): VarSpace {
  return { seqCounter: base, repeatState: new Map() }
}

// Default space, used by the solo web runner and the CLI (one test at a time each).
const defaultSpace = createVarSpace()

/** Reset the default space's unique-value state at test start. */
export function resetUniqueVars(base = 0): void {
  defaultSpace.seqCounter = base
  defaultSpace.repeatState.clear()
}

/**
 * Per-request context: {{seq}}, {{phone}} and {{email}} resolve to the SAME
 * sequence number everywhere within one request (url + headers + body), so a
 * request's idempotency key, payload id and logged value all agree. Each new
 * request gets the next number.
 */
interface RequestVarCtx {
  space: VarSpace
  seq: number | null
  repeatUuids: Map<number, string>
}

function newCtx(space: VarSpace): RequestVarCtx {
  return { space, seq: null, repeatUuids: new Map() }
}

function nextSeq(ctx: RequestVarCtx): number {
  if (ctx.seq === null) ctx.seq = ++ctx.space.seqCounter
  return ctx.seq
}

/** Same uuid for every `n` consecutive requests, then a fresh one — sends deliberate duplicates to assert the server's idempotency guarantee actually dedupes. */
function repeatUuid(ctx: RequestVarCtx, n: number): string {
  const cached = ctx.repeatUuids.get(n)
  if (cached) return cached
  let state = ctx.space.repeatState.get(n)
  if (!state || state.uses >= n) {
    state = { uses: 0, uuid: crypto.randomUUID() }
    ctx.space.repeatState.set(n, state)
  }
  state.uses++
  ctx.repeatUuids.set(n, state.uuid)
  return state.uuid
}

const RAND_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomStr(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += RAND_CHARS[Math.floor(Math.random() * RAND_CHARS.length)]
  return s
}

export function injectVars(s: string, ctx: RequestVarCtx = newCtx(defaultSpace)): string {
  return s
    .replace(/\{\{uuid\}\}/g, () => crypto.randomUUID())
    .replace(/\{\{timestamp\}\}/g, () => String(Date.now()))
    .replace(/\{\{random_int:(\d+):(\d+)\}\}/g, (_, a, b) =>
      String(Math.floor(Math.random() * (+b - +a + 1)) + +a))
    .replace(/\{\{random_int\}\}/g, () => String(Math.floor(Math.random() * 1e9)))
    .replace(/\{\{random_str:(\d+)\}\}/g, (_, n) => randomStr(Math.min(+n, 256)))
    .replace(/\{\{seq\}\}/g, () => String(nextSeq(ctx)))
    // '9' + zero-padded seq → always a valid-looking, collision-free 10-digit number
    .replace(/\{\{phone\}\}/g, () => '9' + String(nextSeq(ctx)).padStart(9, '0'))
    .replace(/\{\{email\}\}/g, () => `user${nextSeq(ctx)}@loadtest.dev`)
    .replace(/\{\{repeat_uuid:(\d+)\}\}/g, (_, n) => repeatUuid(ctx, Math.max(1, +n)))
}

export function applyVars(o: ParsedCurl, space: VarSpace = defaultSpace): ParsedCurl {
  const ctx = newCtx(space)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.headers)) {
    headers[injectVars(k, ctx)] = injectVars(v, ctx)
  }
  return {
    ...o,
    url: injectVars(o.url, ctx),
    body: o.body !== null ? injectVars(o.body, ctx) : null,
    headers,
  }
}
