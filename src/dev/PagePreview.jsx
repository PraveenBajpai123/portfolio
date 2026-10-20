import { useEffect, useState } from 'react'
import { previewPage } from '../lib/pages'
import { coverTexture } from '../lib/textures'
import { profile } from '../content'

// Dev-only: /?page=<id> shows one book page as a flat image (for reviewing layouts).
// /?page=all shows every page in a grid.
const IDS = ['about', 'stack', 'samsung', 'rootvestors', 'cineprism', 'editor', 'education', 'contact']
const FONTS = ['500 28px "Manrope"', '700 28px "Manrope"', '800 28px "Manrope"', '600 28px "Manrope"', '400 80px "Instrument Serif"', 'italic 400 80px "Instrument Serif"']

export default function PagePreview({ id }) {
  const [urls, setUrls] = useState(null)
  useEffect(() => {
    const photoAsset = new Promise((res) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = () => res(null)
      img.src = '/photo.jpg'
    })
    Promise.all([...FONTS.map((f) => document.fonts.load(f)), photoAsset]).then(async () => {
      const photo = await photoAsset
      const ids = id === 'all' ? IDS : [id]
      setUrls(ids.map((i) => [i, i === 'cover' ? coverTexture(profile.name, profile.tagline).image.toDataURL() : previewPage(i, { photo })]))
      document.title = 'ready'
    })
  }, [id])
  if (!urls) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, background: '#333', minHeight: '100vh' }}>
      {urls.map(([i, u]) => (
        <img key={i} src={u} alt={i} style={{ width: id === 'all' ? 'calc(25% - 6px)' : '100%', display: 'block' }} />
      ))}
    </div>
  )
}
