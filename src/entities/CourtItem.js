// @ts-check

/**
 * @typedef {'reduce' | 'size_up' | 'slow_down' | 'energy_boost' | 'energy_down' | 'bomb' | 'invisibility'} CourtItemType
 * @typedef {'down_triangle' | 'up_triangle' | 'diamond' | 'pentagon' | 'cross' | 'bomb' | 'hexagon'} CourtItemShape
 */

/**
 * PONG: CYBERSTORM - In-Court Item Entity
 * Spawns periodically onto the arena to provide stackable buffs, debuffs, or timed hazards.
 */
class CourtItem {
  /**
   * Constructs an in-court collectable item.
   * @param {number} x - Center X position in arena pixels.
   * @param {number} y - Center Y position in arena pixels.
   * @param {CourtItemType} type - Functional type classification of the item.
   */
  constructor(x, y, type) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
    /** @type {CourtItemType} */
    this.type = type;
    /** @type {number} */
    this.radius = 16;
    /** @type {number} */
    this.angle = 0;
    /** @type {number} */
    this.pulse = 0;
    /** @type {number} */
    this.life = 10; // Lasts 10s if untouched
    /** @type {number} */
    this.maxLife = 10;
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.color = '#ffffff';
    /** @type {CourtItemShape} */
    this.shape = 'diamond';

    switch (type) {
      case 'reduce':
        this.name = 'Reduce';
        this.color = '#ff2a5f'; // Neon Crimson Red
        this.shape = 'down_triangle';
        break;
      case 'size_up':
        this.name = 'Size it up';
        this.color = '#00ff88'; // Neon Emerald Green
        this.shape = 'up_triangle';
        break;
      case 'slow_down':
        this.name = 'Slow down';
        this.color = '#00c3ff'; // Neon Cyan Blue
        this.shape = 'diamond';
        break;
      case 'energy_boost':
        this.name = 'Energy boost';
        this.color = '#ffe600'; // Neon Gold Yellow
        this.shape = 'pentagon';
        break;
      case 'energy_down':
        this.name = 'Energy down';
        this.color = '#cc00ff'; // Neon Violet Purple
        this.shape = 'cross';
        break;
      case 'bomb':
        this.name = 'Bomb';
        this.color = '#ff4400'; // Neon Incandescent Red-Orange
        this.shape = 'bomb';
        break;
      case 'invisibility':
        this.name = 'Invisibility';
        this.color = '#818cf8'; // Neon Ghost Indigo
        this.shape = 'hexagon';
        break;
    }
  }

  /**
   * Updates item rotational angle, pulsating wave, and remaining lifespan.
   * @param {number} dt - Delta time in seconds since last frame.
   * @returns {void}
   */
  update(dt) {
    this.angle += dt * 2.2;
    this.pulse += dt * 5;
    this.life -= dt;
  }

  /**
   * Renders the item with geometric perimeter, neon shadow, and central glyph.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
   * @returns {void}
   */
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const scale = 1 + Math.sin(this.pulse) * 0.12;
    ctx.scale(scale, scale);

    // Glowing boundary
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(10, 12, 22, 0.85)';

    ctx.save();
    ctx.rotate(this.angle);

    const r = this.radius;
    ctx.beginPath();
    if (this.shape === 'down_triangle') {
      ctx.moveTo(0, r);
      ctx.lineTo(-r * 0.86, -r * 0.65);
      ctx.lineTo(r * 0.86, -r * 0.65);
    } else if (this.shape === 'up_triangle') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.86, r * 0.65);
      ctx.lineTo(-r * 0.86, r * 0.65);
    } else if (this.shape === 'diamond') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
    } else if (this.shape === 'pentagon') {
      for (let p = 0; p < 5; p++) {
        const a = (p * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else if (this.shape === 'cross') {
      const w = r * 0.38;
      ctx.moveTo(-w, -r);
      ctx.lineTo(w, -r);
      ctx.lineTo(w, -w);
      ctx.lineTo(r, -w);
      ctx.lineTo(r, w);
      ctx.lineTo(w, w);
      ctx.lineTo(w, r);
      ctx.lineTo(-w, r);
      ctx.lineTo(-w, w);
      ctx.lineTo(-r, w);
      ctx.lineTo(-r, -w);
      ctx.lineTo(-w, -w);
    } else if (this.shape === 'bomb') {
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    } else if (this.shape === 'hexagon') {
      for (let p = 0; p < 6; p++) {
        const a = (p * 2 * Math.PI) / 6;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Central Outline Vector Glyph
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.shape === 'down_triangle') {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-5.5, -3);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(5.5, -3);
      ctx.stroke();
    } else if (this.shape === 'up_triangle') {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-5.5, 3);
      ctx.lineTo(0, -3.5);
      ctx.lineTo(5.5, 3);
      ctx.stroke();
    } else if (this.shape === 'diamond') {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -6.5); ctx.lineTo(0, 6.5);
      ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0);
      ctx.moveTo(-4.5, -4.5); ctx.lineTo(4.5, 4.5);
      ctx.moveTo(4.5, -4.5); ctx.lineTo(-4.5, 4.5);
      ctx.stroke();
    } else if (this.shape === 'pentagon') {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0.5, -7);
      ctx.lineTo(-4.5, 0);
      ctx.lineTo(-0.5, 0);
      ctx.lineTo(-2.5, 7);
      ctx.lineTo(4.5, -0.5);
      ctx.lineTo(0.5, -0.5);
      ctx.closePath();
      ctx.stroke();

      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3.5, -4.5); ctx.lineTo(7.5, -4.5);
      ctx.moveTo(5.5, -6.5); ctx.lineTo(5.5, -2.5);
      ctx.stroke();
    } else if (this.shape === 'cross') {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0.5, -7);
      ctx.lineTo(-4.5, 0);
      ctx.lineTo(-0.5, 0);
      ctx.lineTo(-2.5, 7);
      ctx.lineTo(4.5, -0.5);
      ctx.lineTo(0.5, -0.5);
      ctx.closePath();
      ctx.stroke();

      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3.5, -4.5); ctx.lineTo(7.5, -4.5);
      ctx.stroke();
    } else if (this.shape === 'bomb') {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 1.5, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(-2, -5.5, 4, 1.8);
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.quadraticCurveTo(3, -8.5, 5, -7.5);
      ctx.stroke();
    } else if (this.shape === 'hexagon') {
      ctx.lineWidth = 1.8;
      // Stealth Eye outline
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(0, -5.5, 7, 0);
      ctx.quadraticCurveTo(0, 5.5, -7, 0);
      ctx.stroke();
      // Eye center
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      // Cloak diagonal slash
      ctx.beginPath();
      ctx.moveTo(-5.5, -4.5);
      ctx.lineTo(5.5, 4.5);
      ctx.stroke();
    }

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.CourtItem = CourtItem;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CourtItem;
}
