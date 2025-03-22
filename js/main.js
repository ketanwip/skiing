/**
 * Main entry point for the Skiing Survival game
 */

// Main entry point for the skiing game
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game");
    
    try {
        // Check that THREE.js core is loaded
        if (typeof THREE === 'undefined') {
            showError('Three.js library not loaded. Please check your internet connection and try again.');
            return;
        }
        
        // Check that Cannon.js is loaded
        if (typeof CANNON === 'undefined') {
            showError('Cannon.js library not loaded. Please check your internet connection and try again.');
            return;
        }
        
        // Add versions to global scope as a safety measure
        window.SAFE_THREE = { ...THREE };
        window.SAFE_CANNON = { ...CANNON };
        
        // Check for all our custom classes
        const requiredClasses = [
            { name: 'Player', global: false, file: 'js/player.js' },
            { name: 'Terrain', global: false, file: 'js/terrain.js' },
            { name: 'ObstacleManager', global: false, file: 'js/obstacles.js' },
            { name: 'Environment', global: false, file: 'js/environment.js' },
            { name: 'ParticleSystem', global: false, file: 'js/particles.js' },
            { name: 'Physics', global: false, file: 'js/physics.js' }
        ];
        
        const missingClasses = requiredClasses.filter(cls => {
            let exists = false;
            try {
                // Check if class exists in global scope
                exists = cls.global ? (window[cls.name] !== undefined) : 
                    // Try to evaluate the class (this will throw if undefined)
                    eval(`typeof ${cls.name} === 'function'`);
            } catch (e) {
                exists = false;
            }
            return !exists;
        });
        
        if (missingClasses.length > 0) {
            const missingFiles = missingClasses.map(cls => cls.file).join(', ');
            showError(`Missing required game classes. Make sure these files are loaded: ${missingFiles}`);
            return;
        }
        
        // Track missing THREE.js modules but don't block execution
        const missingModules = [];
        
        // Check for required THREE.js modules
        if (typeof THREE.Sky !== 'function') {
            missingModules.push('THREE.Sky');
            console.warn('THREE.Sky module not found - fallback will be used');
        }
        
        if (typeof THREE.EffectComposer !== 'function') {
            missingModules.push('THREE.EffectComposer');
            console.warn('THREE.EffectComposer module not found - post-processing will be disabled');
        }
        
        if (typeof THREE.Lensflare !== 'function') {
            missingModules.push('THREE.Lensflare');
            console.warn('THREE.Lensflare module not found - lens flare effects will be disabled');
        }
        
        if (missingModules.length > 0) {
            console.warn(`Some visual effects will be disabled due to missing modules: ${missingModules.join(', ')}`);
        }
        
        // Load game resources
        loadResources()
            .then(() => {
                try {
                    // Create game instance
                    window.game = new Game();
                    console.log("Game created, ready to start");
                    
                    // Make sure the start screen is visible
                    const startScreen = document.getElementById('start-screen');
                    if (startScreen) {
                        startScreen.style.display = 'flex';
                    }
                } catch (e) {
                    showError(`Error creating game: ${e.message}`);
                    console.error('Game creation error:', e);
                }
            })
            .catch(error => {
                showError(`Failed to initialize game: ${error.message}`);
                console.error('Game initialization error:', error);
            });
    } catch (e) {
        showError(`Unexpected error initializing game environment: ${e.message}`);
        console.error('Fatal initialization error:', e);
    }
});

/**
 * Load any additional resources needed for the game
 * @returns {Promise} A promise that resolves when all resources are loaded
 */
function loadResources() {
    return new Promise((resolve) => {
        console.log("Loading game resources...");
        // In a real game, we would load textures, models, etc. here
        setTimeout(resolve, 100);
    });
}

/**
 * Show an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    console.error(message);
    
    // Update or create error element
    let errorElement = document.getElementById('error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'error-message';
        errorElement.style.position = 'absolute';
        errorElement.style.top = '50%';
        errorElement.style.left = '50%';
        errorElement.style.transform = 'translate(-50%, -50%)';
        errorElement.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
        errorElement.style.color = 'white';
        errorElement.style.padding = '20px';
        errorElement.style.borderRadius = '10px';
        errorElement.style.fontFamily = 'Arial, sans-serif';
        errorElement.style.textAlign = 'center';
        errorElement.style.zIndex = '1000';
        document.body.appendChild(errorElement);
    }
    
    errorElement.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <p>Try refreshing the page or check your internet connection.</p>
    `;
} 