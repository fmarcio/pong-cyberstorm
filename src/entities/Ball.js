// @ts-check

/**
 * @typedef {Object} TrailPoint
 * @property {number} x - Horizontal coordinate of the trail snapshot.
 * @property {number} y - Vertical coordinate of the trail snapshot.
 * @property {boolean} isFireball - Whether the ball was in Fireball state during this snapshot.
 */

/**
 * @typedef {Object} ActiveEffect
 * @property {string} type - Identifier of the active modifier effect.
 * @property {number} multiplier - Value scaling factor applied.
 * @property {number} duration - Remaining lifespan in seconds.
 */

/**
 * PONG: CYBERSTORM - Ball Entity
 * Supports standard ball physics, Fireball state, armed Bomb state,
 * shrapnel pieces, motion trails, and stackable timed modifiers.
 */
class Ball {
  /**
   * Constructs an arena ball.
   * @param {number} x - Initial X coordinate.
   * @param {number} y - Initial Y coordinate.
   * @param {number} vx - Horizontal velocity vector per frame.
   * @param {number} vy - Vertical velocity vector per frame.
   * @param {number} speed - Absolute movement speed magnitude.
   * @param {number} [radius=9] - Base radius in pixels.
   * @param {number} [lastHitterId=1] - ID of the player paddle who last hit the ball (1 or 2).
   */
  constructor(x, y, vx, vy, speed, radius = 9, lastHitterId = 1) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
    /** @type {number} */
    this.vx = vx;
    /** @type {number} */
    this.vy = vy;
    /** @type {number} */
    this.speed = speed;
    /** @type {number} */
    this.baseRadius = radius;
    /** @type {number} */
    this.radius = radius;
    /** @type {TrailPoint[]} */
    this.trail = [];
    /** @type {number} */
    this.maxTrail = 10;
    /** @type {boolean} */
    this.isFireball = false;
    /** @type {number|null} */
    this.fireballOwner = null; // 1 or 2
    /** @type {number} */
    this.lastHitterId = lastHitterId;
    /** @type {ActiveEffect[]} */
    this.activeEffects = []; // Cumulative stackable timed effects
    /** @type {boolean} */
    this.isBomb = false;
    /** @type {number} */
    this.bombTimer = 0;
    /** @type {number} */
    this.bombMaxTimer = 5.0;
    /** @type {boolean} */
    this.isShrapnel = false;
    /** @type {number} */
    this.invisibilityTimer = 0; // Cloaked flickering effect remaining duration
    /** @type {number|null} */
    this.invisibilityOwner = null; // Player who collected the item (1 or 2)
  }

  /**
   * Activates cloaked invisibility effect for a set duration.
   * Alternates opacity between 1.0 and 0.40 while travelling towards the opponent.
   * @param {number} ownerId - Player ID who activated invisibility (1 or 2).
   * @param {number} [duration=5.0] - Time until invisibility fades in seconds.
   * @returns {void}
   */
  setInvisibility(ownerId, duration = 5.0) {
    this.invisibilityTimer = duration;
    this.invisibilityOwner = ownerId;
  }

  /**
   * Primes the ball as a ticking bomb for a set duration.
   * @param {number} [duration=5.0] - Time until detonation in seconds.
   * @returns {void}
   */
  armBomb(duration = 5.0) {
    this.isBomb = true;
    this.bombTimer = duration;
    this.bombMaxTimer = duration;
  }

  /**
   * Activates the Fireball supercharge state owned by a player.
   * Accelerates in its current direction towards the opponent (2.0x speed).
   * @param {number} owner - Player ID (1 for P1, 2 for P2/Bot).
   * @returns {void}
   */
  setFireball(owner) {
    this.isFireball = true;
    this.fireballOwner = owner;
    this.lastHitterId = owner;
    // Multiplies speed by 2.0 without changing direction
    this.speed = Math.min(this.speed * 2.0, 24);
    const currentAngle = Math.atan2(this.vy, this.vx);
    this.vx = Math.cos(currentAngle) * this.speed;
    this.vy = Math.sin(currentAngle) * this.speed;
  }

  /**
   * Extinguishes Fireball status upon opponent deflection.
   * @returns {void}
   */
  extinguishFireball() {
    this.isFireball = false;
    this.fireballOwner = null;
    this.speed = Math.min(this.speed, 14);
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Ball = Ball;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Ball;
}
