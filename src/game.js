// Rules of Knot Again.
// Ropes join pegs. Drag the pegs until no two ropes on the same layer cross or lie on top of each other.
// Ropes on different layers pass over and under one another freely. Steel pegs are bolted down; every
// other peg moves. Each level is built from a layout that is already untangled (the "target"), with the
// movable pegs then scattered, so every level is solvable by construction.

export const SIZE = 560
export const TOTAL_LEVELS = 200
export const PACK = 12
export const PACKS = Math.ceil(TOTAL_LEVELS / PACK)
export const PEG_R = 17
export const PEG_TOL = 22
export const MIN_SEP = 40
const TARGET_SEP = 70
const MARGIN = 30

export const WORLDS = [
  { name: 'Shoelaces', wood: 0x7dd3fc, dark: 0x0369a1, grain: 0x38bdf8, bg: ['#1f5f8b', '#0a1a2e'], wall: 0x10324d, accent: 0x7dd3fc },
  { name: 'Pinned Down', wood: 0xfcd34d, dark: 0xb45309, grain: 0xf59e0b, bg: ['#7a4a14', '#24130a'], wall: 0x3a2410, accent: 0xfcd34d },
  { name: 'Over & Under', wood: 0xc4b5fd, dark: 0x6d28d9, grain: 0xa78bfa, bg: ['#4c2a85', '#150a2e'], wall: 0x27144d, accent: 0xc4b5fd },
  { name: 'Three Decks', wood: 0x86efac, dark: 0x15803d, grain: 0x4ade80, bg: ['#1b6a45', '#06221a'], wall: 0x0c3a2a, accent: 0x86efac },
  { name: 'Grand Tangle', wood: 0xfda4af, dark: 0xbe123c, grain: 0xfb7185, bg: ['#7d2742', '#26091a'], wall: 0x44142b, accent: 0xfda4af },
]
export const worldOf = (n) => Math.min(WORLDS.length - 1, Math.floor((n - 1) / 40))

export function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- geometry ---------------------------------------------------------------------------------------------

const cross = (ax, ay, bx, by) => ax * by - ay * bx

function segPoint(a, b, c, d) {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = d.x - c.x
  const sy = d.y - c.y
  const den = cross(rx, ry, sx, sy)
  if (Math.abs(den) < 1e-9) return null
  const t = cross(c.x - a.x, c.y - a.y, sx, sy) / den
  const u = cross(c.x - a.x, c.y - a.y, rx, ry) / den
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null
  return { x: a.x + t * rx, y: a.y + t * ry }
}

export function distToSeg(p, a, b) {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const l2 = vx * vx + vy * vy
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2)) : 0
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy))
}

// Every tangle in a layout: { t: 'x', i, j, x, y } two ropes cross, { t: 'o', i, j, x, y } two ropes leaving
// one peg lie on top of each other, { t: 'p', i, k, x, y } a peg sits on a rope of its own layer.
export function conflicts(lvl, pos) {
  const out = []
  const R = lvl.ropes
  for (let i = 0; i < R.length; i++) {
    for (let j = i + 1; j < R.length; j++) {
      if (R[i].layer !== R[j].layer) continue
      const shared = [R[i].a, R[i].b].find((p) => p === R[j].a || p === R[j].b)
      if (shared === undefined) {
        const hit = segPoint(pos[R[i].a], pos[R[i].b], pos[R[j].a], pos[R[j].b])
        if (hit) out.push({ t: 'x', i, j, ...hit })
      } else {
        const o = pos[shared]
        const u = pos[R[i].a === shared ? R[i].b : R[i].a]
        const v = pos[R[j].a === shared ? R[j].b : R[j].a]
        const ang = Math.atan2(Math.abs(cross(u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y)), (u.x - o.x) * (v.x - o.x) + (u.y - o.y) * (v.y - o.y))
        if (ang < 0.12) out.push({ t: 'o', i, j, x: o.x, y: o.y })
      }
    }
  }
  R.forEach((r, i) => {
    for (const k of lvl.layerPegs[r.layer]) {
      if (k === r.a || k === r.b) continue
      if (distToSeg(pos[k], pos[r.a], pos[r.b]) < PEG_TOL) out.push({ t: 'p', i, k, x: pos[k].x, y: pos[k].y })
    }
  })
  return out
}

