import { useRef, useEffect } from 'react'
import type { ChartPoint } from '../lib/types'

interface Props { points: ChartPoint[] }

export default function Histogram({ points }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H
    ctx.clearRect(0, 0, W, H)

    if (points.length === 0) {
      ctx.fillStyle = '#6e7681'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No data', W / 2, H / 2)
      return
    }

    const lats = points.map(p => p.lat)
    const maxL = Math.max(...lats)
    const BINS = 20
    const binSize = Math.ceil(maxL / BINS) || 1
    const bins = new Array(BINS).fill(0)
    for (const l of lats) {
      const idx = Math.min(BINS - 1, Math.floor(l / binSize))
      bins[idx]++
    }
    const maxBin = Math.max(...bins, 1)

    const padL = 10, padR = 10, padT = 8, padB = 20
    const bw = (W - padL - padR) / BINS

    for (let i = 0; i < BINS; i++) {
      const bh = (bins[i] / maxBin) * (H - padT - padB)
      const x = padL + i * bw
      const y = H - padB - bh
      ctx.fillStyle = '#388bfd88'
      ctx.fillRect(x + 1, y, bw - 2, bh)
    }

    ctx.fillStyle = '#6e7681'
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('0ms', padL, H - 2)
    ctx.textAlign = 'right'
    ctx.fillText(maxL + 'ms', W - padR, H - 2)
  }, [points])

  return (
    <div className="chart-wrap" style={{ height: 150 }}>
      <canvas ref={ref} />
    </div>
  )
}
