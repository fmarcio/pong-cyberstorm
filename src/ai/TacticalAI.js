// @ts-check

/**
 * @typedef {'easy' | 'medium' | 'insane'} DifficultyLevel
 */

/**
 * PONG: CYBERSTORM - Tactical AI Opponent
 * Calculates trajectory angles, wall ricochets, decision timing,
 * and casts spells (Force Shield, Crazy Ball, Fireball, Multiball) based on difficulty.
 */
class TacticalAI {
  /**
   * Constructs the tactical bot brain.
   * @param {any} game - The parent PongGame instance.
   */
  constructor(game) {
    /** @type {any} */
    this.game = game;
  }

  /**
   * Evaluates threatening balls, predicts bounce paths, adjusts paddle position,
   * and casts spells reactively.
   * @param {number} dt - Delta time in seconds since last frame.
   * @returns {void}
   */
  update(dt) {
    const p2 = this.game.paddle2;

    let botSpeed = 7.8;
    let reactionDistance = this.game.width * 0.48;
    let errorMargin = 0;
    let predictWallBounces = true;

    if (this.game.difficulty === 'easy') {
      botSpeed = 5.6;
      reactionDistance = this.game.width * 0.35;
      errorMargin = 32;
      predictWallBounces = false;
    } else if (this.game.difficulty === 'medium') {
      botSpeed = 8.0;
      reactionDistance = this.game.width * 0.5;
      errorMargin = 12;
      predictWallBounces = true;
    } else if (this.game.difficulty === 'insane') {
      botSpeed = 11.2;
      reactionDistance = this.game.width * 0.75;
      errorMargin = 2;
      predictWallBounces = true;
    }

    // Find the most immediate threatening ball moving towards the Bot
    let targetBall = null;
    let closestDist = Infinity;

    for (const b of this.game.balls) {
      // A vanished Crazy Ball cannot be tracked: the bot loses sight of it
      if (b.vx > 0 && !b.crazyHidden) {
        const dist = p2.x - b.x;
        if (dist > 0 && dist < closestDist) {
          closestDist = dist;
          targetBall = b;
        }
      }
    }

    let targetY = this.game.height / 2;

    if (targetBall && (p2.x - targetBall.x) <= reactionDistance) {
      if (predictWallBounces) {
        // Precise trajectory prediction folding through boundary bounces
        const timeToHit = (p2.x - targetBall.x) / targetBall.vx;
        let predictedY = targetBall.y + targetBall.vy * timeToHit;

        const topLimit = 12 + targetBall.radius;
        const bottomLimit = this.game.height - 12 - targetBall.radius;

        while (predictedY < topLimit || predictedY > bottomLimit) {
          if (predictedY < topLimit) {
            predictedY = topLimit + (topLimit - predictedY);
          } else if (predictedY > bottomLimit) {
            predictedY = bottomLimit - (predictedY - bottomLimit);
          }
        }
        targetY = predictedY;
      } else {
        targetY = targetBall.y;
      }
    }

    // Apply difficulty error jitter
    targetY += Math.sin(performance.now() * 0.003) * errorMargin;

    const diff = (targetY - p2.h / 2) - p2.y;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), botSpeed * dt * 60);
    p2.y += step;
    this.game.clampPaddle(p2);

    // AI Tactical Decision Making
    this.game.botDecisionTimer += dt;
    if (this.game.botDecisionTimer > 0.4) {
      this.game.botDecisionTimer = 0;

      // 1. Force Shield in emergency against fast balls
      if (targetBall && targetBall.speed > 13 && closestDist < 160 && !p2.shieldActive) {
        if (Math.abs(diff) > p2.h * 0.45 && p2.energy >= this.game.powerCosts.shield) {
          this.game.castPower(p2, 'shield');
          return;
        }
      }

      // 2. Crazy Ball right after sending the ball back towards the player
      if (this.game.difficulty !== 'easy' && p2.energy >= this.game.powerCosts.crazyball) {
        const outgoingBall = this.game.balls.find((b) => b.vx < 0 && !b.isCrazy && b.x > this.game.width * 0.45);
        if (outgoingBall && Math.random() < (this.game.difficulty === 'insane' ? 0.55 : 0.3)) {
          if (this.game.castPower(p2, 'crazyball')) return;
        }
      }

      // 3. Fireball counter-attack when ball is travelling towards Player 1
      const ballMovingToP1 = this.game.balls.find((b) => b.vx < 0 && !b.isFireball);
      if (ballMovingToP1 && p2.energy >= this.game.powerCosts.fireball) {
        const castChance = this.game.difficulty === 'insane' ? 0.6 : 0.35;
        if (Math.random() < castChance) {
          this.game.castPower(p2, 'fireball');
        }
      } else if (targetBall && closestDist < 70 && targetBall.vx > 0 && p2.energy >= this.game.powerCosts.multiball && this.game.balls.length === 1 && Math.random() < 0.3) {
        this.game.castPower(p2, 'multiball');
      }
    }
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.TacticalAI = TacticalAI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TacticalAI;
}
