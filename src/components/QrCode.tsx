import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  size?: number
}

/** Renders a value as a scannable QR code. Generation is fully local (qrcode lib, no network call), consistent with the app's no-backend design. */
export default function QrCode({ value, size = 150 }: Props) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(url => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc('') })
    return () => { alive = false }
  }, [value, size])

  if (!src) return null
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Scan to join swarm"
      style={{ borderRadius: 8, background: '#fff', padding: 8, display: 'block' }}
    />
  )
}
