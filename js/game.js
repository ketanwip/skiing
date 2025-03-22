/**
 * Main game class for managing the skiing game
 */
class Game {
    constructor() {
        // Game state
        this.isInitialized = false;
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        
        // Time tracking
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        
        // Core Three.js components
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        
        // Game components
        this.physics = null;
        this.player = null;
        this.terrain = null;
        this.obstacles = null;
        this.environment = null;
        this.particles = null;
        
        // UI elements
        this.uiContainer = document.getElementById('ui-container');
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.startScreen = document.getElementById('start-screen');
        
        // Debug mode
        this.debugMode = false;
        
        // Event listeners
        this.setupEventListeners();
    }
    
    init() {
        try {
            if (this.isInitialized) return;
            
            console.log("Initializing renderer");
            // Initialize Three.js renderer
            this.initRenderer();
            
            console.log("Creating scene");
            // Create scene
            this.scene = new THREE.Scene();
            
            console.log("Creating camera");
            // Create camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
            
            console.log("Initializing components");
            // Initialize game components
            try {
                console.log("Creating physics");
                this.physics = new Physics();
            } catch (e) {
                console.error("Error creating physics:", e);
                throw e;
            }
            
            try {
                console.log("Creating terrain");
                this.terrain = new Terrain(this.scene, this.physics);
            } catch (e) {
                console.error("Error creating terrain:", e);
                throw e;
            }
            
            try {
                console.log("Creating player");
                this.player = new Player(this.scene, this.camera, this.physics);
            } catch (e) {
                console.error("Error creating player:", e);
                throw e;
            }
            
            try {
                console.log("Creating obstacles");
                this.obstacles = new ObstacleManager(this.scene, this.physics);
            } catch (e) {
                console.error("Error creating obstacles:", e);
                throw e;
            }
            
            try {
                console.log("Creating environment");
                this.environment = new Environment(this.scene, this.renderer);
            } catch (e) {
                console.error("Error creating environment:", e);
                throw e;
            }
            
            try {
                console.log("Creating particles");
                this.particles = new ParticleSystem(this.scene, this.player);
            } catch (e) {
                console.error("Error creating particles:", e);
                throw e;
            }
            
            // Add event listeners for window resize
            window.addEventListener('resize', this.onWindowResize.bind(this), false);
            
            // Game is now initialized
            this.isInitialized = true;
            console.log("Game initialized successfully");
        } catch (e) {
            console.error("Error during initialization:", e);
            alert("Error initializing game: " + e.message);
        }
    }
    
    initRenderer() {
        try {
            // Create the WebGL renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                powerPreference: "high-performance" 
            });
            
            // Configure renderer
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            
            // Clear the container first
            const container = document.getElementById('game-container');
            while (container.firstChild) {
                if (container.firstChild.id !== 'ui-container' && 
                    container.firstChild.id !== 'game-over' && 
                    container.firstChild.id !== 'start-screen') {
                    container.removeChild(container.firstChild);
                } else {
                    break;
                }
            }
            
            // Add the canvas to the DOM
            this.renderer.domElement.style.position = 'absolute';
            this.renderer.domElement.style.top = '0';
            this.renderer.domElement.style.left = '0';
            this.renderer.domElement.style.zIndex = '0';
            container.insertBefore(this.renderer.domElement, container.firstChild);
            
