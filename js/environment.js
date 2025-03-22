/**
 * Environment class for managing scenery, lighting, sky, and atmospheric effects
 */
class Environment {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Environment components
        this.lights = {};
        this.sky = null;
        this.fog = null;
        this.particles = [];
        
        // Initialize components
        this.setupLighting();
        this.setupSky();
        this.setupFog();
        
        // Add distant mountains
        this.createDistantMountains();
        
        // Add trees and other environment objects
        this.createEnvironmentObjects();
        
        // Add post-processing effects
        this.setupPostProcessing();
    }
    
    setupLighting() {
        // Ambient light (cold blue light)
        const ambientLight = new THREE.AmbientLight(0x6688cc, 0.3);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // Sun directional light
        const sunLight = new THREE.DirectionalLight(0xffffaa, 1.2);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        
        // Configure shadow map
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 500;
        
        // Large area for shadows
        const shadowSize = 150;
        sunLight.shadow.camera.left = -shadowSize;
        sunLight.shadow.camera.right = shadowSize;
        sunLight.shadow.camera.top = shadowSize;
        sunLight.shadow.camera.bottom = -shadowSize;
        
        sunLight.shadow.bias = -0.0005;
        
        this.scene.add(sunLight);
        this.lights.sun = sunLight;
        
        // Add a blue-ish fill light from the opposite side
        const fillLight = new THREE.DirectionalLight(0x8899ff, 0.5);
        fillLight.position.set(-50, 40, -50);
        this.scene.add(fillLight);
        this.lights.fill = fillLight;
    }
    
    setupSky() {
        try {
            // Try to use the THREE.Sky if available
            if (typeof THREE.Sky === 'function') {
                console.log("Using THREE.Sky for sky");
                // Create a sky dome with gradient and sun
                const sky = new THREE.Sky();
                // Mark this as a Sky object explicitly to avoid instanceof issues
                sky.isSky = true;
                sky.scale.setScalar(10000);
                this.scene.add(sky);
                
                const skyUniforms = sky.material.uniforms;
                if (skyUniforms) {
                    skyUniforms['turbidity'].value = 8;
                    skyUniforms['rayleigh'].value = 1.5;
                    skyUniforms['mieCoefficient'].value = 0.005;
                    skyUniforms['mieDirectionalG'].value = 0.8;
                    
                    // Sun position
                    const sunPosition = new THREE.Vector3(0, 0.3, -1);
                    sunPosition.normalize();
                    skyUniforms['sunPosition'].value.copy(sunPosition);
                    
                    this.sky = sky;
                    
                    // Add sun lens flare
                    this.addSunLensFlare(sunPosition);
                } else {
                    console.warn("Sky uniforms not available, using fallback");
                    this.createFallbackSky();
                }
            } else {
                console.log("THREE.Sky not available, using fallback sky");
                this.createFallbackSky();
            }
        } catch (e) {
            console.error("Error setting up sky:", e);
            // Create a solid color background as a last resort
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        }
    }
    
    createFallbackSky() {
        // Fallback to a simple sky dome with gradient
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `;
        
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        };
        
        const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.isSky = false; // Mark this as not a THREE.Sky object
        this.scene.add(sky);
        this.sky = sky;
        
        // Add a simple sun
        const sunPosition = new THREE.Vector3(0, 0.3, -1).normalize();
        const sunGeometry = new THREE.SphereGeometry(20, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        
        sun.position.set(
            sunPosition.x * 3000,
            sunPosition.y * 3000,
            sunPosition.z * 3000
        );
        
        this.scene.add(sun);
    }
    
    addSunLensFlare(sunPosition) {
        try {
            // Check if Lensflare is available
            if (typeof THREE.Lensflare !== 'function') {
                console.warn("THREE.Lensflare not available, skipping lens flare effects");
                return;
            }
            
            // Create lens flare texture
            const textureLoader = new THREE.TextureLoader();
            const textureFlare0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
            const textureFlare3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');
            
            const lensflare = new THREE.Lensflare();
            lensflare.addElement(new THREE.LensflareElement(textureFlare0, 700, 0, this.lights.sun.color));
            lensflare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.6));
            lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
            lensflare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.9));
            lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 1.0));
            
            this.lights.sun.add(lensflare);
        } catch (e) {
            console.error("Error adding lens flare:", e);
        }
    }
    
    setupFog() {
        // Add fog for atmosphere and to hide distant terrain clipping
        const fogColor = new THREE.Color(0xaaccff);
        const fog = new THREE.FogExp2(fogColor, 0.0025);
        this.scene.fog = fog;
        this.fog = fog;
    }
    
    createDistantMountains() {
        try {
            // Create distant mountains as a skybox/background
            const mountainGeometry = new THREE.PlaneGeometry(2000, 500, 32, 32);
            
            // Add some height variation to create mountain silhouettes
            const vertices = mountainGeometry.attributes.position.array;
            
            // Create a simple noise function if the noise library isn't available
            const simplex2 = (x, y) => {
                if (typeof noise !== 'undefined' && noise.simplex2) {
                    return noise.simplex2(x, y);
                } else {
                    // Fallback to simple pseudo-random noise
                    return Math.sin(x * 10) * Math.cos(y * 10) * 0.5;
                }
            };
            
            for (let i = 0; i < vertices.length; i += 3) {
                // Only modify y values of upper part of the plane
                if (vertices[i + 1] > 0) {
                    const x = vertices[i];
                    
                    // Create mountain silhouette using noise
                    const mountainHeight = (simplex2(x * 0.002, 0) * 0.5 + 0.5) * 150;
                    vertices[i + 1] = mountainHeight * (vertices[i + 1] / 250);
                }
            }
            
            mountainGeometry.computeVertexNormals();
            
            // Create a gradient material for the mountains
            const mountainMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new THREE.Color(0xffffff) },
                    bottomColor: { value: new THREE.Color(0x8899cc) },
                    offset: { value: 50 },
                    exponent: { value: 0.6 }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 topColor;
                    uniform vec3 bottomColor;
                    uniform float offset;
                    uniform float exponent;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition + offset).y;
                        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(h, exponent), 0.0)), 1.0);
                    }
                `,
                side: THREE.DoubleSide
            });
            
            const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountains.position.z = -800;
            mountains.position.y = 50;
            mountains.rotation.x = Math.PI / 8;
            this.scene.add(mountains);
        } catch (e) {
            console.error("Error creating distant mountains:", e);
        }
    }
    
    createEnvironmentObjects() {
        // Add scattered trees and rocks in the distance
        // (Will be implemented if needed - objects closer to the track
        // will be handled by the obstacle manager)
    }
    
    setupPostProcessing() {
        try {
            // Check if post-processing is available
            if (typeof THREE.EffectComposer !== 'function') {
                console.warn("THREE.EffectComposer not available, skipping post-processing effects");
                this.usePostProcessing = false;
                return;
            }
            
            // Defer post-processing setup until we have a camera
            // We'll initialize it later from the game's renderGame method
            this.usePostProcessing = false;
            this.postProcessingInitialized = false;
            console.log("Post-processing setup deferred until camera is available");
        } catch (e) {
            console.error("Error setting up post-processing:", e);
            this.usePostProcessing = false;
        }
    }
    
    initPostProcessing(camera) {
        if (this.postProcessingInitialized) return;
        
        try {
            console.log("Initializing post-processing with camera");
            
            if (!camera) {
                console.warn("Camera not available for post-processing");
                return;
            }
            
            // Store camera reference
            this.camera = camera;
            
            // Create composer
            this.composer = new THREE.EffectComposer(this.renderer);
            this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
            
            // Add bloom effect for the sun and bright snow
            if (typeof THREE.UnrealBloomPass === 'function') {
                const bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    0.5,    // strength
                    0.4,    // radius
                    0.85    // threshold
                );
                this.composer.addPass(bloomPass);
            }
            
            this.usePostProcessing = true;
            this.postProcessingInitialized = true;
            console.log("Post-processing initialized successfully");
        } catch (e) {
            console.error("Error initializing post-processing:", e);
            this.usePostProcessing = false;
        }
    }
    
    update(deltaTime, playerPosition) {
        // Update sky and lighting based on time
        this.updateSky(deltaTime);
        
        // Update fog based on player position
        this.updateFog(playerPosition);
        
        // Update particle effects
        this.updateParticles(deltaTime, playerPosition);
    }
    
    updateSky(deltaTime) {
        // Subtle sky changes over time
        const time = Date.now() * 0.0001;
        
        if (this.sky) {
            // Check if this is the THREE.Sky implementation or our custom sky
            if (this.sky.isSky) {  // THREE.Sky sets this property
                // Update sky uniforms for THREE.Sky
                const skyUniforms = this.sky.material.uniforms;
                if (skyUniforms) {
                    skyUniforms['turbidity'].value = 8 + Math.sin(time) * 0.5;
                    skyUniforms['rayleigh'].value = 1.5 + Math.sin(time * 2) * 0.1;
                }
            } else if (this.sky.material && this.sky.material.uniforms) {
                // Update our custom sky shader
                const skyUniforms = this.sky.material.uniforms;
                // Subtle color shifts over time for the custom sky
                const blueShift = Math.sin(time) * 0.05;
                skyUniforms.topColor.value.setRGB(0.0, 0.6 + blueShift, 1.0);
                skyUniforms.bottomColor.value.setRGB(1.0, 1.0, 1.0 - blueShift * 2);
            }
        }
    }
    
    updateFog(playerPosition) {
        // Adjust fog density based on player speed and height
    }
    
    updateParticles(deltaTime, playerPosition) {
        // Update snow and wind particles
    }
}