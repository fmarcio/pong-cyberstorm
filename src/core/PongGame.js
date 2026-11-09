// @ts-check

/**
 * @typedef {'config' | 'countdown' | 'serve' | 'playing' | 'game_over'} GameState
 * @typedef {'fireball' | 'crazyball' | 'multiball' | 'shield'} PowerType
 * 
 * @typedef {Object} PaddleState
 * @property {number} id - Player identification (1 for left, 2 for right).
 * @property {number} x - Top-left horizontal coordinate.
 * @property {number} y - Top-left vertical coordinate.
 * @property {number} w - Paddle width in pixels.
 * @property {number} baseH - Base paddle height in pixels.
 * @property {number} h - Current paddle height in pixels (modified by buffs).
 * @property {import('../entities/Ball.js').ActiveEffect[]} activeEffects - Stackable size modifiers.
 * @property {number} speed - Vertical movement speed in pixels per frame.
 * @property {number} prevY - Previous frame Y position for velocity calculation.
 * @property {number} velocity - Instantaneous vertical speed for adding spin.
 * @property {string} color - Neon theme color hex.
 * @property {number} energy - Current accumulated magic energy.
 * @property {number} maxEnergy - Maximum energy ceiling.
 * @property {boolean} shieldActive - Whether the Force Shield barrier is up.
 * @property {number} shieldTime - Remaining Force Shield barrier duration in seconds.
 */

/**
 * PONG: CYBERSTORM - Core Game Controller
 * Manages game loop, physics simulation, collisions, player input,
 * active powers, court items, and rendering pipeline.
 */
