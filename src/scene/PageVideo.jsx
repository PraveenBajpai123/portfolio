import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { getVideoSlot, VIDEO_PX } from '../lib/pages'
import { projects } from '../content'

// Plays the CinePrism screen recording on its book page. Each new video frame is copied
// straight into the "browser window" on the page's texture (only that rectangle, not the
// whole page), so the recording moves with the paper even while the page is turning.
// The file is fetched once the visitor gets near the projects, and plays only while the
// page can be seen; the scene's idle redraw (30 fps) is enough to show a 24 fps video.

const SPREAD = 3 // the spread whose right-hand page has the video
const PRELOAD_FROM = SPREAD - 1

export default function PageVideo({ page, reducedMotion }) {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    if (reducedMotion || !page) return
    let video = null
    let frameCb = 0
    let timer = 0
    const src = new THREE.Texture()
    const region = new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(VIDEO_PX.w, VIDEO_PX.h))
    const pos = new THREE.Vector2()

    const copy = () => {
      const slot = getVideoSlot()
      if (!slot || video.readyState < 2) return
      // the page texture is flipped vertically on upload, so rows count from the bottom
      pos.set(slot.x, slot.texH - slot.y - slot.h)
      gl.copyTextureToTexture(src, page.texture, region, pos)
    }
    const onFrame = () => {
      copy()
      frameCb = video.requestVideoFrameCallback(onFrame)
    }

    const load = () => {
      if (video) return
      video = document.createElement('video')
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.preload = 'auto'
      // the element's size must match the frames so the copy reads the right rows
      video.width = VIDEO_PX.w
      video.height = VIDEO_PX.h
      video.src = projects[0].video.src
      src.image = video
    }
    const play = () => {
      load()
      video.play().catch(() => {})
      if ('requestVideoFrameCallback' in video) {
        if (!frameCb) frameCb = video.requestVideoFrameCallback(onFrame)
      } else if (!timer) timer = setInterval(copy, 1000 / 24)
    }
    const stop = () => {
      if (!video) return
      video.pause()
      if (frameCb) video.cancelVideoFrameCallback(frameCb)
      clearInterval(timer)
      frameCb = timer = 0
    }

    const update = ({ spread, pagesReady, warmed }) => {
      if (!pagesReady || !warmed) return
      if (spread >= PRELOAD_FROM) load()
      if (spread === SPREAD) play()
      else stop()
    }
    update(useStore.getState())
    const unsub = useStore.subscribe(update)
    return () => {
      unsub()
      stop()
      if (video) {
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [gl, page, reducedMotion])

  return null
}
