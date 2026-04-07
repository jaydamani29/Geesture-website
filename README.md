# Maison Elan — Frontend scaffold

This repository contains a minimal vanilla HTML/CSS/JS landing page scaffold with an "Old Money" luxury theme. It is intended for a college assignment that only allows HTML, CSS and plain JavaScript.

Files added:

- `index.html` — main page (semantic sections, nav)
- `css/style.css` — theme styles, CSS variables, responsive rules
- `js/main.js` — scroll navigation, menu toggle, reveal observer, parallax, gesture placeholders
- `assets/ornament.svg` — decorative SVG used in hero

How to run:

Open `index.html` in your browser or serve the folder with a static server (e.g. `npx serve` or `python -m http.server`).

Gesture integration:

`js/main.js` exposes these functions on `window`:

- `gestureNextSection()`
- `gesturePreviousSection()`
- `gestureClick(x,y)`

They are placeholders to be connected to a MediaPipe or other gesture detection pipeline.