class PongGame {
  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('pongCanvas'));
    /** @type {CanvasRenderingContext2D} */
    this.ctx = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
    /** @type {HTMLElement|null} */
    this.wrapper = document.querySelector('.canvas-wrapper');

    // Subsystems
    /** @type {SoundController} */
    this.sound = new SoundController();
    /** @type {TacticalAI} */
    this.ai = new TacticalAI(this);

    // Game Configuration State
    /** @type {number} */
    this.targetScore = 7;
    /** @type {GameState} */
    this.gameState = 'config';
    /** @type {import('../ui/UIManager.js').ControlMode} */
    this.controlMode = 'mouse';
    /** @type {import('../ui/UIManager.js').OpponentMode} */
    this.oppMode = 'bot';
    /** @type {import('../ui/UIManager.js').DifficultyLevel} */
    this.difficulty = 'medium';
    /** @type {boolean} */
    this.isPaused = false;

    /** @type {number} */
    this.width = this.canvas.width;
    /** @type {number} */
    this.height = this.canvas.height;

    // Scores
    /** @type {number} */
    this.scoreP1 = 0;
    /** @type {number} */
    this.scoreP2 = 0;

    // Skill Costs
    /** @type {Record<PowerType, number>} */
    this.powerCosts = {
      fireball: 35,
      crazyball: 60,
      multiball: 50,
      shield: 40
    };

    // Paddle 1 (Left - Cyan)
    /** @type {PaddleState} */
    this.paddle1 = {
      id: 1,
      x: 35,
      y: this.height / 2 - 50,
      w: 14,
      baseH: 100,
      h: 100,
      activeEffects: [],
      speed: 8.5,
      prevY: this.height / 2 - 50,
      velocity: 0,
      color: '#ffaa00',
      energy: 40,
      maxEnergy: 100,
      shieldActive: false,
      shieldTime: 0
    };

    // Paddle 2 (Right - Ultraviolet Amethyst)
    /** @type {PaddleState} */
    this.paddle2 = {
      id: 2,
      x: this.width - 35 - 14,
      y: this.height / 2 - 50,
      w: 14,
      baseH: 100,
      h: 100,
      activeEffects: [],
      speed: 7.8,
      prevY: this.height / 2 - 50,
      velocity: 0,
      color: '#a855f7',
      energy: 40,
      maxEnergy: 100,
      shieldActive: false,
      shieldTime: 0
    };

    // Balls list (Handles Multiball and Shrapnels)
    /** @type {Ball[]} */
    this.balls = [];
    /** @type {number} */
    this.initialSpeed = 7.5;
    /** @type {number} */
    this.maxSpeed = 24;

    // In-Court Spawning Items (Every 5 seconds)
    /** @type {CourtItem[]} */
    this.courtItems = [];
    /** @type {number} */
    this.itemSpawnTimer = 0;

    // Visual Effects
    /** @type {Particle[]} */
    this.particles = [];
    /** @type {number} */
    this.shakeDuration = 0;
    /** @type {number} */
    this.shakeIntensity = 0;

    // Round Timing
    /** @type {number} */
    this.serveTimer = 1.0;

    // Match Statistics Tracking
    /** @type {number} Active match time in seconds */
    this.matchTime = 0;
    /** @type {number} Current consecutive rally count */
    this.currentRally = 0;
    /** @type {number} Longest rally count during the match */
    this.maxRally = 0;
    /** @type {Record<string, number>} Count of spells cast by P1 */
    this.p1PowersUsed = { fireball: 0, crazyball: 0, multiball: 0, shield: 0 };
    /** @type {Record<string, number>} Count of spells cast by P2 / Bot */
    this.p2PowersUsed = { fireball: 0, crazyball: 0, multiball: 0, shield: 0 };
    /** @type {Record<string, number>} Count of court items collected */
    this.itemsCollected = { reduce: 0, size_up: 0, slow_down: 0, energy_boost: 0, energy_down: 0, bomb: 0, invisibility: 0 };

    // Input Tracking
    /** @type {Record<string, boolean>} */
    this.keys = {};
    /** @type {number} */
    this.botDecisionTimer = 0;
    /** @type {number} */
    this.lastTime = performance.now();

    // UI Subsystem (HUD, Modals, Buttons)
    /** @type {UIManager} */
    this.ui = new UIManager(this);

    // Setup User Controls
    this.setupInputs();

    // Show Configuration Modal upon initial launch
    this.ui.openConfigModal();

    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Sets up global keyboard and mouse event listeners.
   * @returns {void}
   */
  setupInputs() {
    window.addEventListener('keydown', (e) => {
      // Do not process game hotkeys or pause if typing in input fields
      if (e.target && (/** @type {HTMLElement} */ (e.target).tagName === 'INPUT' || /** @type {HTMLElement} */ (e.target).tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();

      // Pause toggle: SPACE or P
      if (e.key === ' ' || key === 'p') {
        e.preventDefault();
        e.stopPropagation();

        if (this.gameState === 'playing' || this.gameState === 'serve') {
          this.togglePause();
        }
        return;
      }

      // Restart match hotkey when paused: R
      if (this.isPaused && key === 'r') {
        e.preventDefault();
        e.stopPropagation();
        this.togglePause();
        this.startNewMatch(this.targetScore);
        return;
      }

      this.keys[key] = true;

      // Player 1 Hotkeys (1/Q, 2/W, 3/E, 4/R)
      if (!this.isPaused && (this.gameState === 'playing' || this.gameState === 'serve')) {
        if (key === '1' || key === 'q') this.castPower(this.paddle1, 'fireball');
        if (key === '2' || key === 'w') this.castPower(this.paddle1, 'crazyball');
        if (key === '3' || key === 'e') this.castPower(this.paddle1, 'multiball');
        if (key === '4' || key === 'r') this.castPower(this.paddle1, 'shield');

        // Player 2 Hotkeys in 2-Player Local Mode (7, 8, 9, 0)
        if (this.oppMode === 'pvp') {
          if (key === '7') this.castPower(this.paddle2, 'fireball');
          if (key === '8') this.castPower(this.paddle2, 'crazyball');
          if (key === '9') this.castPower(this.paddle2, 'multiball');
          if (key === '0') this.castPower(this.paddle2, 'shield');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
      }
      this.keys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.controlMode !== 'mouse' || this.isPaused || this.gameState === 'config' || this.gameState === 'game_over') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleY = this.height / rect.height;
      const mouseY = (e.clientY - rect.top) * scaleY;

      this.paddle1.y = mouseY - this.paddle1.h / 2;
      this.clampPaddle(this.paddle1);
    });

    window.addEventListener('click', () => this.sound.init(), { once: true });
  }

  /**
   * Resets scores, clear arena elements, and starts a fresh match.
   * @param {number} targetScore - Score needed to win the match.
   * @returns {void}
   */
  startNewMatch(targetScore) {
    if (document.activeElement && typeof /** @type {HTMLElement} */ (document.activeElement).blur === 'function') {
      /** @type {HTMLElement} */ (document.activeElement).blur();
    }
    // Defensive bounds validation [1 - 99]
    this.targetScore = Math.max(1, Math.min(99, Math.floor(Number(targetScore)) || 7));
    const targetBadge = document.getElementById('match-target-badge');
    if (targetBadge) targetBadge.textContent = `First to ${this.targetScore} Pts`;

    this.ui.closeModals();

    this.isPaused = false;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');

    // Reset match statistics
    this.matchTime = 0;
    this.currentRally = 0;
    this.maxRally = 0;
    this.p1PowersUsed = { fireball: 0, crazyball: 0, multiball: 0, shield: 0 };
    this.p2PowersUsed = { fireball: 0, crazyball: 0, multiball: 0, shield: 0 };
    this.itemsCollected = { reduce: 0, size_up: 0, slow_down: 0, energy_boost: 0, energy_down: 0, bomb: 0, invisibility: 0 };
    if (this.ui) this.ui.updateMatchTimer(0);

    // Reset scores & paddles
    this.scoreP1 = 0;
    this.scoreP2 = 0;

    if (this.ui.scoreP1El) this.ui.scoreP1El.textContent = '0';
    if (this.ui.scoreP2El) this.ui.scoreP2El.textContent = '0';

    this.paddle1.energy = 40;
    this.paddle1.shieldActive = false;
    this.paddle1.h = this.paddle1.baseH;
    this.paddle1.activeEffects = [];
    this.paddle1.y = this.height / 2 - this.paddle1.h / 2;

    this.paddle2.energy = 40;
    this.paddle2.shieldActive = false;
    this.paddle2.h = this.paddle2.baseH;
    this.paddle2.activeEffects = [];
    this.paddle2.y = this.height / 2 - this.paddle2.h / 2;

    this.courtItems = [];
    this.itemSpawnTimer = 0;

    this.particles = [];
    this.ui.clearFeed();

    // Setup initial stationary ball at court center
    this.balls = [this.createBaseBall(1)];
    this.balls[0].vx = 0;
    this.balls[0].vy = 0;

    // Trigger 3-second pre-match preparation countdown
    this.gameState = 'countdown';
    this.countdownTimer = 3.0;
    this.lastCountdownSec = 4;
    this.ui.showCountdown(3);
    this.sound.playCountdownTick(false);
  }

  /**
   * Concludes the match, plays victory audio, and triggers the victory modal.
   * @param {number} winnerId - ID of winning player (1 or 2).
   * @returns {void}
   */
  endMatch(winnerId) {
    this.gameState = 'game_over';
    this.balls = []; // Clear remaining balls
    this.shakeDuration = 0; // Clear any ongoing shake
    this.sound.playVictory();
    this.ui.showMatchOver(winnerId);
  }

  /**
   * Toggles pause state and visibility of the pause overlay.
   * @returns {void}
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.toggle('hidden', !this.isPaused);
    if (document.activeElement && typeof /** @type {HTMLElement} */ (document.activeElement).blur === 'function') {
      /** @type {HTMLElement} */ (document.activeElement).blur();
    }
  }

  /**
   * Initiates canvas shake feedback.
   * @param {number} [intensity=6] - Pixel offset displacement intensity.
   * @param {number} [duration=0.15] - Duration of shake in seconds.
   * @returns {void}
   */
  triggerScreenShake(intensity = 6, duration = 0.15) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /**
   * Posts a short event message (power cast, item collected, etc.) to the
   * discreet event feed above the powers HUD, outside the court.
   * @param {string} text - Message text.
   * @param {string} color - Hex/CSS accent color.
   * @returns {void}
   */
  addAnnouncement(text, color) {
    if (this.ui) this.ui.pushFeed(text, color);
  }

  /**
   * Casts a spell power on behalf of a paddle.
   * @param {PaddleState} caster - Paddle casting the spell.
   * @param {PowerType} powerName - Name of spell power.
   * @returns {boolean} Whether the spell was successfully cast.
   */
  castPower(caster, powerName) {
    if (this.gameState !== 'playing' && this.gameState !== 'serve') return false;

    const cost = this.powerCosts[powerName];
    if (caster.energy < cost) {
      if (this.ui) this.ui.triggerEnergyWarning(caster.id);
      return false;
    }

    const casterName = caster.id === 1 ? 'P1' : (this.oppMode === 'bot' ? 'BOT' : 'P2');
    let activated = false;

    switch (powerName) {
      case 'fireball': {
        const targetDir = caster.id === 1 ? 1 : -1;
        // Ball must already be travelling towards the adversary (no mid-air U-turn)
        const eligibleBall = this.balls.find((b) => (targetDir > 0 ? b.vx > 0 : b.vx < 0) && !b.isFireball)
          || this.balls.find((b) => (targetDir > 0 ? b.vx > 0 : b.vx < 0));

        if (!eligibleBall) {
          if (caster.id === 1) {
            this.addAnnouncement('Deflect the ball first to cast Fireball', '#ffaa00');
          }
          return false;
        }

        eligibleBall.setFireball(caster.id);
        this.sound.playFireballSound();
        this.triggerScreenShake(7, 0.2);
        this.addAnnouncement(`${casterName} cast Fireball`, '#ff5500');
        activated = true;
        break;
      }

      case 'crazyball': {
        const targetDir = caster.id === 1 ? 1 : -1;
        // Only castable on a ball already travelling towards the adversary
        // (after a direct paddle hit or after a wall ricochet heading their way)
        const eligibleBall = this.balls.find((b) => (targetDir > 0 ? b.vx > 0 : b.vx < 0) && !b.isCrazy);

        if (!eligibleBall) {
          if (caster.id === 1 || this.oppMode === 'pvp') {
            this.addAnnouncement('Crazy Ball needs the ball heading to the opponent', '#ff3ea5');
          }
          return false;
        }

        eligibleBall.setCrazy(caster.id, 5.0); // 5 seconds of chaos
        this.sound.playCrazyBallSound();
        this.triggerScreenShake(6, 0.2);
        this.spawnCrazyParticles(eligibleBall.x, eligibleBall.y, 26);
        this.addAnnouncement(`${casterName} unleashed Crazy Ball`, '#ff3ea5');
        activated = true;
        break;
      }

      case 'multiball': {
        if (this.balls.length < 5) {
          const mainBall = this.balls[0] || this.createBaseBall(caster.id);
          const angle1 = -0.38;
          const angle2 = 0.38;

          const b1 = new Ball(
            mainBall.x,
            mainBall.y,
            mainBall.vx * Math.cos(angle1) - mainBall.vy * Math.sin(angle1),
            mainBall.vx * Math.sin(angle1) + mainBall.vy * Math.cos(angle1),
            mainBall.speed,
            9,
            caster.id
          );
          b1.activeEffects = mainBall.activeEffects.map((e) => ({ ...e }));
          b1.invisibilityTimer = mainBall.invisibilityTimer;
          b1.invisibilityOwner = mainBall.invisibilityOwner;

          const b2 = new Ball(
            mainBall.x,
            mainBall.y,
            mainBall.vx * Math.cos(angle2) - mainBall.vy * Math.sin(angle2),
            mainBall.vx * Math.sin(angle2) + mainBall.vy * Math.cos(angle2),
            mainBall.speed,
            9,
            caster.id
          );
          b2.activeEffects = mainBall.activeEffects.map((e) => ({ ...e }));
          b2.invisibilityTimer = mainBall.invisibilityTimer;
          b2.invisibilityOwner = mainBall.invisibilityOwner;

          this.balls.push(b1, b2);
          this.sound.playMultiballSound();
          this.triggerScreenShake(6, 0.2);
          this.addAnnouncement(`${casterName} unleashed Multiball`, '#c084fc');
          activated = true;
        }
        break;
      }

      case 'shield': {
        caster.shieldActive = true;
        caster.shieldTime = 5.0; // 5 seconds duration
        this.sound.playShieldSound();
        this.addAnnouncement(`${casterName} raised Force Shield`, '#10b981');
        activated = true;
        break;
      }
    }

    if (activated) {
      caster.energy -= cost;
      if (caster.id === 1) {
        this.p1PowersUsed[powerName] = (this.p1PowersUsed[powerName] || 0) + 1;
      } else {
        this.p2PowersUsed[powerName] = (this.p2PowersUsed[powerName] || 0) + 1;
      }
    }
    return activated;
  }

  /**
   * Spawns a base ball initialized at center court with randomized launch angle.
   * @param {number} servingPlayer - ID of the player serving (1 or 2).
   * @returns {Ball}
   */
  createBaseBall(servingPlayer) {
    const dir = servingPlayer === 1 ? -1 : 1;
    const angle = (Math.random() * 0.4 - 0.2) * Math.PI;
    const speed = this.initialSpeed;
    return new Ball(
      this.width / 2,
      this.height / 2,
      Math.cos(angle) * speed * dir,
      Math.sin(angle) * speed,
      speed,
      9,
      servingPlayer === 1 ? 2 : 1
    );
  }

  /**
   * Resets the active round and prepares serve countdown.
   * @param {number} servingPlayer - ID of the player receiving the serve.
   * @returns {void}
   */
  resetRound(servingPlayer) {
    this.currentRally = 0;
    this.balls = [this.createBaseBall(servingPlayer)];
    this.gameState = 'serve';
    this.serveTimer = 0.9;
  }

  /**
   * Clamps paddle Y coordinate within court boundary limits.
   * @param {PaddleState} paddle - Paddle to clamp.
   * @returns {void}
   */
  clampPaddle(paddle) {
    if (paddle.y < 12) paddle.y = 12;
    if (paddle.y + paddle.h > this.height - 12) {
      paddle.y = this.height - 12 - paddle.h;
    }
  }

  /**
   * Spawns collision sparks bursting in the specified direction.
   * @param {number} x - Center X coordinate.
   * @param {number} y - Center Y coordinate.
   * @param {string} color - Hex/CSS color.
   * @param {number} [count=12] - Number of particles.
   * @param {number} [dirX=1] - Direction of deflection (+1 right, -1 left, 0 all).
   * @returns {void}
   */
  spawnHitParticles(x, y, color, count = 12, dirX = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8 + (dirX > 0 ? 0 : Math.PI);
      const speed = Math.random() * 5 + 2;
      this.particles.push(
        new Particle(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 0.4 + 0.3)
      );
    }
  }

  /**
   * Spawns multicolored glitch sparks used by Crazy Ball chaos.
   * @param {number} x - Center X coordinate.
   * @param {number} y - Center Y coordinate.
   * @param {number} [count=18] - Particle count.
   * @returns {void}
   */
  spawnCrazyParticles(x, y, count = 18) {
    const colors = ['#ff3ea5', '#22d3ee', '#a3e635', '#ffe600'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, 3));
    }
  }

  /**
   * Spawns an in-court collectable item into the central arena.
   * @returns {void}
   */
  spawnCourtItem() {
    if (this.courtItems.length >= 3) return; // Cap at 3 items maximum on court
    // Bomb item has a lower spawn probability compared to other items
    /** @type {import('../entities/CourtItem.js').CourtItemType[]} */
    const types = [
      'reduce', 'reduce',
      'size_up', 'size_up',
      'slow_down', 'slow_down',
      'energy_boost', 'energy_boost',
      'energy_down', 'energy_down',
      'invisibility', 'invisibility',
      'bomb'
    ];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    const marginX = this.width * 0.22;
    const marginY = 55;
    const x = marginX + Math.random() * (this.width - marginX * 2);
    const y = marginY + Math.random() * (this.height - marginY * 2);

    const item = new CourtItem(x, y, chosenType);
    this.courtItems.push(item);
    this.sound.playItemSpawn();
    this.spawnHitParticles(x, y, item.color, 10, 0);
  }

  /**
   * Applies the effect of a collected item to the appropriate paddle or ball.
   * @param {CourtItem} item - Collected item entity.
   * @param {Ball} ball - Ball that collided with the item.
   * @returns {void}
   */
  applyCourtItem(item, ball) {
    const collectorId = ball.lastHitterId || (ball.vx > 0 ? 1 : 2);
    const collector = collectorId === 1 ? this.paddle1 : this.paddle2;
    const opponent = collectorId === 1 ? this.paddle2 : this.paddle1;
    const collectorName = collectorId === 1 ? 'P1' : (this.oppMode === 'bot' ? 'BOT' : 'P2');
    const opponentName = collectorId === 1 ? (this.oppMode === 'bot' ? 'BOT' : 'P2') : 'P1';

    this.sound.playItemCollect();
    this.triggerScreenShake(5, 0.15);
    this.spawnHitParticles(item.x, item.y, item.color, 24, 0);

    // Track match item statistics
    this.itemsCollected[item.type] = (this.itemsCollected[item.type] || 0) + 1;

    switch (item.type) {
      case 'reduce': {
        // Reduces opponent's paddle size by 30% for 5s (Stackable with independent 5s timer)
        opponent.activeEffects.push({ type: 'reduce', multiplier: 0.7, duration: 5.0 });
        this.addAnnouncement(`${collectorName} got Reduce: ${opponentName} paddle -30%`, item.color);
        break;
      }

      case 'size_up': {
        // Increases collector's paddle size by 30% for 5s (Stackable with independent 5s timer)
        collector.activeEffects.push({ type: 'size_up', multiplier: 1.3, duration: 5.0 });
        this.addAnnouncement(`${collectorName} got Size It Up: paddle +30%`, item.color);
        break;
      }

      case 'slow_down': {
        // Decreases ball speed by 30% for 5s (Stackable with independent 5s timer)
        ball.speed = Math.max(3.5, ball.speed * 0.7);
        ball.vx *= 0.7;
        ball.vy *= 0.7;
        ball.activeEffects.push({ type: 'slow_down', multiplier: 0.7, duration: 5.0 });
        this.addAnnouncement(`${collectorName} got Slow Down: ball -30%`, item.color);
        break;
      }

      case 'energy_boost': {
        // Instantly gives collector a +30% energy boost
        collector.energy = Math.min(collector.maxEnergy, collector.energy + 30);
        this.addAnnouncement(`${collectorName} got Energy Boost: +30 energy`, item.color);
        break;
      }

      case 'energy_down': {
        // Instantly drains 30% energy from opponent
        opponent.energy = Math.max(0, opponent.energy - 30);
        this.addAnnouncement(`${collectorName} drained ${opponentName}: -30 energy`, item.color);
        break;
      }

      case 'bomb': {
        // Primes ball as a bomb: inflates for 5s then explodes into shrapnel mini-balls
        ball.armBomb(5.0);
        this.addAnnouncement(`${collectorName} primed a Bomb: 5s to detonation`, item.color);
        break;
      }

      case 'invisibility': {
        // Cloaks the ball with flickering opacity (down to 40%) for 5s while moving towards opponent
        ball.setInvisibility(collectorId, 5.0);
        this.addAnnouncement(`${collectorName} got Invisibility: cloaked ball for 5s`, item.color);
        break;
      }
    }
  }

  /**
   * Detonates an armed bomb ball into scattering shrapnel mini-balls.
   * @param {Ball} bombBall - The bomb ball entity.
   * @param {number} ballIndex - Index in `this.balls` to remove.
   * @returns {void}
   */
  detonateBomb(bombBall, ballIndex) {
    this.sound.playBombExplosion();
    this.triggerScreenShake(10, 0.35);

    // Blast particles scattering in 360 degrees
    for (let p = 0; p < 45; p++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      const colors = ['#ff2200', '#ff6600', '#ffe600', '#ffffff'];
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(
        new Particle(
          bombBall.x,
          bombBall.y,
          col,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          Math.random() * 0.5 + 0.3,
          Math.random() * 4 + 2
        )
      );
    }

    this.addAnnouncement('Bomb detonated into shrapnel', '#ff4400');

    // Remove the detonated bomb ball
    this.balls.splice(ballIndex, 1);

    // Scatter into 6 smaller mini-balls (shrapnels, radius 5.5 < base 9) ricocheting wildly
    const shrapnelCount = 6;
    const baseSpeed = 10.5;
    for (let k = 0; k < shrapnelCount; k++) {
      let angle = (k * 2 * Math.PI) / shrapnelCount + (Math.random() - 0.5) * 0.4;
      let vx = Math.cos(angle) * (baseSpeed + Math.random() * 3.5);
      let vy = Math.sin(angle) * (baseSpeed + Math.random() * 3.5);

      // Ensure shrapnels don't get stuck vertically
      if (Math.abs(vx) < 3.2) {
        vx = (vx >= 0 ? 1 : -1) * (3.5 + Math.random() * 2);
      }

      const shrapnelSpeed = Math.hypot(vx, vy);
      const shrapnel = new Ball(
        bombBall.x,
        bombBall.y,
        vx,
        vy,
        shrapnelSpeed,
        5.5,
        bombBall.lastHitterId
      );
      shrapnel.isShrapnel = true;
      this.balls.push(shrapnel);
    }
  }

  // --- CRAZY BALL CHAOS ENGINE ---

  /**
   * Re-aims a ball so its velocity magnitude matches its speed again,
   * keeping its horizontal heading and a playable (not too steep) angle.
   * @param {Ball} ball - Ball to normalize.
   * @param {number} [angle] - Optional explicit vertical angle in radians (relative to horizontal).
   * @returns {void}
   */
  normalizeBallVelocity(ball, angle) {
    const dir = Math.sign(ball.vx) || (ball.lastHitterId === 1 ? 1 : -1);
    const maxAngle = Math.PI * 0.32;
    let a = angle !== undefined ? angle : Math.atan2(ball.vy, Math.abs(ball.vx));
    a = Math.max(-maxAngle, Math.min(maxAngle, a));
    ball.vx = Math.cos(a) * ball.speed * dir;
    ball.vy = Math.sin(a) * ball.speed;
  }

  /**
   * Advances Crazy Ball chaos on a ball: duration, surface captures,
   * vanishing, behavior rolls and continuous behavior effects.
   * @param {Ball} b - Crazy ball.
   * @param {number} dt - Elapsed seconds since last frame.
   * @returns {void}
   */
  updateCrazyBall(b, dt) {
    b.crazyTimer -= dt;
    b.crazyPhase += dt;

    // Chaos expired: restore a sane, predictable ball
    if (b.crazyTimer <= 0) {
      if (b.crazyStuck) this.releaseCrazyStick(b);
      if (b.crazyHidden) this.crazyReappear(b, false);
      b.clearCrazy();
      this.normalizeBallVelocity(b);
      this.spawnCrazyParticles(b.x, b.y, 10);
      return;
    }

    // Captured on a surface: hold the ball until release
    if (b.crazyStuck) {
      const stick = b.crazyStuck;
      stick.timer -= dt;
      if (stick.surface === 'paddle1' || stick.surface === 'paddle2') {
        const paddle = stick.surface === 'paddle1' ? this.paddle1 : this.paddle2;
        b.y = paddle.y + Math.max(0, Math.min(paddle.h, stick.offsetY));
        b.x = stick.surface === 'paddle1' ? paddle.x + paddle.w + b.radius : paddle.x - b.radius;
      }
      if (Math.random() < 0.3) this.spawnCrazyParticles(b.x, b.y, 1);
      if (stick.timer <= 0) this.releaseCrazyStick(b);
      return;
    }

    // Vanished: reappear somewhere closer to the defender
    if (b.crazyHidden) {
      b.crazyHiddenTimer -= dt;
      if (b.crazyHiddenTimer <= 0) this.crazyReappear(b, true);
    }

    // Roll a new unpredictable behavior when the current one ends
    b.crazyModeTimer -= dt;
    if (b.crazyModeTimer <= 0 && !b.crazyHidden) {
      this.rollCrazyMode(b);
    }

    // Continuous behavior effects
    b.crazyTimeScale = 1;
    switch (b.crazyMode) {
      case 'zigzag':
        // Snakes up and down (~25px amplitude) without corrupting its velocity
        b.y += Math.cos(b.crazyPhase * 14) * 6 * dt * 60;
        break;
      case 'gravity':
        // Unreal sideways gravity bends the path into a banana curve
        b.vy += b.crazyGravity * dt * 60;
        b.vy = Math.max(-b.speed * 1.1, Math.min(b.speed * 1.1, b.vy));
        break;
      case 'stutter':
        // Freezes mid-air, then dashes forward (alternating every 0.2s)
        b.crazyTimeScale = Math.floor(b.crazyPhase * 5) % 2 === 0 ? 0.08 : 2.0;
        break;
      case 'fakeout':
        // Sudden vertical U-turns mid-flight (~3 per second)
        if (Math.random() < dt * 3) {
          b.vy = -b.vy + (Math.random() - 0.5) * 3;
          this.spawnCrazyParticles(b.x, b.y, 4);
        }
        break;
      case 'grow':
        b.crazyRadiusTarget = b.baseRadius * 2 + Math.sin(b.crazyPhase * 12) * 3;
        break;
    }

    // Ease radius towards the behavior target (bombs control their own size)
    if (!b.isBomb) {
      b.radius += (b.crazyRadiusTarget - b.radius) * Math.min(1, dt * 10);
    }

    // Glitch sparks while visible
    if (!b.crazyHidden && Math.random() < 0.3) {
      this.spawnCrazyParticles(b.x, b.y, 1);
    }
  }

  /**
   * Ends the current Crazy Ball behavior and starts a new random one.
   * @param {Ball} b - Crazy ball.
   * @returns {void}
   */
  rollCrazyMode(b) {
    this.endCrazyMode(b);

    /** @type {import('../entities/Ball.js').CrazyMode[]} */
    let modes = ['shrink', 'grow', 'zigzag', 'gravity', 'stutter', 'blink', 'sticky', 'fakeout'];
    modes = modes.filter((m) => {
      if (m === b.crazyMode) return false; // Never repeat the same behavior twice in a row
      if (b.isBomb && (m === 'shrink' || m === 'grow')) return false;
      if (m === 'blink' && b.crazyTimer < 0.6) return false;
      return true;
    });

    const mode = modes[Math.floor(Math.random() * modes.length)];
    b.crazyMode = mode;
    b.crazyModeTimer = 0.7 + Math.random() * 0.4;

    switch (mode) {
      case 'shrink':
        b.crazyRadiusTarget = Math.max(3, b.baseRadius * 0.4);
        break;
      case 'grow':
        b.crazyRadiusTarget = b.baseRadius * 2;
        break;
      case 'gravity':
        b.crazyGravity = (Math.random() < 0.5 ? -1 : 1) * 0.45;
        break;
      case 'blink':
        b.crazyHidden = true;
        b.crazyHiddenTimer = 0.4;
        b.crazyModeTimer = 0.85;
        this.spawnCrazyParticles(b.x, b.y, 14);
        this.sound.playCrazyGlitch();
        break;
      case 'sticky':
        b.crazySticky = true;
        b.crazyModeTimer = 1.4; // Waits for a surface contact
        break;
      case 'fakeout':
        b.vy = -b.vy;
        break;
    }
  }

  /**
   * Reverts the temporary modifiers of the current Crazy Ball behavior.
   * @param {Ball} b - Crazy ball.
   * @returns {void}
   */
  endCrazyMode(b) {
    switch (b.crazyMode) {
      case 'shrink':
      case 'grow':
        b.crazyRadiusTarget = b.baseRadius;
        break;
      case 'gravity':
        b.crazyGravity = 0;
        this.normalizeBallVelocity(b);
        break;
      case 'stutter':
        b.crazyTimeScale = 1;
        break;
      case 'sticky':
        b.crazySticky = false;
        break;
      case 'blink':
        if (b.crazyHidden) this.crazyReappear(b, false);
        break;
    }
  }

  /**
   * Makes a vanished Crazy Ball visible again, optionally teleporting it
   * forward (closer to the defending paddle) with a new random height.
   * @param {Ball} b - Crazy ball.
   * @param {boolean} teleport - Whether to relocate the ball before revealing it.
   * @returns {void}
   */
  crazyReappear(b, teleport) {
    b.crazyHidden = false;
    b.crazyHiddenTimer = 0;

    if (teleport) {
      const dir = Math.sign(b.vx) || 1;
      const defenderFront = dir > 0 ? this.paddle2.x : this.paddle1.x + this.paddle1.w;
      const remaining = Math.abs(defenderFront - b.x);
      const safeGap = 170; // Always leave the defender a fair reaction window

      if (remaining > safeGap) {
        b.x += dir * (remaining - safeGap) * (0.35 + Math.random() * 0.4);
      }
      b.y = 60 + Math.random() * (this.height - 120);
      this.normalizeBallVelocity(b, (Math.random() - 0.5) * 1.2);
      b.trail = [];
    }

    this.spawnCrazyParticles(b.x, b.y, 14);
    this.sound.playCrazyGlitch();
  }

  /**
   * Glues a sticky Crazy Ball to the surface it just touched.
   * @param {Ball} b - Crazy ball.
   * @param {import('../entities/Ball.js').CrazyStick['surface']} surface - Surface touched.
   * @param {PaddleState} [paddle] - Paddle touched (paddle captures only).
   * @returns {void}
   */
  captureCrazyBall(b, surface, paddle) {
    b.crazySticky = false;
    b.crazyStuck = {
      surface,
      timer: 0.5 + Math.random() * 0.25,
      offsetY: paddle ? b.y - paddle.y : 0
    };
    this.spawnCrazyParticles(b.x, b.y, 10);
    this.sound.playCrazyGlitch();
  }

  /**
   * Releases a captured Crazy Ball, firing it off at a random angle
   * away from the surface that held it.
   * @param {Ball} b - Crazy ball.
   * @returns {void}
   */
  releaseCrazyStick(b) {
    const stick = b.crazyStuck;
    b.crazyStuck = null;
    if (!stick) return;

    let angle;
    if (stick.surface === 'top') {
      angle = 0.25 + Math.random() * 0.6; // Downwards
    } else if (stick.surface === 'bottom') {
      angle = -(0.25 + Math.random() * 0.6); // Upwards
    } else {
      angle = (Math.random() - 0.5) * 1.6; // Anywhere forward
    }
    this.normalizeBallVelocity(b, angle);
    b.crazyModeTimer = 0; // Roll a fresh behavior right away
    this.spawnCrazyParticles(b.x, b.y, 12);
    this.sound.playCrazyGlitch();
  }

  /**
   * Resolves paddle deflection mechanics, spin, and energy gain.
   * @param {Ball} ball - Deflected ball.
   * @param {PaddleState} paddle - Paddle performing the deflection.
   * @param {number} dirX - Target direction (+1 for P1, -1 for P2).
   * @returns {void}
   */
  handlePaddleBounce(ball, paddle, dirX) {
    if (dirX > 0) {
      ball.x = paddle.x + paddle.w + ball.radius;
    } else {
      ball.x = paddle.x - ball.radius;
    }

    const paddleCenterY = paddle.y + paddle.h / 2;
    const impact = (ball.y - paddleCenterY) / (paddle.h / 2);
    const clampedImpact = Math.max(-1, Math.min(1, impact));

    const maxAngle = Math.PI * 0.35;
    const bounceAngle = clampedImpact * maxAngle;

    // Ball speed acceleration
    ball.speed = Math.min(ball.speed * 1.05, this.maxSpeed);

    // Track rally statistics
    this.currentRally++;
    if (this.currentRally > this.maxRally) {
      this.maxRally = this.currentRally;
    }

    // Track which player hit the ball last
    ball.lastHitterId = paddle.id;

    // Paddle Spin influence
    const spinBonus = (paddle.velocity / 300) * 1.8;

    ball.vx = Math.cos(bounceAngle) * ball.speed * dirX;
    ball.vy = Math.sin(bounceAngle) * ball.speed + spinBonus;

    // Deflection generates energy (+15)
    paddle.energy = Math.min(paddle.maxEnergy, paddle.energy + 15);

    // Extinguish Fireball if opponent deflects it
    if (ball.isFireball && ball.fireballOwner !== paddle.id) {
      ball.extinguishFireball();
    }

    const speedRatio = ball.speed / this.initialSpeed;
    this.sound.playPaddleHit(speedRatio);
    this.triggerScreenShake(3 + speedRatio * 1.5, 0.1);
    this.spawnHitParticles(ball.x, ball.y, paddle.color, 12, dirX);
  }

  /**
   * Executes the simulation frame: physics, status timers, collisions, item collections, and scoring.
   * @param {number} dt - Elapsed seconds since last frame.
   * @returns {void}
   */
  update(dt) {
    if (this.isPaused || this.gameState === 'config' || this.gameState === 'game_over') return;

    // Track active match duration
    if (this.gameState === 'playing' || this.gameState === 'serve') {
      this.matchTime += dt;
      if (this.ui) this.ui.updateMatchTimer(this.matchTime);
    }

    // 1. Update status timers and energy regeneration
    [this.paddle1, this.paddle2].forEach((p) => {
      if (p.shieldActive) {
        p.shieldTime -= dt;
        if (p.shieldTime <= 0) p.shieldActive = false;
      }

      // Update stackable size effects (each effect preserves its own duration)
      if (p.activeEffects && p.activeEffects.length > 0) {
        let heightMultiplier = 1.0;
        for (let j = p.activeEffects.length - 1; j >= 0; j--) {
          const eff = p.activeEffects[j];
          eff.duration -= dt;
          if (eff.duration <= 0) {
            p.activeEffects.splice(j, 1);
          } else {
            heightMultiplier *= eff.multiplier;
          }
        }
        p.h = Math.round(p.baseH * heightMultiplier);
        this.clampPaddle(p);
      } else {
        p.h = p.baseH;
      }

      p.energy = Math.min(p.maxEnergy, p.energy + dt * 2.8);
    });

    // 2. Paddle velocities for spin calculations
    this.paddle1.velocity = (this.paddle1.y - this.paddle1.prevY) / dt;
    this.paddle1.prevY = this.paddle1.y;

    this.paddle2.velocity = (this.paddle2.y - this.paddle2.prevY) / dt;
    this.paddle2.prevY = this.paddle2.y;

    // 3. Player 1 Movement
    if (this.controlMode === 'keyboard') {
      // A / Z move P1 (Q W E R are reserved for powers). Arrows also work vs Bot,
      // but belong exclusively to Player 2 in local PvP.
      const arrowsForP1 = this.oppMode === 'bot';
      if (this.keys['a'] || (arrowsForP1 && this.keys['arrowup'])) this.paddle1.y -= this.paddle1.speed * dt * 60;
      if (this.keys['z'] || (arrowsForP1 && this.keys['arrowdown'])) this.paddle1.y += this.paddle1.speed * dt * 60;
      this.clampPaddle(this.paddle1);
    }

    // 4. Opponent Movement (PvP or Tactical AI)
    if (this.oppMode === 'pvp') {
      if (this.keys['arrowup']) this.paddle2.y -= this.paddle2.speed * dt * 60;
      if (this.keys['arrowdown']) this.paddle2.y += this.paddle2.speed * dt * 60;
      this.clampPaddle(this.paddle2);
    } else {
      this.ai.update(dt);
    }

    // 5. Pre-Match 3-Second Preparation Countdown
    if (this.gameState === 'countdown') {
      this.countdownTimer -= dt;
      const currentSec = Math.ceil(this.countdownTimer);

      if (currentSec > 0 && currentSec !== this.lastCountdownSec) {
        this.lastCountdownSec = currentSec;
        this.ui.updateCountdown(currentSec);
        this.sound.playCountdownTick(false);
      }

      if (this.countdownTimer <= 0) {
        if (this.lastCountdownSec !== 0) {
          this.lastCountdownSec = 0;
          this.ui.updateCountdown('SERVE!');
          this.sound.playCountdownTick(true);
        }

        // Brief 0.35s pause displaying "SERVE!" before ball takes off
        if (this.countdownTimer <= -0.35) {
          this.ui.hideCountdown();
          this.balls = [this.createBaseBall(1)];
          this.gameState = 'playing';
        }
      }
      return;
    }

    // 5.5 Serve Delay
    if (this.gameState === 'serve') {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) {
        this.gameState = 'playing';
      } else {
        return;
      }
    }

    // 5.5 In-Court Items (Spawn every 5s & Ball Collision)
    if (this.gameState === 'playing') {
      this.itemSpawnTimer += dt;
      if (this.itemSpawnTimer >= 5.0) {
        this.itemSpawnTimer = 0;
        this.spawnCourtItem();
      }
    }

    for (let i = this.courtItems.length - 1; i >= 0; i--) {
      const item = this.courtItems[i];
      item.update(dt);
      if (item.life <= 0) {
        this.courtItems.splice(i, 1);
        continue;
      }

      // Check collision with any active ball
      for (const b of this.balls) {
        if (b.crazyHidden) continue; // Vanished Crazy Ball phases through items
        const dx = b.x - item.x;
        const dy = b.y - item.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= b.radius + item.radius) {
          this.applyCourtItem(item, b);
          this.courtItems.splice(i, 1);
          break;
        }
      }
    }

    // 6. Update all active balls & handle individual scoring (Multiball / Shrapnel)
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];

      // Trail record
      b.trail.unshift({ x: b.x, y: b.y, isFireball: b.isFireball });
      if (b.trail.length > b.maxTrail) b.trail.pop();

      // Crazy Ball chaos (may capture the ball on a surface or warp its time)
      if (b.isCrazy) this.updateCrazyBall(b, dt);
      const isStuck = b.crazyStuck !== null;
      const timeScale = b.isCrazy ? b.crazyTimeScale : 1;

      // Motion
      if (!isStuck) {
        b.x += b.vx * dt * 60 * timeScale;
        b.y += b.vy * dt * 60 * timeScale;
      }

      // Bomb ticking, swelling & fuse burning
      if (b.isBomb) {
        b.bombTimer -= dt;
        const bombProgress = 1 - Math.max(0, b.bombTimer) / b.bombMaxTimer;
        // Ball swells/inflates from baseRadius (9px) up to ~24px
        b.radius = b.baseRadius + bombProgress * 15;

        // Emit fuse spark particles
        if (Math.random() < 0.45) {
          this.particles.push(
            new Particle(
              b.x + (Math.random() - 0.5) * b.radius * 0.5,
              b.y - b.radius * 0.8,
              Math.random() < 0.5 ? '#ffe600' : '#ff3300',
              (Math.random() - 0.5) * 3,
              -Math.random() * 3 - 1,
              0.22,
              2.5
            )
          );
        }

        // Detonate into wild shrapnel mini-balls when fuse ends
        if (b.bombTimer <= 0) {
          this.detonateBomb(b, i);
          continue;
        }
      }

      // Update cumulative ball effects (e.g. Slow down with independent 5s timers)
      if (b.activeEffects && b.activeEffects.length > 0) {
        let isSlowed = false;
        for (let j = b.activeEffects.length - 1; j >= 0; j--) {
          const eff = b.activeEffects[j];
          eff.duration -= dt;
          if (eff.duration <= 0) {
            // Restore speed from this expired slow effect
            b.speed /= eff.multiplier;
            b.vx /= eff.multiplier;
            b.vy /= eff.multiplier;
            b.speed = Math.max(this.initialSpeed, Math.min(b.speed, this.maxSpeed));
            b.activeEffects.splice(j, 1);
          } else {
            if (eff.type === 'slow_down') isSlowed = true;
          }
        }

        if (isSlowed && Math.random() < 0.35) {
          this.particles.push(
            new Particle(
              b.x,
              b.y,
              '#00c3ff',
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              0.25,
              3
            )
          );
        }
      }

      // Invisibility cloaking timer countdown
      if (b.invisibilityTimer > 0) {
        b.invisibilityTimer = Math.max(0, b.invisibilityTimer - dt);
        if (b.invisibilityTimer <= 0) {
          b.invisibilityOwner = null;
        }

        // Emit phantom cloak distortion sparks when actively cloaked
        const towardsOpp = (b.invisibilityOwner === 1 && b.vx > 0) || (b.invisibilityOwner === 2 && b.vx < 0);
        if (towardsOpp && Math.random() < 0.28) {
          this.particles.push(
            new Particle(
              b.x + (Math.random() - 0.5) * 8,
              b.y + (Math.random() - 0.5) * 8,
              '#818cf8',
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              0.28,
              2.5
            )
          );
        }
      }

      // Fireball particle emitter
      if (b.isFireball) {
        this.particles.push(
          new Particle(
            b.x,
            b.y,
            Math.random() > 0.5 ? '#ff5500' : '#ffe600',
            (Math.random() - 0.5) * 2 - Math.sign(b.vx) * 3,
            (Math.random() - 0.5) * 2,
            0.25,
            4
          )
        );
      }

      // Captured Crazy Ball skips collisions and scoring until released
      if (isStuck) continue;

      // Wall Ricochets
      const topLimit = 12 + b.radius;
      const bottomLimit = this.height - 12 - b.radius;

      if (b.y <= topLimit) {
        b.y = topLimit;
        b.vy = Math.abs(b.vy);
        this.sound.playWallHit();
        this.spawnHitParticles(b.x, topLimit, '#ffe600', 6, 0);
        if (b.crazySticky) this.captureCrazyBall(b, 'top');
      } else if (b.y >= bottomLimit) {
        b.y = bottomLimit;
        b.vy = -Math.abs(b.vy);
        this.sound.playWallHit();
        this.spawnHitParticles(b.x, bottomLimit, '#ffe600', 6, 0);
        if (b.crazySticky) this.captureCrazyBall(b, 'bottom');
      }

      // Paddle 1 Collision
      if (
        b.vx < 0 &&
        b.x - b.radius <= this.paddle1.x + this.paddle1.w &&
        b.x + b.radius >= this.paddle1.x &&
        b.y >= this.paddle1.y - 6 &&
        b.y <= this.paddle1.y + this.paddle1.h + 6
      ) {
        this.handlePaddleBounce(b, this.paddle1, 1);
        if (b.crazySticky) this.captureCrazyBall(b, 'paddle1', this.paddle1);
      }

      // Paddle 2 Collision
      if (
        b.vx > 0 &&
        b.x + b.radius >= this.paddle2.x &&
        b.x - b.radius <= this.paddle2.x + this.paddle2.w &&
        b.y >= this.paddle2.y - 6 &&
        b.y <= this.paddle2.y + this.paddle2.h + 6
      ) {
        this.handlePaddleBounce(b, this.paddle2, -1);
        if (b.crazySticky) this.captureCrazyBall(b, 'paddle2', this.paddle2);
      }

      // Force Shield Deflections
      // P1 Shield (X = 18)
      if (this.paddle1.shieldActive && b.vx < 0 && b.x - b.radius <= 18) {
        b.vx = Math.abs(b.vx) * 1.15;
        this.sound.playShieldDeflect();
        this.triggerScreenShake(7, 0.2);
        this.spawnHitParticles(18, b.y, '#00ffaa', 18, 1);
        this.paddle1.shieldActive = false;
        this.addAnnouncement('P1 shield blocked a goal', '#10b981');
      }

      // P2 Shield (X = width - 18)
      if (this.paddle2.shieldActive && b.vx > 0 && b.x + b.radius >= this.width - 18) {
        b.vx = -Math.abs(b.vx) * 1.15;
        this.sound.playShieldDeflect();
        this.triggerScreenShake(7, 0.2);
        this.spawnHitParticles(this.width - 18, b.y, '#10b981', 18, -1);
        this.paddle2.shieldActive = false;
        this.addAnnouncement(`${this.oppMode === 'bot' ? 'BOT' : 'P2'} shield blocked a goal`, '#10b981');
      }

      // --- MULTIBALL / SHRAPNEL SCORING: Every ball scores +1 point immediately! ---
      // Left Goal (Player 2 / Bot scores)
      if (b.x + b.radius < 0) {
        this.currentRally = 0;
        this.scoreP2++;
        this.sound.playScore();
        this.spawnHitParticles(20, b.y, '#a855f7', 25, 1);

        // Remove this scored ball
        this.balls.splice(i, 1);

        // Check if Player 2 won the match
        if (this.scoreP2 >= this.targetScore) {
          this.endMatch(2);
          return;
        }

        // If no more balls are left in play, serve a new ball
        if (this.balls.length === 0) {
          this.resetRound(2);
          return;
        }
      } 
      // Right Goal (Player 1 scores)
      else if (b.x - b.radius > this.width) {
        this.currentRally = 0;
        this.scoreP1++;
        this.sound.playScore();
        this.spawnHitParticles(this.width - 20, b.y, '#ffaa00', 25, -1);

        // Remove this scored ball
        this.balls.splice(i, 1);

        // Check if Player 1 won the match
        if (this.scoreP1 >= this.targetScore) {
          this.endMatch(1);
          return;
        }

        // If no more balls are left in play, serve a new ball
        if (this.balls.length === 0) {
          this.resetRound(1);
          return;
        }
      }
    }

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // 9. Update Screen Shake
    if (this.shakeDuration > 0) this.shakeDuration -= dt;

    // 10. Update HUD Buttons status
    this.ui.updateHUD();
  }

  // --- RENDERING PIPELINE ---

  /**
   * Main rendering routine: draws floor, boundaries, shields, items, paddles, balls, trails, VFX, and text.
   * @returns {void}
   */
  draw() {
    this.ctx.save();

    // Screen Shake
    if (this.shakeDuration > 0) {
      this.ctx.translate(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
    }

    // Arena Floor
    this.ctx.fillStyle = '#07050d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Neon Court Boundary
    this.ctx.strokeStyle = '#281d38';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(8, 8, this.width - 16, this.height - 16);

    // Dashed Centerline
    this.ctx.strokeStyle = 'rgba(255, 209, 102, 0.14)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([12, 14]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 12);
    this.ctx.lineTo(this.width / 2, this.height - 12);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Center Circle
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, 70, 0, Math.PI * 2);
    this.ctx.stroke();

    // Active Force Shields
    this.drawShields();

    // In-Court Power-up Items
    for (const item of this.courtItems) {
      item.draw(this.ctx);
    }

    // Paddles
    this.drawPaddle(this.paddle1);
    this.drawPaddle(this.paddle2);

    // Active Balls & Trails
    for (const b of this.balls) {
      this.drawBallTrail(b);
      this.drawBall(b);
    }

    // Particle Sparks
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    // Idle arena hint (Match Setup / Match Over dismissed without starting a match)
    if (this.gameState === 'config' || this.gameState === 'game_over') {
      this.ctx.fillStyle = 'rgba(255, 209, 102, 0.55)';
      this.ctx.font = '700 15px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('OPEN SETTINGS TO START A NEW MATCH', this.width / 2, this.height / 2 + 5);
    }

    // Serve Countdown Message
    if (this.gameState === 'serve') {
      this.ctx.fillStyle = '#ffe600';
      this.ctx.font = '700 16px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GET READY...', this.width / 2, this.height / 2 - 25);
    }

    this.ctx.restore();
  }

  /**
   * Renders active defensive Force Shields.
   * @returns {void}
   */
  drawShields() {
    if (this.paddle1.shieldActive) {
      this.ctx.save();
      if (this.paddle1.shieldTime < 1.5) {
        this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.02) * 0.4;
      }
      this.ctx.strokeStyle = '#00ffaa';
      this.ctx.shadowColor = '#00ffaa';
      this.ctx.shadowBlur = 15;
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(18, 16);
      this.ctx.lineTo(18, this.height - 16);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.paddle2.shieldActive) {
      this.ctx.save();
      if (this.paddle2.shieldTime < 1.5) {
        this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.02) * 0.4;
      }
      this.ctx.strokeStyle = '#00ffaa';
      this.ctx.shadowColor = '#00ffaa';
      this.ctx.shadowBlur = 15;
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.width - 18, 16);
      this.ctx.lineTo(this.width - 18, this.height - 16);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  /**
   * Renders a player paddle with neon shadow, white core, and size aura.
   * @param {PaddleState} paddle - Paddle to render.
   * @returns {void}
   */
  drawPaddle(paddle) {
    this.ctx.save();
    this.ctx.fillStyle = paddle.color;
    this.ctx.shadowColor = paddle.color;
    // Reduced paddle glow by 30% (from 15 to 10.5)
    this.ctx.shadowBlur = 10.5;

    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, [5]);
    this.ctx.fill();

    // Glowing core
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x + 3, paddle.y + 4, paddle.w - 6, paddle.h - 8, [2]);
    this.ctx.fill();

    // Size Modifier Aura (Cumulative active effects)
    if (paddle.activeEffects && paddle.activeEffects.length > 0) {
      this.ctx.save();
      const auraColor = paddle.h > paddle.baseH ? '#00ff88' : (paddle.h < paddle.baseH ? '#ff2a5f' : '#ffe600');
      this.ctx.strokeStyle = auraColor;
      this.ctx.shadowColor = auraColor;
      this.ctx.shadowBlur = 14;
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(paddle.x - 3, paddle.y - 3, paddle.w + 6, paddle.h + 6);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  /**
   * Renders motion trail history behind a ball.
   * @param {Ball} ball - Ball entity.
   * @returns {void}
   */
  drawBallTrail(ball) {
    if (ball.crazyHidden) return; // Vanished Crazy Ball leaves no trace

    let trailInvisibilityAlpha = 1.0;
    if (ball.invisibilityTimer > 0) {
      const towardsOpponent = (ball.invisibilityOwner === 1 && ball.vx > 0) || (ball.invisibilityOwner === 2 && ball.vx < 0);
      if (towardsOpponent) {
        // Alternates opacity down to 0.20 with stealth cloak flicker
        const wave = Math.pow(0.5 + 0.5 * Math.sin(this.matchTime * 10), 2.5);
        trailInvisibilityAlpha = 0.20 + 0.80 * wave;
      }
    }

    for (let i = 0; i < ball.trail.length; i++) {
      const pos = ball.trail[i];
      const progress = 1 - i / ball.trail.length;
      const radius = ball.radius * progress * 0.85;

      this.ctx.save();
      this.ctx.globalAlpha = progress * 0.4 * trailInvisibilityAlpha;
      if (ball.isCrazy && !ball.isBomb) {
        this.ctx.fillStyle = `hsl(${(this.crazyHue(ball) + i * 12) % 360}, 100%, 60%)`;
      } else if (pos.isFireball) {
        this.ctx.fillStyle = i % 2 === 0 ? '#ff5500' : '#ffe600';
      } else if (ball.isBomb) {
        this.ctx.fillStyle = i % 2 === 0 ? '#ff3300' : '#ff8800';
      } else if (ball.isShrapnel) {
        this.ctx.fillStyle = i % 2 === 0 ? '#ffe600' : '#ff5500';
      } else {
        this.ctx.fillStyle = ball.vx > 0 ? '#ffaa00' : '#a855f7';
      }
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  /**
   * Renders ball body with fireball flame, bomb swelling, or shrapnel glow.
   * @param {Ball} ball - Ball entity.
   * @returns {void}
   */
  drawBall(ball) {
    if (ball.crazyHidden) return; // Vanished Crazy Ball is fully invisible

    this.ctx.save();

    // Invisibility cloaking: alternates opacity down to 0.20
    const isCloakedTowardsOpponent = ball.invisibilityTimer > 0 &&
      ((ball.invisibilityOwner === 1 && ball.vx > 0) || (ball.invisibilityOwner === 2 && ball.vx < 0));

    if (isCloakedTowardsOpponent) {
      const wave = Math.pow(0.5 + 0.5 * Math.sin(this.matchTime * 10), 2.5);
      this.ctx.globalAlpha = 0.20 + 0.80 * wave;
    }

    if (ball.isCrazy && !ball.isBomb) {
      this.drawCrazyBall(ball);
    } else if (ball.isFireball) {
      this.ctx.fillStyle = '#ffe600';
      this.ctx.shadowColor = '#ff5500';
      this.ctx.shadowBlur = 22;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (ball.isBomb) {
      const progress = 1 - Math.max(0, ball.bombTimer) / ball.bombMaxTimer;
      // Changing colors over 5 seconds: pulsing orange -> red-orange -> alarming red/white flashing
      let bombColor;
      if (ball.bombTimer < 1.4) {
        const flash = Math.sin(ball.bombTimer * 25) > 0;
        bombColor = flash ? '#ff0033' : '#ffffff';
      } else if (ball.bombTimer < 3.0) {
        bombColor = '#ff3300';
      } else {
        bombColor = '#ff8800';
      }

      this.ctx.fillStyle = bombColor;
      this.ctx.shadowColor = '#ff2200';
      this.ctx.shadowBlur = 18 + progress * 12;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing reflection core
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.28, 0, Math.PI * 2);
      this.ctx.fill();

      // Bomb outline emblem on the sphere when inflated enough
      if (ball.radius >= 13) {
        this.ctx.strokeStyle = '#111111';
        this.ctx.lineWidth = 1.8;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y + 1, ball.radius * 0.38, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.strokeRect(ball.x - 2, ball.y - ball.radius * 0.38 - 1, 4, 2);
        this.ctx.beginPath();
        this.ctx.moveTo(ball.x, ball.y - ball.radius * 0.38 - 1);
        this.ctx.quadraticCurveTo(ball.x + 3, ball.y - ball.radius * 0.65, ball.x + 4.5, ball.y - ball.radius * 0.55);
        this.ctx.stroke();
      }
    } else if (ball.isShrapnel) {
      // Hot shrapnel mini-ball
      this.ctx.fillStyle = '#ffe600';
      this.ctx.shadowColor = '#ff3300';
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = isCloakedTowardsOpponent ? 'transparent' : '#ffd166';
      this.ctx.shadowBlur = isCloakedTowardsOpponent ? 0 : 14;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  /**
   * Current rainbow hue of a Crazy Ball (slow shimmer: one full turn every ~3s).
   * @param {Ball} ball - Crazy ball.
   * @returns {number} Hue in degrees [0, 360).
   */
  crazyHue(ball) {
    return Math.floor(ball.crazyPhase * 120) % 360;
  }

  /**
   * Renders a Crazy Ball: rainbow body, RGB-split glitch ghosts,
   * fireball glow when combined, and a pulsing ring while glued to a surface.
   * @param {Ball} ball - Crazy ball.
   * @returns {void}
   */
  drawCrazyBall(ball) {
    const ctx = this.ctx;
    const color = `hsl(${this.crazyHue(ball)}, 100%, 60%)`;

    // Chromatic aberration ghosts
    const jitter = 2 + Math.random() * 2;
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(ball.x - jitter, ball.y + (Math.random() - 0.5) * 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3ea5';
    ctx.beginPath();
    ctx.arc(ball.x + jitter, ball.y + (Math.random() - 0.5) * 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rainbow body
    ctx.fillStyle = color;
    ctx.shadowColor = ball.isFireball ? '#ff5500' : color;
    ctx.shadowBlur = ball.isFireball ? 22 : 16;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // White hot core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing capture ring while glued to a wall or paddle
    if (ball.crazyStuck) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 5 + Math.sin(performance.now() * 0.03) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- MAIN ANIMATION LOOP ---

  /**
   * Primary animation frame loop driven by requestAnimationFrame.
   * @param {DOMHighResTimeStamp} currentTime - Timestamp provided by requestAnimationFrame.
   * @returns {void}
   */
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.PongGame = PongGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PongGame;
}
