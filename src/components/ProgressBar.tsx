interface Props { pct: number }

export default function ProgressBar({ pct }: Props) {
  return (
    <div className="progress-wrap">
      <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}
