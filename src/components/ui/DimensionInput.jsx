import { useEffect, useState } from 'react'
import { fromDisplayLength, roundDisplayLength } from '../../utils/units'

// Number input that only clamps to [min, max] on blur, so mid-typing isn't overwritten.
// `decimals` overrides the unit's usual display precision — see roundDisplayLength — for a field
// (like wall thickness) whose values would otherwise get rounded away to nothing.
export default function DimensionInput({ valueMeters, unit, min, max, onCommit, style, step = 0.1, decimals }) {
  const [text, setText] = useState(() => String(roundDisplayLength(valueMeters, unit, decimals)))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(roundDisplayLength(valueMeters, unit, decimals)))
  }, [valueMeters, unit, decimals, focused])

  return (
    <input
      type="number"
      value={text}
      min={roundDisplayLength(min, unit, decimals)}
      max={max != null ? roundDisplayLength(max, unit, decimals) : undefined}
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
