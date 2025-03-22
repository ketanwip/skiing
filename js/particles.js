/**
 * Particle systems for snow, wind, and skiing effects
 */
class ParticleSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Particle collections
        this.snowfall = null;
        this.snowSpray = null;
        this.skiTrail = null;
        
        // Initialize particle systems
        this.initSnowfall();
        this.initSnowSpray();
        this.initSkiTrail();
    }
    
    initSnowfall() {
        // Create a particle system for ambient snowfall
        const snowGeometry = new THREE.BufferGeometry();
        const snowCount = 5000;
        
        // Create positions for the snowflakes
        const positions = new Float32Array(snowCount * 3);
        const velocities = new Float32Array(snowCount * 3);
        const sizes = new Float32Array(snowCount);
        
        const boxSize = 500;
        const boxHeight = 200;
        
        for (let i = 0; i < snowCount; i++) {
            // Random position within a box surrounding the player
            positions[i * 3] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 1] = Math.random() * boxHeight;
            positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
            
            // Random velocity with slight downward drift
            velocities[i * 3] = (Math.random() - 0.5) * 2;   // x
            velocities[i * 3 + 1] = -1 - Math.random() * 2;  // y (downward)
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 2; // z
            
            // Random snowflake size
            sizes[i] = 1 + Math.random() * 2;
        }
        
        snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        snowGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        snowGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create snow texture
        const snowTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/snowflake1.png');
        
        // Use a custom shader material for the snow
        const snowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xffffff) },
                pointTexture: { value: snowTexture },
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                uniform float time;
                
                void main() {
                    vec3 pos = position;
                    
                    // Simple physics - apply velocity over time
                    pos.x += velocity.x * time;
                    pos.y += velocity.y * time;
                    pos.z += velocity.z * time;
                    
                    // Wrap around the box when particles leave it
                    if (pos.y < 0.0) pos.y = 200.0;
                    if (pos.x < -250.0) pos.x += 500.0;
                    if (pos.x > 250.0) pos.x -= 500.0;
                    if (pos.z < -250.0) pos.z += 500.0;
                    if (pos.z > 250.0) pos.z -= 500.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    
                    // Set point size based on the perspective and the particle size
                    gl_PointSize = size * (300.0 / length(mvPosition.xyz));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform sampler2D pointTexture;
                
                void main() {
                    // Sample the texture
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    
                    // Discard pixels below the alpha threshold
                    if (texColor.a < 0.3) discard;
                    
                    // Return the color with the sampled alpha
                    gl_FragColor = vec4(color, texColor.a);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            transparent: true
        });
        
        this.snowfall = new THREE.Points(snowGeometry, snowMaterial);
        this.scene.add(this.snowfall);
    }
    
    initSnowSpray() {
        // Create a particle system for snow spray when skiing
        const sprayGeometry = new THREE.BufferGeometry();
        const sprayCount = 1000;
        
        // Create arrays for positions and other attributes
        const positions = new Float32Array(sprayCount * 3);
        const velocities = new Float32Array(sprayCount * 3);
        const sizes = new Float32Array(sprayCount);
        const lifetimes = new Float32Array(sprayCount);
        const seeds = new Float32Array(sprayCount);
        
        // Initialize particle attributes
        for (let i = 0; i < sprayCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] = 0;
            
            sizes[i] = 0;
            lifetimes[i] = 0;
            seeds[i] = Math.random(); // Random seed for variation
        }
        
        sprayGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sprayGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        sprayGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        sprayGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        sprayGeometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
        
        // Snow spray material
        const sprayMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xffffff) },
                pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/snowflake2.png') },
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                attribute float lifetime;
                attribute float seed;
                
                uniform float time;
                
                varying float vAlpha;
                
                void main() {
                    if (lifetime <= 0.0) {
                        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
                        gl_PointSize = 0.0;
                        vAlpha = 0.0;
                        return;
                    }
                    
                    // Calculate lifetime ratio (1.0 = new, 0.0 = dead)
                    float lifeRatio = lifetime / 2.0;
                    
                    // Apply physics
                    vec3 pos = position + velocity * (2.0 - lifetime) * 0.5;
                    
                    // Add some turbulence based on seed
                    float turbulence = sin(time * 5.0 + seed * 10.0) * 0.1;
                    pos.x += turbulence;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    
                    // Fade out as lifetime decreases
                    vAlpha = lifeRatio;
                    
                    // Size based on perspective and lifetime
                    gl_PointSize = size * lifeRatio * (300.0 / length(mvPosition.xyz));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform sampler2D pointTexture;
                
                varying float vAlpha;
                
                void main() {
                    // Sample the texture
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    
                    // Discard pixels below the alpha threshold
                    if (texColor.a < 0.3) discard;
                    
                    // Return the color with the sampled alpha and lifetime fade
                    gl_FragColor = vec4(color, texColor.a * vAlpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            transparent: true
        });
        
        this.snowSpray = new THREE.Points(sprayGeometry, sprayMaterial);
        this.scene.add(this.snowSpray);
    }
    
    initSkiTrail() {
        // Create a trail effect behind the skis
        // We'll use a line with fading points for each ski
        
        const maxTrailPoints = 100;
        
        // Left ski trail
        const leftTrailGeometry = new THREE.BufferGeometry();
        const leftTrailPositions = new Float32Array(maxTrailPoints * 3);
        leftTrailGeometry.setAttribute('position', new THREE.BufferAttribute(leftTrailPositions, 3));
        
        const leftTrailMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.5,
            transparent: true,
            linewidth: 1
        });
        
        this.leftTrail = new THREE.Line(leftTrailGeometry, leftTrailMaterial);
        this.scene.add(this.leftTrail);
        
        // Right ski trail
        const rightTrailGeometry = new THREE.BufferGeometry();
        const rightTrailPositions = new Float32Array(maxTrailPoints * 3);
        rightTrailGeometry.setAttribute('position', new THREE.BufferAttribute(rightTrailPositions, 3));
        
        const rightTrailMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.5,
            transparent: true,
            linewidth: 1
        });
        
        this.rightTrail = new THREE.Line(rightTrailGeometry, rightTrailMaterial);
        this.scene.add(this.rightTrail);
        
        // Keep track of current trail points
        this.leftTrailPoints = [];
        this.rightTrailPoints = [];
    }
    
    update(deltaTime) {
        this.updateSnowfall(deltaTime);
        this.updateSnowSpray(deltaTime);
        this.updateSkiTrail(deltaTime);
    }
    
    updateSnowfall(deltaTime) {
        if (!this.snowfall) return;
        
        // Update time uniform for the snow shader
        this.snowfall.material.uniforms.time.value += deltaTime;
        
        // Follow the player
        if (this.player && this.player.getPosition) {
            const playerPos = this.player.getPosition();
            this.snowfall.position.x = playerPos.x;
            this.snowfall.position.z = playerPos.z;
        }
    }
    
    updateSnowSpray(deltaTime) {
        if (!this.snowSpray) return;
        
        // Get player position and velocity
        if (!this.player || !this.player.getPosition) return;
        
        const playerPos = this.player.getPosition();
        const playerSpeed = this.player.speed || 0;
        const isGrounded = this.player.isGrounded || false;
        
        // Only emit spray particles when the player is moving and on the ground
        const shouldEmit = playerSpeed > 10 && isGrounded;
        
        // Update spray particles
        const positions = this.snowSpray.geometry.attributes.position.array;
        const velocities = this.snowSpray.geometry.attributes.velocity.array;
        const sizes = this.snowSpray.geometry.attributes.size.array;
        const lifetimes = this.snowSpray.geometry.attributes.lifetime.array;
        const seeds = this.snowSpray.geometry.attributes.seed.array;
        
        const particleCount = positions.length / 3;
        
        // Number of particles to emit per frame (based on speed)
        const emitCount = shouldEmit ? Math.floor(playerSpeed / 20) : 0;
        
        // Update existing particles
        for (let i = 0; i < particleCount; i++) {
            // Decrease lifetime
            lifetimes[i] -= deltaTime;
            
            // If the particle is dead and we should emit new ones
            if (lifetimes[i] <= 0 && i < emitCount) {
                // Reset particle at player's position with randomized offset
                const offsetX = (Math.random() - 0.5) * 1;
                const offsetY = (Math.random() - 0.5) * 0.2;
                
                positions[i * 3] = playerPos.x + offsetX;
                positions[i * 3 + 1] = playerPos.y + offsetY;
                positions[i * 3 + 2] = playerPos.z;
                
                // Set velocity based on player direction with some randomness
                const speedFactor = playerSpeed / 50;
                velocities[i * 3] = (Math.random() - 0.5) * 5 * speedFactor;  // x
                velocities[i * 3 + 1] = 2 + Math.random() * 3 * speedFactor;  // y
                velocities[i * 3 + 2] = Math.random() * 3 * speedFactor;      // z
                
                // Set size based on speed
                sizes[i] = 1 + Math.random() * 2 * (speedFactor);
                
                // Reset lifetime
                lifetimes[i] = 1 + Math.random();
                
                // New random seed
                seeds[i] = Math.random();
            }
        }
        
        // Update attributes
        this.snowSpray.geometry.attributes.position.needsUpdate = true;
        this.snowSpray.geometry.attributes.lifetime.needsUpdate = true;
        this.snowSpray.material.uniforms.time.value += deltaTime;
    }
    
    updateSkiTrail(deltaTime) {
        if (!this.leftTrail || !this.rightTrail) return;
        
        // Get player position
        if (!this.player || !this.player.getPosition) return;
        
        const playerPos = this.player.getPosition();
        const isGrounded = this.player.isGrounded || false;
        
        // Only update trail when on the ground
        if (!isGrounded) return;
        
        // Calculate ski positions (offset from player position)
        const leftSkiPos = new THREE.Vector3(
            playerPos.x - 0.3,
            playerPos.y - 0.2,
            playerPos.z
        );
        
        const rightSkiPos = new THREE.Vector3(
            playerPos.x + 0.3,
            playerPos.y - 0.2,
            playerPos.z
        );
        
        // Add point to the trails if we've moved enough
        const minDistance = 1.0; // Minimum distance between trail points
        
        // Update left trail
        if (this.leftTrailPoints.length === 0 || 
            leftSkiPos.distanceTo(this.leftTrailPoints[this.leftTrailPoints.length - 1]) > minDistance) {
            
            this.leftTrailPoints.push(leftSkiPos.clone());
            
            // Limit the trail length
            if (this.leftTrailPoints.length > 100) {
                this.leftTrailPoints.shift();
            }
            
            // Update the trail geometry
            const positions = this.leftTrail.geometry.attributes.position.array;
            
            for (let i = 0; i < this.leftTrailPoints.length; i++) {
                const point = this.leftTrailPoints[i];
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            
            // Update the number of points in the line
            this.leftTrail.geometry.setDrawRange(0, this.leftTrailPoints.length);
            this.leftTrail.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update right trail
        if (this.rightTrailPoints.length === 0 || 
            rightSkiPos.distanceTo(this.rightTrailPoints[this.rightTrailPoints.length - 1]) > minDistance) {
            
            this.rightTrailPoints.push(rightSkiPos.clone());
            
            // Limit the trail length
            if (this.rightTrailPoints.length > 100) {
                this.rightTrailPoints.shift();
            }
            
            // Update the trail geometry
            const positions = this.rightTrail.geometry.attributes.position.array;
            
            for (let i = 0; i < this.rightTrailPoints.length; i++) {
                const point = this.rightTrailPoints[i];
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            
            // Update the number of points in the line
            this.rightTrail.geometry.setDrawRange(0, this.rightTrailPoints.length);
            this.rightTrail.geometry.attributes.position.needsUpdate = true;
        }
        
        // Fade out the oldest parts of the trail
        const fadeSpeed = 0.05;
        this.leftTrail.material.opacity -= fadeSpeed * deltaTime;
        this.rightTrail.material.opacity -= fadeSpeed * deltaTime;
        
        if (this.leftTrail.material.opacity < 0.1) {
            this.leftTrail.material.opacity = 0.5;
            this.leftTrailPoints = [];
            this.leftTrail.geometry.setDrawRange(0, 0);
        }
        
        if (this.rightTrail.material.opacity < 0.1) {
            this.rightTrail.material.opacity = 0.5;
            this.rightTrailPoints = [];
            this.rightTrail.geometry.setDrawRange(0, 0);
        }
    }
    
    createSnowExplosion(position, size = 1.0) {
        // Create a one-time snow explosion (for crashes, jumps, etc)
        const explosionGeometry = new THREE.BufferGeometry();
        const particleCount = 100;
        
        // Create particle attributes
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const lifetimes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Set initial position at the explosion center
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Random velocity outward from center
            const angle = Math.random() * Math.PI * 2;
            const upwardBias = Math.random() * 0.5 + 0.5; // 0.5 - 1.0
            const speed = 2 + Math.random() * 4;
            
            velocities[i * 3] = Math.cos(angle) * speed;
            velocities[i * 3 + 1] = upwardBias * speed;
            velocities[i * 3 + 2] = Math.sin(angle) * speed;
            
            // Random size for particles
            sizes[i] = (0.5 + Math.random() * 1.5) * size;
            
            // Random lifetime
            lifetimes[i] = 1.0 + Math.random();
        }
        
        explosionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        explosionGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        explosionGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        explosionGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        // Material for explosion particles
        const explosionMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xffffff) },
                pointTexture: { value: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/snowflake2.png') },
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                attribute float lifetime;
                
                uniform float time;
                
                varying float vAlpha;
                
                void main() {
                    // Apply physics over time
                    vec3 pos = position + velocity * time;
                    
                    // Add gravity effect
                    pos.y += -4.9 * time * time;
                    
                    // Calculate remaining lifetime (1.0 = new, 0.0 = dead)
                    float lifeLeft = max(0.0, lifetime - time);
                    float lifeRatio = lifeLeft / lifetime;
                    
                    // Gradually fade out
                    vAlpha = lifeRatio * lifeRatio;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    
                    // Size based on perspective, lifetime and initial size
                    gl_PointSize = size * lifeRatio * (300.0 / length(mvPosition.xyz));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform sampler2D pointTexture;
                
                varying float vAlpha;
                
                void main() {
                    // Sample the texture
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    
                    // Discard pixels below the alpha threshold
                    if (texColor.a < 0.3) discard;
                    
                    // Return the color with the sampled alpha and lifetime fade
                    gl_FragColor = vec4(color, texColor.a * vAlpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            transparent: true
        });
        
        // Create the explosion particle system
        const explosion = new THREE.Points(explosionGeometry, explosionMaterial);
        this.scene.add(explosion);
        
        // Animation loop for the explosion
        const clock = new THREE.Clock();
        clock.start();
        
        const updateExplosion = () => {
            const time = clock.getElapsedTime();
            explosion.material.uniforms.time.value = time;
            
            // Remove the explosion after it's done
            if (time > 2.0) {
                this.scene.remove(explosion);
                return;
            }
            
            requestAnimationFrame(updateExplosion);
        };
        
        updateExplosion();
    }
} 