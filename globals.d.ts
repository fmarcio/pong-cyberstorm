// Global type declarations for scripts loaded via HTML script tags in browser

type Ball = import('./src/entities/Ball.js');
declare var Ball: typeof import('./src/entities/Ball.js');

type CourtItem = import('./src/entities/CourtItem.js');
declare var CourtItem: typeof import('./src/entities/CourtItem.js');

type Particle = import('./src/entities/Particle.js');
declare var Particle: typeof import('./src/entities/Particle.js');

type SoundController = import('./src/core/SoundController.js');
declare var SoundController: typeof import('./src/core/SoundController.js');

type TacticalAI = import('./src/ai/TacticalAI.js');
declare var TacticalAI: typeof import('./src/ai/TacticalAI.js');

type UIManager = import('./src/ui/UIManager.js');
declare var UIManager: typeof import('./src/ui/UIManager.js');

type PongGame = import('./src/core/PongGame.js');
declare var PongGame: typeof import('./src/core/PongGame.js');
