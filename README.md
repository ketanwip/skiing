# Skiing Survival

A first-person skiing game built with Three.js and Cannon.js, where you race down an icy mountain avoiding obstacles.

## Game Features

- First-person skiing experience with realistic physics
- Beautiful snow-covered mountain terrain that generates procedurally as you ski
- Various obstacles to avoid (trees, rocks, ice spikes, log piles)
- Particle effects for snow, ski trails, and collisions
- Dynamic lighting and environmental effects
- Score tracking based on obstacles avoided
- Increasing difficulty as you progress

## How to Play

1. Open `index.html` in a modern web browser. The game should run smoothly in Chrome, Firefox, or Edge.
2. Click "Start Game" on the start screen.
3. Use the `A` and `D` keys to move left and right.
4. Press `Space` to jump (can be used to jump over smaller obstacles).
5. Avoid obstacles as long as possible while skiing down the mountain.
6. Your score increases with each obstacle you successfully avoid.
7. Press `ESC` to pause the game.
8. Press `P` to toggle physics debug mode (for development purposes).

## Game Objective

Ski down the mountain for as long as possible while avoiding all obstacles in your path. The game speed increases gradually, making it more challenging as you progress. Your score is determined by the number of obstacles you successfully avoid.

## Technical Details

This game is built using the following technologies:

- **Three.js**: A WebGL-based 3D graphics library for creating and displaying 3D content in a web browser.
- **Cannon.js**: A physics engine for simulating rigid body physics in 3D environments.
- **JavaScript (ES6+)**: Modern JavaScript for game logic and interactivity.
- **HTML5 & CSS3**: For the user interface and styling.

The game architecture is split into multiple modules:

- `main.js`: Entry point and resource loading
- `game.js`: Main game loop and state management
- `terrain.js`: Procedural terrain generation and management
- `player.js`: Player character, controls, and physics
- `obstacles.js`: Obstacle generation and management
- `environment.js`: Scenery, lighting, and atmospheric effects
- `particles.js`: Snow and particle effects
- `physics.js`: Physics simulation and debug utilities
- `utils.js`: Helper functions and utilities

## Performance Tips

If the game runs slowly on your computer, try the following:

1. Close other browser tabs and applications
2. Lower your browser window size
3. Use a device with a dedicated graphics card

## Credits

This game was created as a demonstration of 3D web game development using Three.js and Cannon.js.

All code and assets are original or sourced from free/public domain libraries.

## License

This project is released under the MIT License. 