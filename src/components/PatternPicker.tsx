import type { PatternType } from '../lib/types'

const PATTERNS: { id: PatternType; label: string; desc: string }[] = [
  { id: 'constant', label: 'Constant', desc: 'Fixed rate for a duration' },
  { id: 'ramp', label: 'Ramp', desc: 'Linear increase over time' },
  { id: 'step', label: 'Step', desc: 'Discrete rate steps' },
  { id: 'spike', label: 'Spike', desc: 'Burst above baseline' },
  { id: 'soak', label: 'Soak', desc: 'Steady long-duration' },
]

interface Props {
  value: PatternType
  onChange: (p: PatternType) => void
}

export default function PatternPicker({ value, onChange }: Props) {
  return (
    <div>
      <div className="card-title">Load Pattern</div>
      <div className="pattern-tabs">
        {PATTERNS.map(p => (
          <button
            key={p.id}
            className={'pattern-tab' + (value === p.id ? ' active' : '')}
            onClick={() => onChange(p.id)}
            title={p.desc}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
