# Praveen's Desk — 3D scroll portfolio

A neon-lit developer desk at night: LED strips, a corkboard of sticky notes, a "Web Developer"
poster, fairy lights around an open window over a city skyline, an RGB keyboard, figurines and a
leather book. Scrolling moves the camera to the book and turns its pages: About & Tech stack →
Experience → Projects → Education & Contact. Calm ambient music (generated live) plays with a
soft breeze underneath if you enter with sound.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/ (deploy to Vercel/Netlify)
```

## Landing page

The first page (`src/ui/Landing.jsx`, styles in `src/ui/landing.css`) introduces you and opens the
3D tour. Its text — headline, intro, tags, stats, availability badge, tech strip — lives in
`landing` in `src/content.js`. **Add your photo** as `public/photo.jpg` (portrait, ~800×900);
it is given a warm orange duotone automatically. Until then a "PB" placeholder shows.

## Edit your content

Everything the book says lives in `src/content.js`. Page artwork is drawn from it in
`src/lib/pages.js`. The resume PDF served for download is `public/praveen-bajpai-resume.pdf`.

## Tuning

| What | Where |
|---|---|
| Scroll timing (when pages turn) | `T` in `src/lib/scroll.js`, page length in `.scroll-track` (`src/styles.css`) |
| Camera shots | `src/scene/CameraRig.jsx` |
| Lamp brightness / colour | `<spotLight>` in `src/scene/Lamp.jsx` |
| Moonlight | `Moonlight` in `src/scene/Scene.jsx` |
| Curtain motion | `displaceCurtain` in `src/scene/Curtain.jsx` |
| Music / wind / page-turn loudness | `LEVELS` in `src/lib/audio.js` |
| Music chords and melody | `CHORDS`, `MELODY` in `src/lib/audio.js` |
| Use your own music file | put an MP3 in `public/audio/` and set `MUSIC_URL` in `src/lib/audio.js` |
| Neon strips, fairy lights, wall decor | `src/scene/Decor.jsx` (textures in `src/lib/decor.js`) |
| Keyboard, mouse, figurines, clock, chair | `src/scene/Gear.jsx` |
| Gust rhythm (shared by curtains + sound) | `src/lib/wind.js` |

See `PLAN.md` for the design decisions and build plan.

## Performance

- Add `?perf` to the URL (e.g. `http://localhost:5173/?perf`) for a live readout of rendered
  frames per second, draw calls, GPU textures/geometries and JS heap.
- The scene renders on demand: full frame rate only while something moves (scrolling, camera
  easing, pages turning), 30 fps when idle (`IDLE_FPS` in `src/lib/perf.js`), and not at all
  behind the intro or in a background tab.
- Shadow maps are drawn once and only refreshed while pages turn.
- Quality steps down automatically on slow devices (lower resolution, then no glow effects).
