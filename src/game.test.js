import test from 'node:test'
import assert from 'node:assert/strict'
import { generateLevel, build, conflicts, isSolved, startPositions, targetPositions, starsFor, worldOf, TOTAL_LEVELS, SIZE, MIN_SEP } from './game.js'

test('levels are deterministic', () => {
  for (const n of [1, 37, 120, 200]) assert.deepEqual(build(n), build(n))
})

test('every level starts tangled and is solved by moving each loose peg to its target', () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const l = generateLevel(n)
    assert.ok(conflicts(l, startPositions(l)).length >= 1, `level ${n} starts tangled`)
    assert.ok(isSolved(l, targetPositions(l)), `level ${n} target is untangled`)
    const pos = startPositions(l)
    let moves = 0
    l.pegs.forEach((p, k) => {
      if (p.pin) assert.deepEqual([p.x, p.y], [p.tx, p.ty], `level ${n} pinned peg ${k} stays`)
      else {
        pos[k] = { x: p.tx, y: p.ty }
        moves++
      }
    })
    assert.ok(isSolved(l, pos), `level ${n} solved`)
    assert.equal(moves, l.par, `level ${n} par`)
    assert.ok(l.par >= 3, `level ${n} has loose pegs`)
  }
})

test('layout is well formed', () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const l = generateLevel(n)
    const deg = new Array(l.pegs.length).fill(0)
    for (const r of l.ropes) {
      assert.ok(r.layer >= 0 && r.layer < l.layers)
      deg[r.a]++
      deg[r.b]++
    }
    assert.ok(deg.every((d) => d > 0), `level ${n} has no stray peg`)
    for (const p of l.pegs) assert.ok(p.x >= 0 && p.x <= SIZE && p.y >= 0 && p.y <= SIZE)
    for (const [i, a] of l.pegs.entries()) for (const b of l.pegs.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= MIN_SEP, `level ${n} pegs apart`)
  }
})

test('worlds introduce pins and layers', () => {
  assert.ok(generateLevel(10).pegs.every((p) => !p.pin) && generateLevel(10).layers === 1)
  assert.ok(generateLevel(60).pegs.some((p) => p.pin))
  assert.equal(generateLevel(100).layers, 2)
  assert.equal(generateLevel(140).layers, 3)
  assert.ok(new Set(generateLevel(140).ropes.map((r) => r.layer)).size > 1)
  assert.equal(worldOf(200), 4)
})

test('ropes on different layers may cross, same layer may not', () => {
  const pegs = [0, 1, 2, 3].map((k) => ({ x: 0, y: 0, tx: 0, ty: 0, pin: false, k }))
  const lvl = { layers: 2, pegs, ropes: [{ a: 0, b: 1, layer: 0 }, { a: 2, b: 3, layer: 1 }], layerPegs: [[0, 1], [2, 3]] }
  const pos = [{ x: 0, y: 100 }, { x: 200, y: 100 }, { x: 100, y: 0 }, { x: 100, y: 200 }]
  assert.equal(conflicts(lvl, pos).length, 0)
  lvl.ropes[1].layer = 0
  lvl.layerPegs = [[0, 1, 2, 3], []]
  assert.equal(conflicts(lvl, pos).filter((c) => c.t === 'x').length, 1)
})

test('star rating follows par', () => {
  assert.equal(starsFor({ par: 6 }, 10), 3)
  assert.equal(starsFor({ par: 6 }, 17), 2)
  assert.equal(starsFor({ par: 6 }, 30), 1)
})