export const isSolved = (lvl, pos) => conflicts(lvl, pos).length === 0
export const startPositions = (lvl) => lvl.pegs.map((p) => ({ x: p.x, y: p.y }))
export const targetPositions = (lvl) => lvl.pegs.map((p) => ({ x: p.tx, y: p.ty }))

// ---- generator --------------------------------------------------------------------------------------------

const CFG = [
  { p: [5, 7], layers: 1, pins: [0, 0], m: [1.0, 1.3] },
  { p: [7, 10], layers: 1, pins: [0.25, 0.35], m: [1.15, 1.45] },
  { p: [7, 10], layers: 2, pins: [0.2, 0.3], m: [1.5, 1.9] },
  { p: [9, 13], layers: 3, pins: [0.25, 0.35], m: [1.8, 2.2] },
  { p: [12, 17], layers: 3, pins: [0.3, 0.4], m: [2.0, 2.4] },
]
const lerp = (a, b, t) => a + (b - a) * t

function finish(lvl) {
  lvl.layerPegs = Array.from({ length: lvl.layers }, () => [])
  for (const r of lvl.ropes) for (const k of [r.a, r.b]) if (!lvl.layerPegs[r.layer].includes(k)) lvl.layerPegs[r.layer].push(k)
  return lvl
}

function tryBuild(n, rnd) {
  const world = worldOf(n)
  const cfg = CFG[world]
  const t = ((n - 1) % 40) / 39
  const P = Math.round(lerp(cfg.p[0], cfg.p[1], t))
  const M = Math.round(P * lerp(cfg.m[0], cfg.m[1], t))
  const L = cfg.layers
  const lo = MARGIN
  const hi = SIZE - MARGIN
  const T = []
  for (let tries = 0; T.length < P && tries < 600; tries++) {
    const p = { x: lo + rnd() * (hi - lo), y: lo + rnd() * (hi - lo) }
    if (T.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= TARGET_SEP)) T.push(p)
  }
  if (T.length < P) return null

  const ropes = []
  const lvl = { n, size: SIZE, layers: L, pegs: [], ropes, par: 0 }
  const used = new Set()
  const valid = (a, b, l) => {
    const A = T[a]
    const B = T[b]
    const inc = new Set()
    for (const r of ropes) {
      if (r.layer !== l) continue
      inc.add(r.a).add(r.b)
      const shared = [a, b].find((p) => p === r.a || p === r.b)
      if (shared === undefined) {
        if (segPoint(A, B, T[r.a], T[r.b])) return false
        if (distToSeg(A, T[r.a], T[r.b]) < PEG_TOL + 4 || distToSeg(B, T[r.a], T[r.b]) < PEG_TOL + 4) return false
      } else {
        const o = T[shared]
        const u = T[a === shared ? b : a]
        const v = T[r.a === shared ? r.b : r.a]
        const ang = Math.atan2(Math.abs(cross(u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y)), (u.x - o.x) * (v.x - o.x) + (u.y - o.y) * (v.y - o.y))
        if (ang < 0.35) return false
        const other = a === shared ? B : A
        if (distToSeg(other, T[r.a], T[r.b]) < PEG_TOL + 4) return false
        const far = T[r.a === shared ? r.b : r.a]
        if (distToSeg(far, A, B) < PEG_TOL + 4) return false
      }
    }
    for (const k of inc) if (k !== a && k !== b && distToSeg(T[k], A, B) < PEG_TOL + 4) return false
    return true
  }
  const add = (a, b, l) => {
    ropes.push({ a, b, layer: l, c: ropes.length % 8 })
    used.add(a * 100 + b)
  }

  const cand = []
  for (let a = 0; a < P; a++) {
    for (let b = a + 1; b < P; b++) {
      const d = Math.hypot(T[a].x - T[b].x, T[a].y - T[b].y)
      if (d < 360) cand.push({ a, b, k: d * (0.75 + rnd() * 0.6) })
    }
  }
  cand.sort((x, y) => x.k - y.k)
  const cap = Math.ceil(M / L)
  const counts = new Array(L).fill(0)
  for (const c of cand) {
    if (ropes.length >= M) break
    const order = [...Array(L).keys()].filter((l) => counts[l] < cap).sort((x, y) => counts[x] - counts[y] || rnd() - 0.5)
    for (const l of order) {
      if (valid(c.a, c.b, l)) {
        add(c.a, c.b, l)
        counts[l]++
        break
      }
    }
  }
  const deg = new Array(P).fill(0)
  for (const r of ropes) {
    deg[r.a]++
    deg[r.b]++
  }
  for (let k = 0; k < P; k++) {
    if (deg[k]) continue
    const near = cand.filter((c) => (c.a === k || c.b === k) && !used.has(c.a * 100 + c.b))
    let ok = false
    for (const c of near) {
      for (let l = 0; l < L && !ok; l++) {
        if (valid(c.a, c.b, l)) {
          add(c.a, c.b, l)
          deg[c.a]++
          deg[c.b]++
          ok = true
        }
      }
      if (ok) break
    }
    if (!ok) return null
  }
  if (ropes.length < Math.max(P - 1, Math.round(M * 0.8))) return null

  const pins = Math.min(P - 3, Math.round(P * lerp(cfg.pins[0], cfg.pins[1], t)))
  const order = [...Array(P).keys()].sort((x, y) => Math.min(deg[y], 2) - Math.min(deg[x], 2) || rnd() - 0.5)
  const pinned = new Set(order.slice(0, Math.max(0, pins)))
  lvl.pegs = T.map((p, k) => ({ x: p.x, y: p.y, tx: p.x, ty: p.y, pin: pinned.has(k) }))
  finish(lvl)

  const free = lvl.pegs.map((p, k) => k).filter((k) => !lvl.pegs[k].pin)
  const need = Math.max(2, Math.round(ropes.length * 0.35))
  let best = null
  for (let attempt = 0; attempt < 300; attempt++) {
    const pos = startPositions(lvl)
    for (const k of free) {
      for (let tries = 0; tries < 60; tries++) {
        const p = { x: lo + rnd() * (hi - lo), y: lo + rnd() * (hi - lo) }
        if (pos.every((q, j) => j === k || Math.hypot(q.x - p.x, q.y - p.y) >= 46)) {
          pos[k] = p
          break
        }
      }
    }
    const count = conflicts(lvl, pos).length
    if (!best || count > best.count) best = { pos, count }
    if (count >= need) break
  }
  if (!best || best.count < 1) return null
  free.forEach((k) => {
    lvl.pegs[k].x = best.pos[k].x
    lvl.pegs[k].y = best.pos[k].y
  })
  lvl.par = free.length
  return lvl
}

export function build(n) {
  const rnd = mulberry32(n * 7919 + 17)
  for (let attempt = 0; attempt < 200; attempt++) {
    const lvl = tryBuild(n, rnd)
    if (lvl) return lvl
  }
  throw new Error(`could not build level ${n}`)
}

const cache = new Map()
export function generateLevel(n) {
  if (!cache.has(n)) cache.set(n, build(n))
  return cache.get(n)
}
export const levelData = generateLevel

export function starsFor(lvl, moves) {
  if (moves <= Math.ceil(lvl.par * 1.5) + 1) return 3
  if (moves <= Math.ceil(lvl.par * 2.5) + 2) return 2
  return 1
}
