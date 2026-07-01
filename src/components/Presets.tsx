interface Preset {
  name: string
  desc: string
  curl: string
}

const PRESETS: Preset[] = [
  {
    name: 'Public JSON API',
    desc: 'GET jsonplaceholder',
    curl: 'curl https://jsonplaceholder.typicode.com/posts/1',
  },
  {
    name: 'Httpbin GET',
    desc: 'Inspect request headers',
    curl: 'curl https://httpbin.org/get -H "X-Custom: load-test"',
  },
  {
    name: 'Httpbin POST',
    desc: 'POST JSON body',
    curl: `curl https://httpbin.org/post -X POST -H "Content-Type: application/json" -d '{"id":"{{uuid}}","ts":{{timestamp}}}'`,
  },
  {
    name: 'Slow endpoint',
    desc: 'Response with 1s delay',
    curl: 'curl https://httpbin.org/delay/1',
  },
]

interface Props {
  onSelect: (curl: string) => void
}

export default function Presets({ onSelect }: Props) {
  return (
    <div>
      <div className="card-title">Presets</div>
      <div className="preset-grid">
        {PRESETS.map(p => (
          <button key={p.name} className="preset-card" onClick={() => onSelect(p.curl)}>
            <h4>{p.name}</h4>
            <p>{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
