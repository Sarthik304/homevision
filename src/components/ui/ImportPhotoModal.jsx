import { useState } from 'react'
import useHouseStore from '../../store/useHouseStore'
import Modal from './Modal'
import { radius } from '../../theme'
import { importedLayoutToHouseRooms } from '../../utils/importLayout'

const MAX_DIMENSION = 1200 // px, keeps the upload small for cost and Vercel's request-size limit
const JPEG_QUALITY = 0.85

// downsizes the photo client-side via canvas before it's sent to the API
function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read that image.'))
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ImportPhotoModal({ onClose, color }) {
  const loadRooms = useHouseStore((s) => s.loadRooms)
  const setActiveView = useHouseStore((s) => s.setActiveView)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires onChange
    if (!file) return
    setError(null)
    try {
      setPreview(await resizeImageFile(file))
    } catch (err) {
      setError(err.message || 'Could not read that image.')
    }
  }

  const handleGenerate = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.rooms?.length) {
        throw new Error(data?.error || "Couldn't generate a layout from that photo.")
      }
      loadRooms(importedLayoutToHouseRooms(data))
      setActiveView('2d')
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Import from photo" onClose={onClose} color={color} width={380}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 12, color: color.muted, margin: 0 }}>
          Upload a photo of a floor plan and HomeVision will generate a starting 2D and 3D layout
          from it. This replaces your current layout. Treat the result as a rough starting point —
          photos don't carry reliable dimensions, so room sizes are estimated.
        </p>

        {preview ? (
          <img
            src={preview}
            alt="Selected floor plan"
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'contain',
              borderRadius: radius.sm,
              border: `1px solid ${color.border}`,
              background: color.surface,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 120,
              borderRadius: radius.sm,
              border: `1px dashed ${color.border}`,
              color: color.muted,
              fontSize: 12,
            }}
          >
            No photo selected
          </div>
        )}

        <label
          className="pixel-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '9px',
            borderRadius: radius.pill,
            border: `1px solid ${color.border}`,
            background: color.surface,
            color: color.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {preview ? 'Choose a different photo' : 'Choose photo'}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>

        {error && <div style={{ fontSize: 12, color: color.danger }}>{error}</div>}

        <button
          className="pixel-btn"
          onClick={handleGenerate}
          disabled={!preview || loading}
          style={{
            padding: '9px',
            borderRadius: radius.pill,
            border: `1px solid ${color.brand}`,
            background: color.brand,
            color: '#fff',
            cursor: !preview || loading ? 'default' : 'pointer',
            opacity: !preview || loading ? 0.7 : 1,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {loading ? 'Generating layout…' : 'Generate layout'}
        </button>
      </div>
    </Modal>
  )
}
