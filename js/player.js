/**
 * Player class for handling the skier character, physics, and controls
 */
class Player {
    constructor(scene, camera, physics) {
        this.scene = scene;
        this.camera = camera;
        this.physics = physics;
        
        // Player stats
        this.speed = 0;
        this.maxSpeed = 300;
        this.initialSpeed = 50;
        this.acceleration = 0.2;
        this.lateralSpeed = 80;
        this.jumpForce = 15;
        this.health = 100;
        this.isDead = false;
        
        // Control state
        this.moveLeft = false;
        this.moveRight = false;
        this.isJumping = false;
        
        // Physics properties
        this.mass = 70; // kg
        this.friction = 0.01;
        this.restitution = 0.3;
        
        // Mesh and Body
        this.mesh = this.createPlayerMesh();
        this.body = this.createPlayerBody();
        
        // Camera configuration for first-person view
        this.setupCamera();
        
        // Setup controls
        this.setupControls();
        
        // Particle emitters for snow effects
        this.trailEmitter = null;
        this.setupParticleEmitters();
        
        // Sound effects
        this.setupSounds();
    }
    
    createPlayerMesh() {
        // Create skier model
        const skierGroup = new THREE.Group();
        
        // Skier body - we'll only see this in 3rd person mode or shadows
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366cc,
            roughness: 0.8,
            metalness: 0.2
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.8;
        skierGroup.add(bodyMesh);
        
        // Ski poles
        const poleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.8
        });
        
        // Left pole
        const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
        leftPole.position.set(-0.5, 0.5, -0.3);
        leftPole.rotation.x = Math.PI / 6;
        skierGroup.add(leftPole);
        
        // Right pole
        const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
        rightPole.position.set(0.5, 0.5, -0.3);
        rightPole.rotation.x = Math.PI / 6;
        skierGroup.add(rightPole);
        
        // Skis
        const skiGeometry = new THREE.BoxGeometry(0.2, 0.05, 1.8);
        const skiMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.4,
            metalness: 0.6
        });
        
        // Left ski
        const leftSki = new THREE.Mesh(skiGeometry, skiMaterial);
        leftSki.position.set(-0.3, -0.2, 0);
        skierGroup.add(leftSki);
        
        // Right ski
        const rightSki = new THREE.Mesh(skiGeometry, skiMaterial);
        rightSki.position.set(0.3, -0.2, 0);
        skierGroup.add(rightSki);
        
        // Create custom arms and legs that will animate while skiing
        this.createLimbs(skierGroup);
        
        // Add to scene
        this.scene.add(skierGroup);
        
        return skierGroup;
    }
    
    createLimbs(skierGroup) {
        // Create limbs that will animate during skiing
        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
        const limbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366cc,
            roughness: 0.8
        });
        
        // Left arm
        this.leftArm = new THREE.Mesh(armGeometry, limbMaterial);
        this.leftArm.position.set(-0.5, 0.8, 0);
        skierGroup.add(this.leftArm);
        
        // Right arm
        this.rightArm = new THREE.Mesh(armGeometry, limbMaterial);
        this.rightArm.position.set(0.5, 0.8, 0);
        skierGroup.add(this.rightArm);
        
        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.12, 0.8, 4, 8);
        
        // Left leg
        this.leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
        this.leftLeg.position.set(-0.3, 0.3, 0);
        skierGroup.add(this.leftLeg);
        
        // Right leg
        this.rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
        this.rightLeg.position.set(0.3, 0.3, 0);
        skierGroup.add(this.rightLeg);
    }
    
    createPlayerBody() {
        // Create physics body for the player
        const shape = new CANNON.Sphere(0.5); // Sphere collider for player
        
        const body = new CANNON.Body({
            mass: this.mass,
            position: new CANNON.Vec3(0, 5, 0), // Start a bit in the air
            shape: shape,
            material: new CANNON.Material({
                friction: this.friction,
                restitution: this.restitution
            }),
            linearDamping: 0.1,
            angularDamping: 0.99
        });
        
        // Set initial velocity
        body.velocity.set(0, 0, -this.initialSpeed);
        
        // Add to physics world
        this.physics.world.addBody(body);
        
        return body;
    }
    
    setupCamera() {
        // Position the camera for first-person view
        this.camera.position.set(0, 1.7, 0);
        this.camera.lookAt(0, 1.7, -10);
        
        // Add camera to player mesh
        this.mesh.add(this.camera);
        
        // Set camera parameters
        this.camera.near = 0.1;
        this.camera.far = 5000;
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
    }
    
    setupControls() {
        // Set up event listeners for keyboard controls
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'Space':
                    if (!this.isJumping) {
                        this.jump();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        });
    }
    
    setupParticleEmitters() {
        // Initialize particle emitters for snow trails
        // These will be implemented in particles.js
    }
    
    setupSounds() {
        // Sound effects setup
        // (To be implemented when adding sound)
    }
    
    update(deltaTime) {
        if (this.isDead) return;
        
        // Update speed - gradually increase with time
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration);
        
        // Apply movement based on controls
        this.applyControls(deltaTime);
        
        // Update physics body velocity
        this.updatePhysics();
        
        // Update mesh position from physics body
        this.updateMeshFromBody();
        
        // Animate limbs for skiing effect
        this.animateLimbs(deltaTime);
        
        // Update particle emitters
        this.updateParticles();
        
        // Check collisions with terrain
        this.checkTerrainCollision();
    }
    
    applyControls(deltaTime) {
        // Apply lateral movement based on key presses
        let lateralForce = 0;
        
        if (this.moveLeft) {
            lateralForce = -this.lateralSpeed * deltaTime;
        } else if (this.moveRight) {
            lateralForce = this.lateralSpeed * deltaTime;
        }
        
        // Apply the lateral force to the physics body
        if (lateralForce !== 0) {
            this.body.applyImpulse(
                new CANNON.Vec3(lateralForce, 0, 0),
                new CANNON.Vec3(0, 0, 0)
            );
        }
        
        // Add some tilt to the mesh when turning
        const targetRotationZ = this.moveLeft ? 0.2 : (this.moveRight ? -0.2 : 0);
        this.mesh.rotation.z = lerp(this.mesh.rotation.z, targetRotationZ, 5 * deltaTime);
    }
    
    updatePhysics() {
        // Apply forward velocity based on current speed
        this.body.velocity.z = -this.speed;
        
        // Apply gravity manually for better control
        this.body.applyForce(
            new CANNON.Vec3(0, -9.82 * this.mass, 0),
            new CANNON.Vec3(0, 0, 0)
        );
        
        // Check if we're on the ground
        const rayCastResult = this.physics.world.raycastClosest(
            this.body.position,
            new CANNON.Vec3(this.body.position.x, this.body.position.y - 1, this.body.position.z),
            { skipBackfaces: true }
        );
        
        this.isGrounded = rayCastResult.hasHit && rayCastResult.distance < 0.6;
        
        // Reset jump state if we're back on the ground
        if (this.isGrounded && this.isJumping) {
            this.isJumping = false;
        }
    }
    
    updateMeshFromBody() {
        // Update mesh position and rotation from physics body
        this.mesh.position.x = this.body.position.x;
        this.mesh.position.y = this.body.position.y;
        this.mesh.position.z = this.body.position.z;
        
        // Apply some smoothing to the rotation for better visual effect
        const targetRotationX = this.isGrounded ? Math.atan2(this.body.velocity.y, -this.body.velocity.z) : 0;
        this.mesh.rotation.x = lerp(this.mesh.rotation.x, targetRotationX, 0.1);
    }
    
    animateLimbs(deltaTime) {
        // Animate arms and legs while skiing
        const time = Date.now() * 0.002;
        const amplitude = 0.2;
        
        // Arms swing opposite to each other
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = Math.sin(time) * amplitude;
            this.rightArm.rotation.x = Math.sin(time + Math.PI) * amplitude;
        }
        
        // Legs also move, but less dramatically
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = Math.sin(time + Math.PI) * amplitude * 0.5;
            this.rightLeg.rotation.x = Math.sin(time) * amplitude * 0.5;
        }
        
        // More extreme animation when turning
        if (this.moveLeft || this.moveRight) {
            const turnFactor = this.moveLeft ? 1 : -1;
            
            if (this.leftArm && this.rightArm) {
                if (turnFactor > 0) {
                    this.leftArm.rotation.z = 0.3;
                    this.rightArm.rotation.z = -0.1;
                } else {
                    this.leftArm.rotation.z = 0.1;
                    this.rightArm.rotation.z = -0.3;
                }
            }
        } else {
            // Reset arm rotation when not turning
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.z = lerp(this.leftArm.rotation.z, 0, 5 * deltaTime);
                this.rightArm.rotation.z = lerp(this.rightArm.rotation.z, 0, 5 * deltaTime);
            }
        }
    }
    
    updateParticles() {
        // Update snow trail particles
        // (To be implemented with particles.js)
    }
    
    jump() {
        if (!this.isJumping && this.isGrounded) {
            // Apply jump force
            this.body.applyImpulse(
                new CANNON.Vec3(0, this.jumpForce, 0),
                new CANNON.Vec3(0, 0, 0)
            );
            
            this.isJumping = true;
            
            // Play jump sound
            // (To be implemented)
        }
    }
    
    checkTerrainCollision() {
        // Check if we've gone too far to the sides or below the terrain
        if (Math.abs(this.body.position.x) > 500 || this.body.position.y < -100) {
            this.die();
        }
    }
    
    checkObstacleCollision(obstacle) {
        // Check for collision with an obstacle
        const playerPos = new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        
        const obstaclePos = new THREE.Vector3(
            obstacle.body.position.x,
            obstacle.body.position.y,
            obstacle.body.position.z
        );
        
        const collisionDistance = obstacle.collisionRadius + 0.5; // Player radius is 0.5
        
        if (playerPos.distanceTo(obstaclePos) < collisionDistance) {
            // Take damage based on speed and obstacle type
            const damage = this.speed * obstacle.damageMultiplier * 0.1;
            this.takeDamage(damage);
            return true;
        }
        
        return false;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Apply visual effect for damage
        // (Camera shake, red overlay, etc.)
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        if (!this.isDead) {
            this.isDead = true;
            
            // Stop movement
            this.body.velocity.set(0, 0, 0);
            
            // Ragdoll physics for dramatic effect
            this.applyRagdollEffect();
            
            // Trigger game over
            const event = new CustomEvent('player-died');
            document.dispatchEvent(event);
        }
    }
    
    applyRagdollEffect() {
        // Apply random forces to create a ragdoll effect when the player dies
        const randomForceX = (Math.random() - 0.5) * 20;
        const randomForceY = Math.random() * 10;
        const randomForceZ = Math.random() * 10;
        
        this.body.applyImpulse(
            new CANNON.Vec3(randomForceX, randomForceY, randomForceZ),
            new CANNON.Vec3(0, 0, 0)
        );
        
        // Add some angular velocity for spinning
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
    }
    
    reset() {
        // Reset player state
        this.speed = this.initialSpeed;
        this.health = 100;
        this.isDead = false;
        
        // Reset physics body
        this.body.position.set(0, 5, 0);
        this.body.velocity.set(0, 0, -this.initialSpeed);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.quaternion.set(0, 0, 0, 1);
        
        // Reset mesh
        this.mesh.rotation.set(0, 0, 0);
        
        // Reset controls
        this.moveLeft = false;
        this.moveRight = false;
        this.isJumping = false;
        
        // Reset camera
        this.camera.position.set(0, 1.7, 0);
        this.camera.lookAt(0, 1.7, -10);
        this.mesh.add(this.camera);
    }
    
    getPosition() {
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }
} 