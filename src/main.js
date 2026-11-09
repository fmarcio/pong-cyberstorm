// @ts-check

/**
 * PONG: CYBERSTORM - Application Bootstrap
 * Initializes the game instance once the DOM is fully loaded.
 */
window.addEventListener('DOMContentLoaded', () => {
  // @ts-ignore
  window.gameInstance = new PongGame();
});