            console.log("Renderer initialized successfully");
        } catch (e) {
            console.error("Error initializing renderer:", e);
            alert(`Error initializing renderer: ${e.message}`);
            throw e;
        }
    }
    
    setupEventListeners() {
        // Game event listeners
        document.addEventListener('player-died', this.onPlayerDied.bind(this));
        
        // UI event listeners
        const restartButton = document.getElementById('restart-btn');
        if (restartButton) {
            restartButton.addEventListener('click', this.restartGame.bind(this));
        }
        
        const startButton = document.getElementById('start-btn');
        if (startButton) {
            startButton.addEventListener('click', this.startGame.bind(this));
        }
        
        // Debug toggle (press 'P')
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyP') {
                this.toggleDebugMode();
            } else if (event.code === 'Escape') {
                this.togglePause();
            }
        });
    }
    
    startGame() {
        console.log("Start game button clicked");
        // Initialize if not already done
        if (!this.isInitialized) {
            console.log("Initializing game");
            this.init();
        }
        
        // Reset game state
        console.log("Resetting game state");
        this.resetGame();
        
        // Hide start screen
        if (this.startScreen) {
            console.log("Hiding start screen");
            this.startScreen.style.display = 'none';
        }
        
        // Start game loop
        console.log("Starting game loop");
        this.isRunning = true;
        this.isPaused = false;
        this.clock.start();
        this.animate();
    }
    
    resetGame() {
        // Reset score
        this.score = 0;
        this.updateScoreDisplay();
        
        // Reset game components
        if (this.player) this.player.reset();
        if (this.obstacles) this.obstacles.reset();
        if (this.terrain) {
            // Recreate terrain to start fresh
            this.scene.remove(this.terrain);
            this.terrain = new Terrain(this.scene, this.physics);
        }
        
        // Hide game over screen
        if (this.gameOverElement) {
            this.gameOverElement.style.display = 'none';
        }
    }
    
    restartGame() {
        // Hide game over screen
        if (this.gameOverElement) {
            this.gameOverElement.style.display = 'none';
        }
        
        // Start a new game
        this.startGame();
    }
    
    stopGame() {
        this.isRunning = false;
    }
    
    togglePause() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Pause the clock
            this.clock.stop();
            
            // Show pause message
            // (Could add a pause UI here)
        } else {
            // Resume the clock
            this.clock.start();
        }
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            // Enable physics debug visualization
            this.physics.enableDebug(this.scene);
        } else {
            // Disable physics debug visualization
            this.physics.disableDebug();
        }
    }
    
    animate() {
        try {
            // Stop animation loop if the game is not running
            if (!this.isRunning) return;
            
            // Request next frame
            requestAnimationFrame(this.animate.bind(this));
            
            // Skip update if paused
            if (this.isPaused) return;
            
            // Calculate delta time
            const elapsedTime = this.clock.getElapsedTime();
            const deltaTime = elapsedTime - this.lastTime;
            this.lastTime = elapsedTime;
            
            // Cap delta time to prevent large jumps after tab switch
            const cappedDelta = Math.min(deltaTime, 0.1);
            
            // Update game state
            this.updateGame(cappedDelta);
            
            // Render the scene
            this.renderGame();
        } catch (e) {
            console.error("Error in animation loop:", e);
            // Stop the game loop if there's an error
            this.isRunning = false;
            alert(`Game error: ${e.message}. Please refresh the page.`);
        }
    }
    
    updateGame(deltaTime) {
        // Update physics
        this.physics.update(deltaTime);
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // Update terrain based on player position
        if (this.terrain && this.player) {
            this.terrain.update(this.player.getPosition());
        }
        
        // Update obstacles
        if (this.obstacles && this.player) {
            this.obstacles.update(this.player.getPosition(), deltaTime);
            
            // Check for collisions with obstacles
            if (!this.player.isDead) {
                this.checkObstacleCollisions();
            }
        }
        
        // Update environment
        if (this.environment && this.player) {
            this.environment.update(deltaTime, this.player.getPosition());
        }
        
        // Update particles
        if (this.particles) {
            this.particles.update(deltaTime);
        }
        
        // Update score based on obstacles avoided
        if (this.obstacles && !this.player.isDead) {
            this.score = this.obstacles.getObstaclesAvoided();
            this.updateScoreDisplay();
        }
    }
    
    renderGame() {
        // Initialize post-processing if it hasn't been done yet
        if (this.environment && !this.environment.postProcessingInitialized && this.camera) {
            try {
                this.environment.initPostProcessing(this.camera);
            } catch (e) {
                console.error("Error initializing post-processing:", e);
            }
        }
        
        // If post-processing is enabled, use the composer
        if (this.environment && this.environment.usePostProcessing && this.environment.composer) {
            try {
                this.environment.composer.render();
            } catch (e) {
                console.error("Error rendering with post-processing:", e);
                // Fallback to standard rendering
                this.renderer.render(this.scene, this.camera);
                // Disable post-processing to prevent future errors
                this.environment.usePostProcessing = false;
            }
        } else {
            // Standard rendering
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    checkObstacleCollisions() {
        // Check for collisions between player and obstacles
        for (const obstacle of this.obstacles.activeObstacles) {
            if (this.player.checkObstacleCollision(obstacle)) {
                // Generate a snow explosion at the collision point
                if (this.particles) {
                    this.particles.createSnowExplosion(
                        new THREE.Vector3(
                            obstacle.position.x,
                            obstacle.position.y + 1,
                            obstacle.position.z
                        ),
                        2.0
                    );
                }
                break;
            }
        }
    }
    
    onPlayerDied() {
        // Show game over screen
        if (this.gameOverElement) {
            this.gameOverElement.style.display = 'block';
        }
        
        // Update final score
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = this.score.toString();
        }
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer size if it exists
        if (this.environment && this.environment.composer) {
            this.environment.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    updateScoreDisplay() {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
    }
} 