// @ts-check

/**
 * PONG: CYBERSTORM - Arcade Particle Entity
 * Lightweight visual effect particle used for paddle impacts, wall bounces,
 * fireball trails, Crazy Ball glitch sparks, bomb detonations, and item collection bursts.
 */
class Particle {
  /**
   * Creates an arcade particle.
   * @param {number} x - Initial X coordinate on the canvas.
   * @param {number} y - Initial Y coordinate on the canvas.
   * @param {string} color - Hex or CSS color string for fill and glow.
   * @param {number} vx - Horizontal velocity vector per frame.
   * @param {number} vy - Vertical velocity vector per frame.
   * @param {number} [life=1] - Lifespan duration in seconds.
   * @param {number} [size=3] - Radius size in pixels.
   */
  constructor(x, y, color, vx, vy, life = 1, size = 3) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
    /** @type {string} */
    this.color = color;
    /** @type {number} */
    this.vx = vx;
    /** @type {number} */
    this.vy = vy;
    /** @type {number} */
    this.life = life;
    /** @type {number} */
    this.maxLife = life;
    /** @type {number} */
    this.size = size;
  }

  /**
   * Updates particle motion, lifespan decay, and shrink progression.
   * @param {number} dt - Delta time in seconds since last animation frame.
   * @returns {void}
   */
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt * 2.2;
    this.size = Math.max(0, this.size - dt * 2);
  }

  /**
   * Renders the particle with glowing radial falloff on the canvas context.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   * @returns {void}
   */
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Particle = Particle;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Particle;
}
