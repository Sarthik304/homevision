import { useEffect, useState } from 'react'
import { fromDisplayLength, roundDisplayLength } from '../../utils/units'

// Number input that only clamps to [min, max] on blur, so mid-typing isn't overwritten
export default function DimensionInput({ valueMeters, unit, min, max, onCommit, style, step = 0.1 }) {
  const [text, setText] = useState(() => String(roundDisplayLength(valueMeters, unit)))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(roundDisplayLength(valueMeters, unit)))
  }, [valueMeters, unit, focused])

  return (
    <input
      type="number"
      value={text}
      min={roundDisplayLength(min, unit)}
      max={max != null ? roundDisplayLength(max, unit) : undefined}
      step={step}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value)
        const meters = fromDisplayLength(parseFloat(e.target.value), unit)
        if (Number.isFinite(meters)) onCommit(meters)
      }}
      onBlur={(e) => {
        setFocused(false)
        const parsed = fromDisplayLength(parseFloat(e.target.value), unit)
        const clamped = Math.min(max ?? Infinity, Math.max(min, Number.isFinite(parsed) ? parsed : min))
        onCommit(clamped)
      }}
      style={style}
    />
  )
}
