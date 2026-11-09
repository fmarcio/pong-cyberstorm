// @ts-check

/**
 * @typedef {'mouse' | 'keyboard'} ControlMode
 * @typedef {'bot' | 'pvp'} OpponentMode
 * @typedef {'easy' | 'medium' | 'insane'} DifficultyLevel
 */

/**
 * PONG: CYBERSTORM - UI Manager
 * Handles HUD bindings, external scoreboard, outside energy meters,
 * skill button cooldowns/affordability, pre-game configuration modal,
 * and match-over victory screens.
 */
class UIManager {
  /**
   * Constructs the UI Manager and caches DOM elements.
   * @param {any} game - The parent PongGame instance.
   */
  constructor(game) {
    /** @type {any} */
    this.game = game;

    // DOM Elements Cache
    /** @type {HTMLElement|null} */
    this.wrapper = document.querySelector('.canvas-wrapper');
    /** @type {HTMLElement|null} */
    this.scoreP1El = document.getElementById('score-p1-val');
    /** @type {HTMLElement|null} */
    this.scoreP2El = document.getElementById('score-p2-val');
    /** @type {HTMLElement|null} */
    this.scoreP2NameEl = document.getElementById('score-p2-name');
    /** @type {HTMLElement|null} */
    this.p2EnergyHeaderLabel = document.getElementById('p2-energy-header-label');
    /** @type {HTMLElement|null} */
    this.scoreboardTargetChip = document.getElementById('scoreboard-target-chip');
    /** @type {HTMLElement|null} */
    this.p1EnergyFillEl = document.getElementById('p1-energy-fill');
    /** @type {HTMLElement|null} */
    this.p1EnergyValEl = document.getElementById('p1-energy-val');
    /** @type {HTMLElement|null} */
    this.p2EnergyFillEl = document.getElementById('p2-energy-fill');
    /** @type {HTMLElement|null} */
    this.p2EnergyValEl = document.getElementById('p2-energy-val');

    /** @type {HTMLElement|null} */
    this.countdownOverlay = document.getElementById('countdownOverlay');
    /** @type {HTMLElement|null} */
    this.countdownNumber = document.getElementById('countdownNumber');
    /** @type {HTMLElement|null} */
    this.countdownSubtext = document.getElementById('countdownSubtext');

    /** @type {HTMLElement|null} */
    this.headerTimerVal = document.getElementById('headerTimerVal');
    /** @type {HTMLElement|null} */
    this.p1EnergyWarningEl = document.getElementById('p1-energy-warning');
    /** @type {HTMLElement|null} */
    this.p2EnergyWarningEl = document.getElementById('p2-energy-warning');

    this.setupUI();
    this.setupModals();
  }

