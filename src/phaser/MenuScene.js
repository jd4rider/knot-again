import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { TOTAL_LEVELS, PACK, WORLDS } from '../game.js'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu')
  }

  create() {
    this.input.enabled = true
    background(this, WORLDS[0].bg, 0xfde68a)
    this.cameras.main.fadeIn(300, 20, 10, 4)

    const g = this.add.graphics()
    const cols = [0xf59e0b, 0x38bdf8, 0x4ade80, 0xf472b6, 0xa78bfa]
    const pts = [[110, 120], [300, 230], [520, 110], [200, 250], [440, 250]]
    const ropes = [[0, 1], [1, 2], [0, 2], [3, 2], [0, 4], [3, 4]]
    ropes.forEach(([a, b], k) => {
      g.lineStyle(18, 0x0f172a, 0.8).lineBetween(...pts[a], ...pts[b])
      g.lineStyle(11, cols[k % 5], 1).lineBetween(...pts[a], ...pts[b])
    })
    pts.forEach(([x, y]) => g.fillStyle(0x7c4a1e, 1).fillCircle(x, y, 18).fillStyle(0xf1c27d, 1).fillCircle(x, y, 14))
    const t = text(this, W / 2, 175, 'KNOT AGAIN', 56, '#fff', { fontStyle: 'bold', stroke: '#1e1536', strokeThickness: 10 }).setOrigin(0.5)
    this.tweens.add({ targets: t, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    text(this, W / 2, 330, 'Drag the pegs. Untangle the ropes.', 21, '#fde68a', { align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5)
    text(this, W / 2, 362, 'Steel pegs and layered ropes will test you.', 17, '#d9ccf5').setOrigin(0.5)

    const done = Object.keys(data.stars).length
    const stars = Object.values(data.stars).reduce((a, b) => a + b, 0)
    const next = Math.min(data.unlocked, TOTAL_LEVELS)
    button(this, W / 2, 470, next > 1 ? `▶  Continue · Level ${next}` : '▶  Play', () => fade(this, 'game', { level: next }), { w: 420, h: 66, size: 28, color: 0xd97706 })
    button(this, W / 2, 560, '🗂  Levels', () => fade(this, 'levels', { page: Math.floor((next - 1) / PACK) }), { w: 420, h: 60, size: 26, color: 0x0f766e })
    text(this, W / 2, 618, `${done}/${TOTAL_LEVELS} levels · ${stars}★`, 20, '#fff').setOrigin(0.5)

    WORLDS.forEach((w, i) => this.add.circle(W / 2 + (i - 2) * 34, 690, 11, w.wood).setStrokeStyle(3, w.dark))
    text(this, W / 2, 770, 'Ropes on different layers may cross.', 17, '#f1dfbf').setOrigin(0.5)
    text(this, W / 2, H - 50, '200 levels · 5 worlds · undo & hints', 15, '#bfa77c').setOrigin(0.5)
  }
}
