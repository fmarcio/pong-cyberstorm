# Pong: Cyberstorm

A high-octane, neon-drenched cyberpunk reimagining of the classic arcade game. Powered by pure modern web standards, *Pong: Cyberstorm* infuses traditional paddle mechanics with tactical energy spells, collectible court modifiers, predictive trajectory AI, procedural Web Audio sound synthesis, and detailed post-match analytics.

> **Deployed here:** [https://fmarcio.github.io/pong-cyberstorm/](https://fmarcio.github.io/pong-cyberstorm/)

![Pong: Cyberstorm Gameplay Preview](assets/gameplay.gif)

---

## Game Dynamics & Overview

In *Pong: Cyberstorm*, matches are played to a customizable target score (default **7 points**, with presets for **9**, **11**, or custom target up to **99**). Every point is a tense tactical duel fought across a digital court where deflection angles, energy economy, and timely ability execution determine the victor.

### Energy System
Both competitors possess an independent **Energy Capacitor** (ranging from `0%` to `100%`) displayed on side energy columns flanking the court:
- **Passive Generation:** Regenerates constantly at roughly `+2.8%` energy per second.
- **Deflection Bonus:** Successfully striking the ball with your paddle yields an instant `+15%` energy surge.
- **Strategic Deployment:** Energy fuels your tactical spells; managing capacitor levels is essential to counter enemy attacks and mount breakneck offensives.

---

## Tactical Spells (HUD & Hotkeys)

Players can cast four distinct cyber-abilities during active play. Spells can be activated by clicking their respective HUD buttons or via keyboard shortcuts:

| Spell | Icon | Cost | Hotkeys | Description & Strategic Effect |
| :--- | :---: | :---: | :---: | :--- |
| **Fireball** | <img src="assets/icons/fireball.svg" width="18" height="18" alt="Fireball" /> | `35 Energy` | <kbd>1</kbd> / <kbd>Q</kbd> | Accelerates the ball to **2x velocity** in a blaze of red particles directly toward the opponent's goal line. |
| **Crazy Ball** | <img src="assets/icons/crazy-ball.svg" width="18" height="18" alt="Crazy Ball" /> | `60 Energy` | <kbd>2</kbd> / <kbd>W</kbd> | Castable only while the ball is heading toward the opponent (after your hit or a wall ricochet). For **5 seconds** the ball turns into a shimmering rainbow glitch and goes haywire (see below). The chaos persists even if the opponent returns the ball. |
| **Multiball** | <img src="assets/icons/multiball.svg" width="18" height="18" alt="Multiball" /> | `50 Energy` | <kbd>3</kbd> / <kbd>E</kbd> | Clones active balls on the arena, multiplying trajectories and overwhelming opponent defenses. |
| **Force Shield** | <img src="assets/icons/shield.svg" width="18" height="18" alt="Force Shield" /> | `40 Energy` | <kbd>4</kbd> / <kbd>R</kbd> | Deploys a laser barrier behind your paddle that deflects any missed shot, granting a second chance. |

### <img src="assets/icons/crazy-ball.svg" width="20" height="20" alt="Crazy Ball" /> Crazy Ball Behaviors

While active, the ball rolls a new random behavior roughly every second (never the same one twice in a row):

| Behavior | Effect |
| :--- | :--- |
| **Shrink** | Collapses into a tiny, hard-to-track dot. |
| **Grow** | Balloons to double size and pulsates. |
| **Zigzag** | Snakes up and down along its path. |
| **Fake Gravity** | An unreal sideways pull bends the trajectory into a curve. |
| **Stutter** | Freezes mid-air, then dashes forward in bursts. |
| **Blink** | Vanishes completely, then reappears closer to the defender at a new height (always leaving a fair reaction window). |
| **Sticky** | Glues to the next wall or paddle it touches, then fires off at a random angle. |
| **Fake-out** | Pulls sudden vertical U-turns mid-flight. |

The ball never reverses its horizontal direction on its own, and returns to normal size and speed once the 5 seconds expire.

---

## In-Court Collectible Items

Throughout the match, cybernetic item cubes periodically materialize on the court. Driving the ball through an item claims its effect. All items feature **cumulative stacking** and **independent 5-second countdown timers**:

- <img src="assets/icons/item-reduce.svg" width="16" height="16" alt="Reduce" /> **Reduce (Crimson):** Slashes opponent paddle height by `30%` for 5s.
- <img src="assets/icons/item-size-up.svg" width="16" height="16" alt="Size It Up" /> **Size It Up (Emerald):** Expands your paddle height by `+30%` for 5s.
- <img src="assets/icons/item-slow-down.svg" width="16" height="16" alt="Slow Down" /> **Slow Down (Cyan):** Decreases ball velocity by `30%` for 5s, restoring control to frantic rallies.
- <img src="assets/icons/item-energy-boost.svg" width="16" height="16" alt="Energy Boost" /> **Energy Boost (Gold):** Instantly injects `+30%` energy into your capacitor.
- <img src="assets/icons/item-energy-down.svg" width="16" height="16" alt="Energy Down" /> **Energy Down (Purple):** Drains `30%` energy directly from your opponent's capacitor.
- <img src="assets/icons/item-bomb.svg" width="16" height="16" alt="Bomb Hazard" /> **Bomb Hazard (Red-Orange):** Rare anomaly! Ball inflates with warning flashes for 5s before detonating into mini shrapnel balls. Every unreturned shrapnel awards `+1` point to the opponent.
- <img src="assets/icons/item-invisibility.svg" width="16" height="16" alt="Invisibility" /> **Invisibility (Indigo):** Shrouds the ball in stealth cloaking, flickering between normal vision and 20% ghost opacity while travelling toward the enemy.

---

## Interface & HUD

- **Header:** match target badge, match timer, and three buttons: **Settings** (Match Setup), **Options** (Game Options) and **Info** (Rules Codex).
- **Side Energy Bars:** slim capacitor meters flanking the court for each player.
- **Event Feed:** a discreet strip above the powers bar listing the latest power casts, item pickups, shield blocks and bomb detonations as small color-coded chips that fade after a few seconds, keeping the court itself clean.
- **Powers Bar:** clickable buttons for each power, showing cost, hotkeys and whether you can currently afford it.
- **Modals:** every modal can be closed with its **×** button or <kbd>Esc</kbd>. Dismissing Match Setup mid-match returns you to the paused game.

---

## Controls & View Modes

### Control Schemes

| Action | Player 1 (Left) | Player 2 (Right, PvP) |
| :--- | :--- | :--- |
| **Paddle Movement** | **Mouse** (smooth 1:1 tracking) or <kbd>A</kbd> / <kbd>Z</kbd> (arrows also work vs Bot) | Arrow Keys <kbd>↑</kbd> / <kbd>↓</kbd> |
| **Cast Fireball** | <kbd>1</kbd> or <kbd>Q</kbd> | <kbd>7</kbd> |
| **Cast Crazy Ball** | <kbd>2</kbd> or <kbd>W</kbd> | <kbd>8</kbd> |
| **Cast Multiball** | <kbd>3</kbd> or <kbd>E</kbd> | <kbd>9</kbd> |
| **Cast Force Shield** | <kbd>4</kbd> or <kbd>R</kbd> | <kbd>0</kbd> |

### System & Navigation Hotkeys
- <kbd>Space</kbd> or <kbd>P</kbd>: Pause / Resume active match.
- <kbd>R</kbd> (while paused): Restart match directly.
- <kbd>Esc</kbd> or the **×** button: Dismiss open modal dialogues (Match Setup, Game Options, Rules Codex, Match Over).

### Game Options
Opened from the **Options** header button (pauses the match), it groups the quick toggles that can be changed without restarting:
- **View Mode:** Standard or **Theater** (broadens arena framing for an immersive, widescreen experience).
- **Fullscreen:** Expands court presentation to native full display resolution.
- **P1 Control Mode:** Mouse or Keyboard (<kbd>A</kbd> / <kbd>Z</kbd>).
- **Opponent & AI Difficulty:** vs Bot (Easy / Medium / Insane) or 2 Players.
- **Sound:** On or Muted.

---

## Opponent Modes & Tactical AI

- **vs Bot Mode:** Challenge an intelligent AI agent engineered with predictive physics calculations:
  - **Easy:** Relaxed tracking with reaction delays and minor aiming variances.
  - **Medium:** Balanced calculation, solid paddle positioning, and measured spell reactions.
  - **Insane:** Instant predictive pathfinding, angular slice deflections, and aggressive spell usage.
  - On Medium and Insane the bot casts **Crazy Ball** right after returning the ball, and it loses track of a vanished Crazy Ball just like you would.
- **2-Player Local PvP Mode:** Head-to-head competition on the same keyboard or mouse + keyboard combo.

---

## Match Showcase

| Match Setup Modal | In-Game Rules & Codex |
| :---: | :---: |
| ![Match Setup](assets/screenshot-1-setup.png) | ![Rules Codex](assets/screenshot-2-codex.png) |

| Pre-Match Countdown | Crazy Ball in Action |
| :---: | :---: |
| ![Countdown](assets/screenshot-3-countdown.png) | ![Crazy Ball Gameplay](assets/screenshot-4-gameplay.png) |

| Post-Match Analytics & Victory |
| :---: |
| ![Match Stats](assets/screenshot-5-victory.png) |

---

## Tech Stack & Architecture

Built from the ground up prioritizing zero dependencies, fast 60+ FPS execution, and high security standards:

- **Frontend & Rendering:** Pure HTML5 Canvas and CSS3 with custom design tokens, Orbitron & Inter typography, and retro scanline effects.
- **Modular Architecture:** Separation of concerns across dedicated modules:
  - `SoundController.js`: Complete procedural audio synthesizer using the native Web Audio API (oscillators, biquad filters, distortion curves, and exponential gain ramps). Zero external audio files required.
  - `Ball.js`: Physics-based deflection geometry, velocity clamping, trail particle emission, and status effects (Fireball, Crazy Ball chaos state, Bomb, Invisibility).
  - `CourtItem.js`: Procedural item spawning, canvas rendering, collision detection, and stackable effect timers.
  - `TacticalAI.js`: Multi-difficulty predictive ball interceptor and spell-casting intelligence.
  - `UIManager.js`: DOM manipulation, HUD rendering, event feed, modal controls (Match Setup, Game Options, Codex, Match Over), and score updates.
  - `PongGame.js`: Master game loop, state machine, collision resolution, Crazy Ball behavior engine, and lifecycle coordination.
- **Security & Quality Hardened:**
  - **Zero innerHTML:** 100% of UI elements and SVG vector icons are rendered declaratively or via DOM-safe APIs (`classList.toggle`, `textContent`), fully mitigating XSS injection risks.
  - **Strict Content-Security-Policy (CSP):** Locked down against external script injection and unauthorized resource loading.
  - **Type Checking:** Strict JSDoc typing (`// @ts-check`) with explicit typings configured via `globals.d.ts` and `jsconfig.json`.
  - **Zero Build Tools:** Runs instantly in any standard modern web browser without requiring bundlers, transpilers, or node packages.

---

## Getting Started

No build step or dependencies installation required!

1. Clone or download the repository:
   ```bash
   git clone https://github.com/fmarcio/pong-cyberstorm.git
   cd pong-cyberstorm
   ```

2. Open the application:
   - Double click `index.html` in your file explorer, OR
   - Run a lightweight static server:
     ```bash
     # Using Python
     python3 -m http.server 8080

     # Or using Node.js
     npx serve .
     ```
   - Navigate to `http://localhost:8080` in any modern browser (Chrome, Firefox, Edge, Safari).

---

## License

This project is open source and available under the [MIT License](LICENSE).
