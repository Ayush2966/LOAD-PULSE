import type { ParsedCurl, PatternType } from '../lib/types'
import { buildExportConfig, downloadJson } from '../lib/exportConfig'

interface FormLike {
  constRate: number; constRateUnit: 's' | 'm'; constDur: number; constDurUnit: 's' | 'm'
  rampStart: number; rampEnd: number; rampDur: number; rampDurUnit: 's' | 'm'; rampConcur: number
  steps: Array<{ rate: number; dur: number }>; stepConcur: number; stepTimeout: number
  spikeBase: number; spikeRate: number; spikeDur: number; spikeBurst: number
  soakRate: number; soakDur: number; soakDurUnit: 's' | 'm'; soakConcur: number
  timeout: number; concur: number; scMin: number; scMax: number
}

interface Props {
  parsed: ParsedCurl
  pattern: PatternType
  form: FormLike
}

export default function ExportConfigButton({ parsed, pattern, form }: Props) {
  function handleExport() {
    const config = buildExportConfig(parsed, pattern, form)
    downloadJson(config)
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Download loadpulse.json for CLI">
      ⬇ Export Config
    </button>
  )
}
