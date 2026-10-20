# Praveen's Desk — scroll-driven 3D portfolio

A dark, moonlit study: an architect lamp, an open window with sheer curtains moving in the wind,
and a leather book on the desk. Scrolling moves the camera to the book, and each spread of the book
is a section of the resume. A soft, synthesized wind plays in the background (opt-in).

## Decisions

| Area | Choice | Why |
|---|---|---|
| Stack | Vite + React 19 + React Three Fiber 9 + drei 10 | Fast dev server, declarative scene |
| Scroll | Lenis (smooth scroll) → one `progress` value 0→1 | One number drives camera, book and sound |
| Camera | Keyframed shots, eased, then damped every frame | No jitter; responsive distance per screen size |
| Book | Own skinned-mesh pages (bones bend the paper) | Pages curl instead of flipping like boards |
| Page content | Drawn on `<canvas>` → textures, with clickable link areas mapped by UV | Crisp text that bends with the page; links work in 3D |
| Page turns | Scroll picks the page number; each page animates its own flip | Pages are never stuck half-turned; natural pause per spread |
| Models | Built in code (desk, lamp, window, curtains, laptop, mug, plants, notebook) | Zero downloads, tiny bundle; GLBs can be swapped in later |
| Curtains | Plane + vertex shader (`onBeforeCompile` on a standard material) | Still lit by the scene; wind costs ~0 CPU |
| Sound | Web Audio synthesized wind (brown + pink noise, filtered) + paper flip | No audio files, loops forever, fully subtle; starts only after a click |
| Sync | One shared `gust` value drives curtain billow **and** wind volume/filter | Curtains move exactly when the wind swells |
| Post FX | Bloom (lamp bulb, moon), vignette, light grain | Matches the reference mood |
| Accessibility | Full resume as hidden semantic HTML, PDF download, chapter nav, reduced-motion support | Recruiters, SEO, screen readers |

## Book layout (5 spreads)

| Scroll | Spread | Left page | Right page |
|---|---|---|---|
| 0–20% | Room → camera moves to desk | — | — |
| 20–27% | Closed book | — | Cover: *Praveen Bajpai · Portfolio* |
| 27–44% | I | About me + contact links | Tech stack |
| 44–61% | II | Experience: Samsung R&D | Experience: Rootvestors |
| 61–78% | III | Project: The CinePrism | Project: AI Image & Video Editor |
| 78–93% | IV | Education & achievements | Contact + resume download |
| 93–100% | Finale | Camera pulls back to the whole desk | |

On phones (portrait) the camera shows one page at a time: left page for the first half of each
spread's scroll range, right page for the second half.

## Lighting & mood

- Very dark blue ambient + hemisphere fill.
- Warm spotlight inside the lamp shade aimed at the book (casts shadows), glowing bulb with bloom.
- Cool moonlight from outside the window; the wall casts shadows so a window-shaped patch of light lands on the desk.
- Night sky shader outside: gradient, twinkling stars, moon with halo, tree-line silhouette.
- Dust motes floating in the lamp light.

## Sound

- "Enter with sound" / "Enter quietly" screen (browsers need a click before audio).
- Wind: two noise layers. Low body + airy band whose filter and volume follow the gust value.
- Gets quieter and more muffled as the camera moves into the book; returns at the finale.
- Soft synthesized page-turn sound on every flip.
- Mute toggle (remembered), audio pauses when the tab is hidden.

## Files

```
src/
  main.jsx, App.jsx, styles.css
  content.js            resume content (single source for pages, overlay, hidden HTML)
  store.js              shared state (scroll progress, spread, sound)
  lib/scroll.js         Lenis setup + timeline constants
  lib/wind.js           shared gust value
  lib/audio.js          Web Audio wind + page flip
  lib/pages.js          canvas drawing of every book page + link areas
  lib/textures.js       procedural wood / plaster / leather textures
  scene/Scene.jsx       lights, fog, assembly, effects
  scene/Room.jsx        walls, floor, window, sky, curtains rod
  scene/Curtain.jsx     wind shader curtain
  scene/Desk.jsx        desk + props (laptop, mug, plants, notebook)
  scene/Lamp.jsx        architect lamp + spotlight + dust
  scene/Book.jsx        the book (cover, page blocks, skinned leaves, link hit-testing)
  scene/CameraRig.jsx   scroll → camera shots
  ui/Overlay.jsx        enter screen, header, chapter nav, link dock, sound toggle
  ui/HiddenResume.jsx   screen-reader / SEO version
public/praveen-bajpai-resume.pdf
```

## Build order

1. Scaffold project, install packages.
2. Scroll + camera with the room blocked out.
3. Book with flipping pages driven by scroll.
4. Page artwork from resume content; clickable links.
5. Lighting, sky, curtains, props, post-processing.
6. Wind + page-turn audio, enter screen, overlay UI.
7. Mobile framing, reduced motion, hidden resume HTML.
8. Check in the browser (desktop + phone sizes), tune, production build.

## Later (optional)

- Swap code-built props for CC0 models (Poly Haven `desk_lamp_arm_01`, `wooden_table_02`, …) via `npx gltfjsx --transform`.
- Replace the synthesized wind with a recorded loop (Freesound CC0 / Pixabay) — `lib/audio.js` has one place to change.
- Deploy to Vercel (`npm run build` → `dist/`).

## Update — neon room + calm music

- Room restyled after the second reference: magenta / violet / cyan LED strips with wall glow,
  corkboard with wireframes and sticky notes, "WEB DEVELOPER" poster, wall code screen, framed art,
  fairy lights around the window, city skyline with lit windows and neon signs outside.
- Desk gear: RGB keyboard (animated rainbow backlight), RGB mouse, headphones, two chibi figurines,
  digital clock showing the real time, second laptop, second mug, sill plant, cables, gaming chair.
- Sound: calm generative ambient music is now the main layer (Fmaj7 → G6 → Em7 → Am7 pads with
  reverb, soft bass, sparse piano-like pentatonic notes). Wind sits quietly underneath; page turns
  are softer. `MUSIC_URL` lets you swap in your own MP3.
- Performance: 4 coloured point lights only, 1024px shadow maps, DPR capped at 1.5, post-processing
  switches off automatically on slow devices.
