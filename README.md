# Knot Again

A rope-untangling puzzle: drag the pegs so that no two ropes cross. Built with Phaser 4, Vite and Electron, playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play in your browser: <https://jd4rider.github.io/knot-again/play/>
- Downloads: <https://github.com/jd4rider/knot-again/releases/latest>

## How to play

- Drag a peg to move it. Rope ends follow, and the goal is that no two ropes cross.
- **Steel pegs** are bolted down. Move the wooden ones.
- In later worlds ropes sit on numbered **layers**. Only ropes on the same layer may not cross.
- 200 levels (seeded, each solvable by construction) across 5 worlds. Undo (U), hint (H), restart (R), Esc for levels.

## Develop

```sh
npm install
npm run dev      # web dev server
npm test         # level generator tests
npm start        # build and open in Electron
npm run dist:mac # package an installer (also dist:win, dist:linux)
```

## Release

Push a tag like `v0.1.0` and the **Release apps** workflow builds the macOS, Windows and Linux installers. Every push to `main` deploys the web version to GitHub Pages.
