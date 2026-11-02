import Phaser from 'phaser'
import { W, H, button, text, fade, background } from './common.js'
import { flashAt, popText, grains, ring } from './fx.js'
import { sfx } from '../sound.js'
import { data, persist } from './save.js'
import { levelData, WORLDS, worldOf, TOTAL_LEVELS, PACK, SIZE, PEG_R, MIN_SEP, conflicts, startPositions, targetPositions, starsFor } from '../game.js'

const BX = (W - SIZE) / 2
const BY = 180
const PALETTE = [0xf59e0b, 0x38bdf8, 0x4ade80, 0xf472b6, 0xa78bfa, 0xfb923c, 0x2dd4bf, 0xfacc15]
const shade = (c, f) => {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)))
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255)
}
const clampPos = (p) => ({ x: Phaser.Math.Clamp(p.x, 24, SIZE - 24), y: Phaser.Math.Clamp(p.y, 24, SIZE - 24) })

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game')
  }

  init(d) {
    this.n = Phaser.Math.Clamp(d?.level ?? 1, 1, TOTAL_LEVELS)
  }

  create() {
    this.input.enabled = true
    this.lvl = levelData(this.n)
    this.world = WORLDS[worldOf(this.n)]
    this.pos = startPositions(this.lvl)
    this.target = targetPositions(this.lvl)
    this.history = []
    this.moveCount = 0
    this.ended = false
    this.drag = null
    this.hintInfo = null
    this.tangles = []
    this.cameras.main.fadeIn(250, 4, 10, 20)

    background(this, this.world.bg, this.world.accent)
    this.drawBoard()
    this.gfx = this.add.graphics().setDepth(5)
    this.chips = this.lvl.layers > 1 ? this.lvl.ropes.map(() => text(this, 0, 0, '', 13, '#fff', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(8)) : []
    this.buildHud()
    this.input.on('pointerdown', (p) => this.onDown(p))
    this.input.on('pointermove', (p) => this.onMove(p))
    this.input.on('pointerup', () => this.onUp())
    this.input.keyboard.on('keydown-U', () => this.undo())
    this.input.keyboard.on('keydown-Z', () => this.undo())
    this.input.keyboard.on('keydown-H', () => this.hint())
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ level: this.n }))
    this.input.keyboard.on('keydown-ESC', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }))
    this.refresh()
    this.intro()
  }

  drawBoard() {
    const w = this.world
    const g = this.add.graphics().setDepth(-10)
    const bx = BX - 18
    const by = BY - 18
    const bs = SIZE + 36
    g.fillStyle(0x000000, 0.35).fillRoundedRect(bx + 4, by + 8, bs, bs, 26)
    g.fillStyle(w.wall, 1).fillRoundedRect(bx, by, bs, bs, 26)
    g.lineStyle(5, shade(w.wall, 1.7), 1).strokeRoundedRect(bx, by, bs, bs, 26)
    g.fillStyle(shade(w.wall, 0.65), 1).fillRoundedRect(BX - 4, BY - 4, SIZE + 8, SIZE + 8, 10)
    g.lineStyle(2, 0xffffff, 0.05)
    for (let i = 0; i <= 8; i++) {
      g.lineBetween(BX + (i * SIZE) / 8, BY, BX + (i * SIZE) / 8, BY + SIZE)
      g.lineBetween(BX, BY + (i * SIZE) / 8, BX + SIZE, BY + (i * SIZE) / 8)
    }
  }

  // ---- rendering ------------------------------------------------------------------------------------------

  refresh() {
    this.tangles = conflicts(this.lvl, this.pos)
    this.updateHud()
  }

  update(time) {
    this.render(time)
  }

  render(time) {
    const g = this.gfx
    g.clear()
    const bad = new Set()
    for (const c of this.tangles) {
      bad.add(c.i)
      if (c.t !== 'p') bad.add(c.j)
    }
    const pulse = 0.5 + 0.5 * Math.sin(time / 170)
    const sx = (p) => BX + p.x
    const sy = (p) => BY + p.y
    const order = this.lvl.ropes.map((r, i) => i).sort((a, b) => this.lvl.ropes[a].layer - this.lvl.ropes[b].layer || a - b)
    for (const i of order) {
      const r = this.lvl.ropes[i]
      const A = this.pos[r.a]
      const B = this.pos[r.b]
      const color = PALETTE[r.c % PALETTE.length]
      if (bad.has(i)) g.lineStyle(26, 0xef4444, 0.22 + 0.3 * pulse).lineBetween(sx(A), sy(A), sx(B), sy(B))
      g.lineStyle(19, shade(this.world.wall, 0.45), 0.85).lineBetween(sx(A), sy(A), sx(B), sy(B))
      g.lineStyle(12, shade(color, 0.7), 1).lineBetween(sx(A), sy(A), sx(B), sy(B))
      g.lineStyle(9, color, 1).lineBetween(sx(A), sy(A), sx(B), sy(B))
      g.lineStyle(3, 0xffffff, 0.3).lineBetween(sx(A), sy(A) - 2, sx(B), sy(B) - 2)
      if (this.chips.length) {
        const mx = (sx(A) + sx(B)) / 2
        const my = (sy(A) + sy(B)) / 2
        g.fillStyle(0x0f172a, 0.85).fillCircle(mx, my, 10)
        g.lineStyle(2, 0xffffff, 0.8).strokeCircle(mx, my, 10)
        this.chips[i].setPosition(mx, my).setText(String(r.layer + 1))
      }
    }
    if (this.hintInfo) {
      const t = this.target[this.hintInfo.i]
      const p = this.pos[this.hintInfo.i]
      g.lineStyle(4, 0x4ade80, 0.5 + 0.4 * pulse).strokeCircle(sx(t), sy(t), PEG_R + 6 + 4 * pulse)
      g.fillStyle(0x4ade80, 0.25).fillCircle(sx(t), sy(t), PEG_R)
      g.lineStyle(3, 0xfde047, 0.8).strokeCircle(sx(p), sy(p), PEG_R + 8 + 3 * pulse)
      g.lineStyle(3, 0x4ade80, 0.35).lineBetween(sx(p), sy(p), sx(t), sy(t))
    }
    this.lvl.pegs.forEach((peg, k) => {
      const p = this.pos[k]
      const held = this.drag && this.drag.i === k
      const r = held ? PEG_R * 1.25 : PEG_R
      const x = sx(p)
      const y = sy(p) - (held ? 4 : 0)
      g.fillStyle(0x000000, 0.4).fillCircle(x + 2, y + (held ? 10 : 5), r)
      if (peg.pin) {
        g.fillStyle(0x334155, 1).fillCircle(x, y, r)
        g.fillStyle(0xcbd5e1, 1).fillCircle(x, y, r - 4)
        g.fillStyle(0xffffff, 0.45).fillCircle(x - 4, y - 5, 5)
        g.lineStyle(4, 0x475569, 1).lineBetween(x - 8, y + 3, x + 8, y - 3)
      } else {
        g.fillStyle(0x7c4a1e, 1).fillCircle(x, y, r)
        g.fillStyle(held ? 0xfde68a : 0xf1c27d, 1).fillCircle(x, y, r - 3.5)
        g.fillStyle(0xffffff, 0.5).fillCircle(x - 4, y - 5, 4.5)
        g.lineStyle(2, 0x7c4a1e, 0.45).strokeCircle(x, y, r - 8)
      }
    })
    for (const c of this.tangles) {
      const x = sx(c)
      const y = sy(c)
      g.lineStyle(4, 0xfecaca, 0.6 + 0.4 * pulse).strokeCircle(x, y, 12 + 3 * pulse)
      g.lineStyle(5, 0xef4444, 1).lineBetween(x - 6, y - 6, x + 6, y + 6).lineBetween(x - 6, y + 6, x + 6, y - 6)
    }
  }

  // ---- HUD ------------------------------------------------------------------------------------------------

  buildHud() {
    text(this, W / 2, 34, `Level ${this.n}`, 32, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5)
    text(this, W / 2, 70, this.world.name, 17, '#e4ecf7').setOrigin(0.5)
    this.movesText = text(this, W / 2, 104, '', 20, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5)
    this.msg = text(this, W / 2, 142, '', 18, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 4, align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5).setDepth(150)
    const y = 792
    const b = { w: 126, h: 52, size: 19 }
    this.undoBtn = button(this, 78, y, '↶ Undo', () => this.undo(), { ...b, color: 0x0f766e })
    button(this, 218, y, '💡 Hint', () => this.hint(), { ...b, color: 0xb45309 })
    button(this, 358, y, '↻ Restart', () => this.scene.restart({ level: this.n }), { ...b, color: 0x1d4ed8 })
    button(this, 498, y, '☰ Levels', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }), { ...b, color: 0x475569 })
    text(this, W / 2, 836, 'Drag pegs · no two ropes may cross · U undo · H hint · R restart', 13, '#b6c4dd').setOrigin(0.5)
  }

  updateHud() {
    const t = this.tangles.length
    this.movesText.setText(`Tangles ${t}   ·   Moves ${this.moveCount}   ·   3★ in ${Math.ceil(this.lvl.par * 1.5) + 1}`)
    this.movesText.setColor(t ? '#fde68a' : '#86efac')
    this.undoBtn?.setAlpha(this.history.length ? 1 : 0.45)
  }

  toast(str, color = '#fff', ms = 2600) {
    this.msg.setText(str).setColor(color).setAlpha(1)
    this.msgTimer?.remove()
    if (ms) this.msgTimer = this.time.delayedCall(ms, () => this.tweens.add({ targets: this.msg, alpha: 0, duration: 300 }))
  }

  intro() {
    data.seen ||= {}
    const once = (key, msg, color) => {
      data.seen[key] = 1
      persist()
      this.toast(msg, color, 7000)
    }
    const pinned = this.lvl.pegs.some((p) => p.pin)
    if (this.n === 1) this.toast('Drag the pegs until no two ropes cross.', '#fde68a', 7000)
    else if (this.lvl.layers > 1 && !data.seen.layers) once('layers', 'Numbers mark layers. Only ropes on the SAME layer must not cross.', '#c4b5fd')
    else if (pinned && !data.seen.pins) once('pins', 'Steel pegs are bolted down. Move the wooden ones.', '#cbd5e1')
  }

  // ---- input ----------------------------------------------------------------------------------------------

  pegAt(pointer) {
    const x = pointer.worldX - BX
    const y = pointer.worldY - BY
    let best = -1
    let bd = 46
    this.pos.forEach((p, k) => {
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bd) {
        bd = d
        best = k
      }
    })
    return best
  }

  onDown(pointer) {
    if (this.ended || this.drag) return
    const k = this.pegAt(pointer)
    if (k < 0) return
    if (this.lvl.pegs[k].pin) {
      sfx.wrong()
      this.toast('That peg is bolted down.', '#cbd5e1', 1400)
      return
    }
    const p = this.pos[k]
    this.drag = { i: k, ox: p.x - (pointer.worldX - BX), oy: p.y - (pointer.worldY - BY), before: this.pos.map((q) => ({ ...q })), moved: 0 }
    sfx.click()
  }

  onMove(pointer) {
    const d = this.drag
    if (!d) return
    const raw = { x: pointer.worldX - BX + d.ox, y: pointer.worldY - BY + d.oy }
    let p = clampPos(raw)
    this.pos.forEach((q, j) => {
      if (j === d.i) return
      const dist = Math.hypot(p.x - q.x, p.y - q.y)
      if (dist < MIN_SEP) {
        const f = dist > 0.001 ? MIN_SEP / dist : 1
        p = clampPos({ x: q.x + (p.x - q.x) * f, y: q.y + (p.y - q.y) * f })
      }
    })
    this.pos[d.i] = p
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.before[d.i].x, p.y - d.before[d.i].y))
    this.tangles = conflicts(this.lvl, this.pos)
    this.updateHud()
  }

  onUp() {
    const d = this.drag
    if (!d) return
    this.drag = null
    if (d.moved < 10) {
      this.pos = d.before
      this.refresh()
      return
    }
    this.history.push(d.before)
    this.moveCount++
    if (this.hintInfo?.i === d.i) this.hintInfo = null
    sfx.clunk()
    this.refresh()
    this.msg.setAlpha(0)
    if (!this.tangles.length) this.finish()
  }

  undo() {
    if (this.ended || this.drag || !this.history.length) return
    this.pos = this.history.pop()
    this.moveCount = Math.max(0, this.moveCount - 1)
    this.hintInfo = null
    sfx.click()
    this.refresh()
    this.msg.setAlpha(0)
  }

  hint() {
    if (this.ended || this.drag) return
    let pick = -1
    let far = 14
    this.pos.forEach((p, k) => {
      if (this.lvl.pegs[k].pin) return
      const d = Math.hypot(p.x - this.target[k].x, p.y - this.target[k].y)
      if (d > far) {
        far = d
        pick = k
      }
    })
    if (pick < 0) return
    this.hintInfo = { i: pick }
    sfx.hint()
    this.toast('Move the glowing peg to the green ring.', '#fde68a', 3500)
  }

  // ---- finish ---------------------------------------------------------------------------------------------

  finish() {
    this.ended = true
    sfx.coin()
    this.lvl.ropes.forEach((r, i) => {
      const a = this.pos[r.a]
      const b = this.pos[r.b]
      this.time.delayedCall(i * 40, () => ring(this, BX + (a.x + b.x) / 2, BY + (a.y + b.y) / 2, PALETTE[r.c % PALETTE.length], 40, 500, 5))
    })
    this.time.delayedCall(700, () => this.win())
  }

  win() {
    const earned = starsFor(this.lvl, this.moveCount)
    data.stars[this.n] = Math.max(data.stars[this.n] || 0, earned)
    if (this.n + 1 > data.unlocked && this.n < TOTAL_LEVELS) data.unlocked = this.n + 1
    const prev = data.best[this.n]
    const best = prev && this.moveCount < prev
    if (!prev || this.moveCount < prev) data.best[this.n] = this.moveCount
    persist()
    sfx.win()
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 140, () => grains(this, Phaser.Math.Between(120, 520), Phaser.Math.Between(240, 560), [0xfde047, 0xf59e0b, 0xffffff, this.world.accent], 24, 380))
    const D = 200
    const shadeR = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(D)
    this.tweens.add({ targets: shadeR, fillAlpha: 0.55, duration: 300 })
    const box = this.add.container(W / 2, H / 2 - 20).setDepth(D + 1)
    const bg = this.add.graphics()
    bg.fillStyle(0x10203a, 0.97).fillRoundedRect(-270, -200, 540, 400, 28)
    bg.lineStyle(4, 0xfde047, 1).strokeRoundedRect(-270, -200, 540, 400, 28)
    box.add(bg)
    box.add(text(this, 0, -150, 'Untangled!', 44, '#fde047', { fontStyle: 'bold' }).setOrigin(0.5))
    for (let i = 0; i < 3; i++) {
      const st = text(this, (i - 1) * 80, -70, '★', 70, i < earned ? '#fde047' : '#34476a').setOrigin(0.5)
      box.add(st)
      if (i < earned) this.tweens.add({ targets: st, scale: 1.4, duration: 260, delay: 250 + i * 240, yoyo: true, ease: 'Back.Out' })
    }
    box.add(text(this, 0, 5, `${this.moveCount} moves  ·  par ${this.lvl.par}${best ? '  ·  new best!' : ''}`, 20, '#dbe7fb').setOrigin(0.5))
    const hasNext = this.n < TOTAL_LEVELS
    const y = 110
    box.add(button(this, hasNext ? -170 : -90, y, '↻ Retry', () => this.scene.restart({ level: this.n }), { w: 150, h: 58, size: 22, color: 0x1d4ed8 }))
    box.add(button(this, hasNext ? 0 : 90, y, '🗂 Levels', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }), { w: 150, h: 58, size: 22, color: 0x475569 }))
    if (hasNext) box.add(button(this, 170, y, 'Next ▶', () => fade(this, 'game', { level: this.n + 1 }), { w: 150, h: 58, size: 22, color: 0xd97706 }))
    box.setScale(0.7).setAlpha(0)
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' })
    this.input.keyboard.once('keydown-ENTER', () => (hasNext ? fade(this, 'game', { level: this.n + 1 }) : this.scene.restart({ level: this.n })))
    flashAt(this, W / 2, H / 2, 600, 0xfde047)
    popText(this, W / 2, 150, `${earned}★`, '#fde047', 34)
  }
}
