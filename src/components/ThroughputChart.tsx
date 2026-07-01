import { useRef, useEffect, useCallback } from 'react'
import type { TputPoint } from '../lib/types'

interface Props { points: TputPoint[] }

export default function ThroughputChart({ points }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.parentElement?.clientWidth || canvas.offsetWidth || 400
    const H = 180
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    if (points.length < 2) {
      ctx.fillStyle = '#6e7681'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Waiting for data…', W / 2, H / 2)
      return
    }

    const maxR = Math.max(...points.map(p => p.rps), 1) * 1.1
    const minT = points[0].t
    const maxT = Math.max(points[points.length - 1].t, 1)
    const padL = 44, padR = 12, padT = 12, padB = 24
    const cW = W - padL - padR, cH = H - padT - padB

    ctx.strokeStyle = '#21262d'
    ctx.lineWidth = 1
    for (let i = 0; i <= 3; i++) {
      const y = padT + cH * (i / 3)
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
      ctx.fillStyle = '#6e7681'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(Math.round(maxR * (1 - i / 3)) + '/s', padL - 4, y + 3)
    }

    const px = (t: number) => padL + ((t - minT) / (maxT - minT)) * cW
    const py = (r: number) => padT + (1 - r / maxR) * cH

    // fill
    const grad = ctx.createLinearGradient(0, padT, 0, H - padB)
    grad.addColorStop(0, 'rgba(46,160,67,0.25)')
    grad.addColorStop(1, 'rgba(46,160,67,0.02)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(px(points[0].t), H - padB)
    for (const p of points) ctx.lineTo(px(p.t), py(p.rps))
    ctx.lineTo(px(points[points.length - 1].t), H - padB)
    ctx.closePath()
    ctx.fill()

    // line
    ctx.beginPath()
    ctx.strokeStyle = '#2ea043'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    let first = true
    for (const p of points) {
      if (first) { ctx.moveTo(px(p.t), py(p.rps)); first = false }
      else ctx.lineTo(px(p.t), py(p.rps))
    }
    ctx.stroke()
  }, [points])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas?.parentElement) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} style={{ display: 'block' }} />
}
