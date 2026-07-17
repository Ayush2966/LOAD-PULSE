import { describe, it, expect } from 'vitest'
import { RingBuffer } from './ringBuffer'

describe('RingBuffer', () => {
  it('returns items oldest-first while below capacity', () => {
    const rb = new RingBuffer<number>(5)
    rb.push(1); rb.push(2); rb.push(3)
    expect(rb.length).toBe(3)
    expect(rb.toArray()).toEqual([1, 2, 3])
  })

  it('drops the oldest and preserves order once at capacity', () => {
    const rb = new RingBuffer<number>(3)
    rb.push(1); rb.push(2); rb.push(3); rb.push(4); rb.push(5)
    expect(rb.length).toBe(3)
    expect(rb.toArray()).toEqual([3, 4, 5])
  })

  it('keeps only the newest cap items after many pushes', () => {
    const rb = new RingBuffer<number>(2000)
    for (let i = 0; i < 2500; i++) rb.push(i)
    const arr = rb.toArray()
    expect(arr).toHaveLength(2000)
    expect(arr[0]).toBe(500)
    expect(arr[arr.length - 1]).toBe(2499)
  })

  it('is empty after clear', () => {
    const rb = new RingBuffer<number>(3)
    rb.push(1); rb.push(2)
    rb.clear()
    expect(rb.length).toBe(0)
    expect(rb.toArray()).toEqual([])
    rb.push(9)
    expect(rb.toArray()).toEqual([9])
  })

  it('rejects a capacity below 1', () => {
    expect(() => new RingBuffer<number>(0)).toThrow()
  })
})