  /**
   * Sets up event listeners for header controls, audio toggle, and skill buttons.
   * @returns {void}
   */
  setupUI() {
    const btnControl = document.getElementById('btn-control-mode');
    const btnOpp = document.getElementById('btn-opp-mode');
    const btnDiff = document.getElementById('btn-difficulty');
    const btnAudio = document.getElementById('btn-audio');
    const lblAudio = document.getElementById('lbl-audio');
    const btnOpenConfig = document.getElementById('btn-open-config');

    if (btnControl) {
      btnControl.addEventListener('click', () => {
        this.setControlMode(this.game.controlMode === 'mouse' ? 'keyboard' : 'mouse');
      });
    }

    if (btnOpp) {
      btnOpp.addEventListener('click', () => {
        this.setOppMode(this.game.oppMode === 'bot' ? 'pvp' : 'bot');
      });
    }

    if (btnDiff) {
      btnDiff.addEventListener('click', () => {
        /** @type {DifficultyLevel[]} */
        const diffs = ['easy', 'medium', 'insane'];
        const nextIdx = (diffs.indexOf(this.game.difficulty) + 1) % diffs.length;
        this.setDifficulty(diffs[nextIdx]);
      });
    }

    if (btnAudio && lblAudio) {
      btnAudio.addEventListener('click', () => {
        this.game.sound.enabled = !this.game.sound.enabled;
        lblAudio.textContent = this.game.sound.enabled ? 'On' : 'Muted';
      });
    }

    if (btnOpenConfig) {
      btnOpenConfig.addEventListener('click', () => {
        this.openConfigModal();
      });
    }

    const btnOpenInfo = document.getElementById('btn-open-info');
    if (btnOpenInfo) {
      btnOpenInfo.addEventListener('click', () => {
        this.openInfoModal();
      });
    }

    const btnTheater = document.getElementById('btn-theater-mode');
    if (btnTheater) {
      btnTheater.addEventListener('click', () => {
        this.toggleTheaterMode();
      });
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Synchronize fullscreen state when entering/exiting via F11 or Esc
    document.addEventListener('fullscreenchange', () => {
      this.syncFullscreenState();
    });

    // Skill Bar Button Clicks
    document.querySelectorAll('.skill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const power = /** @type {HTMLElement} */ (btn).dataset.power;
        if (power) this.game.castPower(this.game.paddle1, power);
      });
    });

    // Ensure all buttons release keyboard focus on click so Space never activates them
    document.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.blur();
      });
    });
  }

  /**
   * Configures player 1 control scheme between Mouse and Keyboard.
   * @param {ControlMode} mode - Desired input control scheme.
   * @returns {void}
   */
  setControlMode(mode) {
    this.game.controlMode = mode;
    const lblControl = document.getElementById('lbl-control-mode');
    if (lblControl) {
      lblControl.textContent = mode === 'mouse' ? 'Mouse' : 'Keyboard (W/S)';
    }
    if (this.wrapper) {
      this.wrapper.classList.toggle('keyboard-mode', mode === 'keyboard');
    }

    // Sync modal segmented control
    document.querySelectorAll('#modalControlSelector .segment-btn').forEach((btn) => {
      btn.classList.toggle('active', /** @type {HTMLElement} */ (btn).dataset.val === mode);
    });
  }

  /**
   * Configures match mode between Tactical AI (Bot) and 2-Player local PvP.
   * @param {OpponentMode} mode - Match opponent configuration.
   * @returns {void}
   */
  setOppMode(mode) {
    this.game.oppMode = mode;
    const lblOpp = document.getElementById('lbl-opp-mode');
    const btnDiff = document.getElementById('btn-difficulty');
    const modalDiffWrapper = document.getElementById('modalDifficultyWrapper');

    if (lblOpp) lblOpp.textContent = mode === 'bot' ? 'vs Bot' : '2 Players';
    if (btnDiff) btnDiff.style.display = mode === 'bot' ? 'inline-block' : 'none';
    if (modalDiffWrapper) modalDiffWrapper.style.display = mode === 'bot' ? 'flex' : 'none';

    const p2Desc = document.getElementById('p2-desc');
    const diffCapitalized = this.game.difficulty.charAt(0).toUpperCase() + this.game.difficulty.slice(1);
    if (p2Desc) {
      p2Desc.textContent = mode === 'bot'
        ? `Tactical AI (${diffCapitalized}) calculates ricochets and casts spells.`
        : 'Player 2 controls with Arrow Keys ↑/↓ and powers 7, 8, 9, 0.';
    }

    if (this.scoreP2NameEl) this.scoreP2NameEl.textContent = mode === 'bot' ? 'BOT' : 'PLAYER 2';
    if (this.p2EnergyHeaderLabel) this.p2EnergyHeaderLabel.textContent = mode === 'bot' ? 'BOT' : 'P2';

    // Sync modal segmented control
    document.querySelectorAll('#modalOppSelector .segment-btn').forEach((btn) => {
      btn.classList.toggle('active', /** @type {HTMLElement} */ (btn).dataset.val === mode);
    });
  }

  /**
   * Updates Tactical AI difficulty setting.
   * @param {DifficultyLevel} diff - AI difficulty tier.
   * @returns {void}
   */
  setDifficulty(diff) {
    this.game.difficulty = diff;
    const labels = { easy: 'Easy', medium: 'Medium', insane: 'Insane' };
    const lblDiff = document.getElementById('lbl-difficulty');
    if (lblDiff) lblDiff.textContent = labels[diff];

    const p2Desc = document.getElementById('p2-desc');
    if (p2Desc) {
      p2Desc.textContent = `Tactical AI (${labels[diff]}) calculates ricochets and casts spells.`;
    }

    // Sync modal segmented control
    document.querySelectorAll('#modalDiffSelector .segment-btn').forEach((btn) => {
      btn.classList.toggle('active', /** @type {HTMLElement} */ (btn).dataset.val === diff);
    });
  }

  /**
   * Configures modal interactions (Score selection, segmented controls, play again).
   * @returns {void}
   */
  setupModals() {
    const scoreBtns = document.querySelectorAll('.score-opt-btn');
    const customContainer = document.getElementById('customScoreContainer');
    const customInput = /** @type {HTMLInputElement|null} */ (document.getElementById('customScoreInput'));
    const btnStart = document.getElementById('btn-start-match');

    scoreBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        scoreBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (/** @type {HTMLElement} */ (btn).dataset.score === 'custom') {
          if (customContainer) customContainer.classList.remove('hidden');
          if (customInput) customInput.focus();
        } else {
          if (customContainer) customContainer.classList.add('hidden');
        }
      });
    });

    // Sanitize custom score input to strictly valid numbers [1 - 99]
    if (customInput) {
      customInput.addEventListener('input', () => {
        const val = parseInt(customInput.value, 10);
        if (!isNaN(val)) {
          if (val > 99) customInput.value = '99';
          else if (val < 1 && customInput.value.length >= 2) customInput.value = '1';
        }
      });
    }

    // Modal segmented controls
    document.querySelectorAll('#modalOppSelector .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = /** @type {OpponentMode} */ (/** @type {HTMLElement} */ (btn).dataset.val);
        if (val) this.setOppMode(val);
      });
    });

    document.querySelectorAll('#modalDiffSelector .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = /** @type {DifficultyLevel} */ (/** @type {HTMLElement} */ (btn).dataset.val);
        if (val) this.setDifficulty(val);
      });
    });

    document.querySelectorAll('#modalControlSelector .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = /** @type {ControlMode} */ (/** @type {HTMLElement} */ (btn).dataset.val);
        if (val) this.setControlMode(val);
      });
    });

    // Start Match Click
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const activeScoreBtn = /** @type {HTMLElement|null} */ (document.querySelector('.score-opt-btn.active'));
        let target = 7;

        if (activeScoreBtn && activeScoreBtn.dataset.score === 'custom') {
          const val = customInput ? parseInt(customInput.value, 10) : 11;
          target = isNaN(val) ? 11 : Math.max(1, Math.min(99, val));
        } else if (activeScoreBtn && activeScoreBtn.dataset.score) {
          target = parseInt(activeScoreBtn.dataset.score, 10) || 7;
        }

        this.game.startNewMatch(target);
      });
    }

    // Pause Overlay Actions (Resume & Restart)
    const btnResume = document.getElementById('btn-resume-game');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.game.togglePause();
      });
    }

    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.game.togglePause();
        this.game.startNewMatch(this.game.targetScore);
      });
    }

    // Match Over Modal Actions
    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => {
        const matchOver = document.getElementById('matchOverModal');
        if (matchOver) matchOver.classList.add('hidden');
        this.game.startNewMatch(this.game.targetScore);
      });
    }

    const btnChangeSettings = document.getElementById('btn-change-settings');
    if (btnChangeSettings) {
      btnChangeSettings.addEventListener('click', () => {
        const matchOver = document.getElementById('matchOverModal');
        if (matchOver) matchOver.classList.add('hidden');
        this.openConfigModal();
      });
    }

    // Info Codex Modal Actions
    const btnCloseInfo = document.getElementById('btn-close-info');
    if (btnCloseInfo) {
      btnCloseInfo.addEventListener('click', () => {
        this.closeInfoModal();
      });
    }

    const btnCloseInfoAction = document.getElementById('btn-close-info-action');
    if (btnCloseInfoAction) {
      btnCloseInfoAction.addEventListener('click', () => {
        this.closeInfoModal();
      });
    }

    const infoModalEl = document.getElementById('infoModal');
    if (infoModalEl) {
      infoModalEl.addEventListener('click', (e) => {
        if (e.target === infoModalEl) {
          this.closeInfoModal();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const info = document.getElementById('infoModal');
        if (info && !info.classList.contains('hidden')) {
          this.closeInfoModal();
        }
      }
    });
  }

  /**
   * Opens the rules and codex modal (pausing game if currently active).
   * @returns {void}
   */
  openInfoModal() {
    if (document.activeElement && typeof /** @type {HTMLElement} */ (document.activeElement).blur === 'function') {
      /** @type {HTMLElement} */ (document.activeElement).blur();
    }
    // Automatically pause if match is in progress
    if (this.game.gameState === 'playing' && !this.game.isPaused) {
      this.game.togglePause();
    }
    const infoModal = document.getElementById('infoModal');
    if (infoModal) infoModal.classList.remove('hidden');
  }

  /**
   * Closes the rules and codex modal.
   * @returns {void}
   */
  closeInfoModal() {
    const infoModal = document.getElementById('infoModal');
    if (infoModal) infoModal.classList.add('hidden');
    if (document.activeElement && typeof /** @type {HTMLElement} */ (document.activeElement).blur === 'function') {
      /** @type {HTMLElement} */ (document.activeElement).blur();
    }
  }

  /**
   * Toggles YouTube-style wide Theater Mode.
   * @returns {void}
   */
  toggleTheaterMode() {
    const isTheater = document.body.classList.toggle('theater-mode');
    const btnTheater = document.getElementById('btn-theater-mode');
    const lblTheater = document.getElementById('lbl-theater-mode');
    if (btnTheater) btnTheater.classList.toggle('active', isTheater);
    if (lblTheater) lblTheater.textContent = isTheater ? 'Theater: On' : 'Theater';
  }

  /**
   * Toggles Fullscreen mode using HTML5 Fullscreen API.
   * @returns {void}
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /**
   * Synchronizes button labels and active states with the browser's fullscreen state.
   * @returns {void}
   */
  syncFullscreenState() {
    const isFullscreen = Boolean(document.fullscreenElement);
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const lblFullscreen = document.getElementById('lbl-fullscreen');
    if (btnFullscreen) btnFullscreen.classList.toggle('active', isFullscreen);
    if (lblFullscreen) lblFullscreen.textContent = isFullscreen ? 'Exit' : 'Fullscreen';
  }

  /**
   * Opens the pre-game configuration modal and resets pause overlay.
   * @returns {void}
   */
  openConfigModal() {
    if (document.activeElement && typeof /** @type {HTMLElement} */ (document.activeElement).blur === 'function') {
      /** @type {HTMLElement} */ (document.activeElement).blur();
    }
    this.game.gameState = 'config';
    this.game.isPaused = false;
    const pauseOverlay = document.getElementById('pauseOverlay');
    const matchOver = document.getElementById('matchOverModal');
    const configModal = document.getElementById('configModal');
    const infoModal = document.getElementById('infoModal');

    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (matchOver) matchOver.classList.add('hidden');
    if (infoModal) infoModal.classList.add('hidden');
    if (configModal) configModal.classList.remove('hidden');
  }

  /**
   * Closes all active modal overlays.
   * @returns {void}
   */
  closeModals() {
    const configModal = document.getElementById('configModal');
    const matchOver = document.getElementById('matchOverModal');
    const infoModal = document.getElementById('infoModal');
    if (configModal) configModal.classList.add('hidden');
    if (matchOver) matchOver.classList.add('hidden');
    if (infoModal) infoModal.classList.add('hidden');
  }

  /**
   * Displays the 3-second preparation countdown overlay.
   * @param {number|string} val - Initial countdown number.
   * @returns {void}
   */
  showCountdown(val) {
    if (this.countdownOverlay) this.countdownOverlay.classList.remove('hidden');
    this.updateCountdown(val);
  }

  /**
   * Updates the countdown value and styling.
   * @param {number|string} val - Countdown value to render.
   * @returns {void}
   */
  updateCountdown(val) {
    if (!this.countdownNumber) return;
    const str = String(val);
    const isServe = str.toUpperCase().includes('SERVE') || str.toUpperCase().includes('GO');
    this.countdownNumber.textContent = str;
    this.countdownNumber.classList.toggle('serve-text', isServe);
    if (this.countdownSubtext) {
      this.countdownSubtext.textContent = isServe ? 'COMMENCE MATCH!' : 'GET READY...';
    }
  }

  /**
   * Hides the countdown overlay.
   * @returns {void}
   */
  hideCountdown() {
    if (this.countdownOverlay) this.countdownOverlay.classList.add('hidden');
  }

  /**
   * Formats elapsed seconds to MM:SS string format.
   * @param {number} totalSeconds - Elapsed seconds.
   * @returns {string} Formatted MM:SS string.
   */
  formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Updates the discreet match timer in the header.
   * @param {number} seconds - Elapsed active match time in seconds.
   * @returns {void}
   */
  updateMatchTimer(seconds) {
    if (this.headerTimerVal) {
      this.headerTimerVal.textContent = this.formatTime(seconds);
    }
  }

  /**
   * Triggers a discreet low energy alert pill next to a player's score.
   * @param {number} playerId - ID of the player attempting to cast (1 or 2).
   * @returns {void}
   */
  triggerEnergyWarning(playerId) {
    const el = playerId === 1 ? this.p1EnergyWarningEl : this.p2EnergyWarningEl;
    if (!el) return;

    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth; // Force CSS reflow to re-trigger shake animation
    el.style.animation = '';

    const timerKey = playerId === 1 ? '_p1EnergyWarnTimer' : '_p2EnergyWarnTimer';
    if (this[timerKey]) clearTimeout(this[timerKey]);
    this[timerKey] = setTimeout(() => {
      el.classList.add('hidden');
    }, 1500);
  }

  /**
   * Calculates the most frequently cast spell power.
   * @param {Record<string, number>} powersMap - Power usage counts.
   * @returns {string} Human-readable spell name with usage count.
   */
  getTopSpell(powersMap) {
    let topName = 'None';
    let maxCount = 0;
    /** @type {Record<string, string>} */
    const names = {
      fireball: 'Fireball',
      freeze: 'Freeze',
      multiball: 'Multiball',
      shield: 'Force Shield'
    };

    for (const [key, count] of Object.entries(powersMap || {})) {
      if (count > maxCount) {
        maxCount = count;
        topName = `${names[key] || key} (${count}x)`;
      }
    }
    return topName;
  }

  /**
   * Calculates the most frequently collected in-court item.
   * @param {Record<string, number>} itemsMap - Item collection counts.
   * @returns {string} Human-readable item name with collection count.
   */
  getTopItem(itemsMap) {
    let topName = 'None';
    let maxCount = 0;
    /** @type {Record<string, string>} */
    const names = {
      reduce: 'Reduce',
      size_up: 'Size It Up',
      slow_down: 'Slow Down',
      energy_boost: 'Energy Boost',
      energy_down: 'Energy Down',
      bomb: 'Bomb Hazard',
      invisibility: 'Invisibility'
    };

    for (const [key, count] of Object.entries(itemsMap || {})) {
      if (count > maxCount) {
        maxCount = count;
        topName = `${names[key] || key} (${count}x)`;
      }
    }
    return topName;
  }

  /**
   * Displays the victory screen banner with winner information and key match statistics.
   * @param {number} winnerId - ID of winning player (1 or 2).
   * @returns {void}
   */
  showMatchOver(winnerId) {
    const modal = document.getElementById('matchOverModal');
    const title = document.getElementById('winnerTitle');
    const p1Score = document.getElementById('finalScoreP1');
    const p2Score = document.getElementById('finalScoreP2');
    const icon = document.getElementById('winnerIcon');

    // Key match statistics elements
    const statMatchTime = document.getElementById('stat-match-time');
    const statMaxRally = document.getElementById('stat-max-rally');
    const statP1Power = document.getElementById('stat-p1-power');
    const statP2Power = document.getElementById('stat-p2-power');
    const statP2PowerLabel = document.getElementById('stat-p2-power-label');
    const statTopItem = document.getElementById('stat-top-item');

    const iconTrophy = document.getElementById('winnerIconTrophy');
    const iconRobot = document.getElementById('winnerIconRobot');
    const iconCrown = document.getElementById('winnerIconCrown');

    if (iconTrophy) iconTrophy.classList.toggle('hidden', winnerId !== 1);
    if (iconRobot) iconRobot.classList.toggle('hidden', !(winnerId === 2 && this.game.oppMode === 'bot'));
    if (iconCrown) iconCrown.classList.toggle('hidden', !(winnerId === 2 && this.game.oppMode !== 'bot'));

    if (p1Score) p1Score.textContent = String(this.game.scoreP1);
    if (p2Score) p2Score.textContent = String(this.game.scoreP2);

    if (winnerId === 1) {
      if (title) {
        title.textContent = 'PLAYER 1 VICTORIOUS!';
        title.style.color = '#ffaa00';
      }
    } else {
      if (this.game.oppMode === 'bot') {
        if (title) {
          title.textContent = 'TACTICAL BOT WINS!';
          title.style.color = '#a855f7';
        }
      } else {
        if (title) {
          title.textContent = 'PLAYER 2 VICTORIOUS!';
          title.style.color = '#a855f7';
        }
      }
    }

    // Populate Key Match Statistics Grid
    if (statMatchTime) statMatchTime.textContent = this.formatTime(this.game.matchTime || 0);
    if (statMaxRally) statMaxRally.textContent = String(this.game.maxRally || 0);
    if (statP1Power) statP1Power.textContent = this.getTopSpell(this.game.p1PowersUsed);

    if (statP2PowerLabel) {
      statP2PowerLabel.textContent = this.game.oppMode === 'bot' ? 'Bot Top Power' : 'P2 Top Power';
    }
    if (statP2Power) statP2Power.textContent = this.getTopSpell(this.game.p2PowersUsed);

    if (statTopItem) statTopItem.textContent = this.getTopItem(this.game.itemsCollected);

    if (modal) modal.classList.remove('hidden');
  }

  /**
   * Synchronizes HUD display components (Scoreboard, Energy Gauges, Skill Buttons).
   * @returns {void}
   */
  updateHUD() {
    // 1. Update HTML Scoreboard
    if (this.scoreP1El) this.scoreP1El.textContent = String(this.game.scoreP1);
    if (this.scoreP2El) this.scoreP2El.textContent = String(this.game.scoreP2);

    // 2. Update Side Energy Columns
    const p1Pct = Math.min(100, Math.max(0, this.game.paddle1.energy));
    const p2Pct = Math.min(100, Math.max(0, this.game.paddle2.energy));

    if (this.p1EnergyFillEl) this.p1EnergyFillEl.style.height = `${p1Pct}%`;
    if (this.p1EnergyValEl) this.p1EnergyValEl.textContent = `${Math.floor(p1Pct)}%`;

    if (this.p2EnergyFillEl) this.p2EnergyFillEl.style.height = `${p2Pct}%`;
    if (this.p2EnergyValEl) this.p2EnergyValEl.textContent = `${Math.floor(p2Pct)}%`;

    // 3. Update Skill Button States
    const p1 = this.game.paddle1;
    const powers = ['fireball', 'freeze', 'multiball', 'shield'];

    powers.forEach((p) => {
      const btn = document.getElementById(`btn-power-${p}`);
      if (btn) {
        const canAfford = p1.energy >= this.game.powerCosts[p];
        btn.classList.toggle('ready', canAfford);
        btn.classList.toggle('not-ready', !canAfford);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.UIManager = UIManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
