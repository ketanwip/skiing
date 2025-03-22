/**
 * Obstacles class for generating and managing obstacles in the skiing game
 */
class ObstacleManager {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        
        // Obstacle collections
        this.obstacles = [];
        this.activeObstacles = [];
        this.obstaclePool = []; // For object pooling
        this.obstacleTypesData = [];
        
        // Settings
        this.minDistanceBetweenObstacles = 20;
        this.obstacleSpawnFrequency = 0.2; // Probability per update
        this.maxObstaclesOnScreen = 20;
        this.obstaclesAvoided = 0;
        
        // Internal state
        this.nextObstacleZ = -100; // Starting point for obstacles
        this.lastPlayerZ = 0;
        this.obstacleSpread = 30; // How far to the sides obstacles can appear
        
        // Difficulty progression
        this.difficultyLevel = 1;
        this.obstaclesPerLevelIncrease = 10;
        
        // Initialize obstacle types
        this.initObstacleTypes();
    }
    
    initObstacleTypes() {
        // Define different types of obstacles with various properties
        this.obstacleTypesData = [
            {
                type: 'tree',
                geometry: new THREE.CylinderGeometry(0.5, 1, 10, 8),
                material: new THREE.MeshStandardMaterial({ color: 0x3d5e3a }),
                scale: 1.0,
                collisionRadius: 1.2,
                damageMultiplier: 1.0,
                createFunc: this.createTree.bind(this)
            },
            {
                type: 'rock',
                geometry: new THREE.DodecahedronGeometry(1.5, 1),
                material: new THREE.MeshStandardMaterial({ color: 0x777777 }),
                scale: 1.0,
                collisionRadius: 1.8,
                damageMultiplier: 1.2,
                createFunc: this.createRock.bind(this)
            },
            {
                type: 'iceSpike',
                geometry: new THREE.ConeGeometry(0.8, 3, 6),
                material: new THREE.MeshPhysicalMaterial({
                    color: 0xa0c0ff,
                    roughness: 0.1,
                    metalness: 0.0,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1,
                    reflectivity: 0.8,
                    transmission: 0.5
                }),
                scale: 1.0,
                collisionRadius: 1.0,
                damageMultiplier: 1.5,
                createFunc: this.createIceSpike.bind(this)
            },
            {
                type: 'logPile',
                geometry: null, // Custom geometry created in createFunc
                material: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
                scale: 1.0,
                collisionRadius: 2.0,
                damageMultiplier: 0.8,
                createFunc: this.createLogPile.bind(this)
            }
        ];
    }
    
    update(playerPosition, deltaTime) {
        // Update difficulty based on player progress
        this.updateDifficulty(playerPosition);
        
        // Clean up obstacles that are behind the player
        this.removeDistantObstacles(playerPosition);
        
        // Generate new obstacles as needed
        if (this.activeObstacles.length < this.maxObstaclesOnScreen) {
            this.generateObstacle(playerPosition);
        }
        
        // Check if player has passed obstacles (for score)
        this.checkObstaclesPassed(playerPosition);
    }
    
    updateDifficulty(playerPosition) {
        // Increase difficulty based on distance traveled
        const distanceTraveled = Math.abs(playerPosition.z);
        this.difficultyLevel = 1 + Math.floor(distanceTraveled / 500);
        
        // Adjust settings based on difficulty
        this.obstacleSpawnFrequency = 0.2 + (this.difficultyLevel * 0.05);
        this.maxObstaclesOnScreen = 20 + (this.difficultyLevel * 2);
        this.obstacleSpread = 30 + (this.difficultyLevel * 5);
    }
    
    removeDistantObstacles(playerPosition) {
        // Remove obstacles that are far behind the player
        const removalDistance = 50;
        
        this.activeObstacles = this.activeObstacles.filter(obstacle => {
            if (obstacle.position.z > playerPosition.z + removalDistance) {
                // Return obstacle to pool
                this.recycleObstacle(obstacle);
                return false;
            }
            return true;
        });
    }
    
    generateObstacle(playerPosition) {
        // Determine whether to spawn a new obstacle
        if (Math.random() > this.obstacleSpawnFrequency) {
            return;
        }
        
        // Determine obstacle position
        const zDistance = playerPosition.z - this.nextObstacleZ;
        
        // Only spawn if we've moved far enough
        if (Math.abs(zDistance) < this.minDistanceBetweenObstacles) {
            return;
        }
        
        // Random position to the sides
        const xPosition = (Math.random() * 2 - 1) * this.obstacleSpread;
        
        // Choose a random obstacle type, weighted by difficulty
        let typeIndex = Math.floor(Math.random() * this.obstacleTypesData.length);
        
        // Higher chance of more dangerous obstacles as difficulty increases
        if (Math.random() < 0.2 * this.difficultyLevel) {
            typeIndex = Math.min(typeIndex + 1, this.obstacleTypesData.length - 1);
        }
        
        const obstacleType = this.obstacleTypesData[typeIndex];
        
        // Create the obstacle
        const obstacle = this.createObstacle(obstacleType, xPosition, this.nextObstacleZ);
        
        // Add to active obstacles
        this.activeObstacles.push(obstacle);
        
        // Update the next obstacle position
        this.nextObstacleZ -= this.minDistanceBetweenObstacles * (1 + Math.random() * 0.5);
    }
    
    createObstacle(typeData, x, z) {
        // Check if we have a pooled object of this type
        let obstacle = this.getObstacleFromPool(typeData.type);
        
        if (!obstacle) {
            // Create a new obstacle if none is available in the pool
            obstacle = typeData.createFunc();
        }
        
        // Position the obstacle
        obstacle.position.set(x, 0, z);
        obstacle.type = typeData.type;
        obstacle.collisionRadius = typeData.collisionRadius;
        obstacle.damageMultiplier = typeData.damageMultiplier;
        obstacle.isAvoidedCounted = false;
        
        // Add obstacle to physics world
        this.addObstaclePhysics(obstacle, typeData);
        
        return obstacle;
    }
    
    getObstacleFromPool(type) {
        // Find a matching obstacle in the pool
        const index = this.obstaclePool.findIndex(obj => obj.type === type);
        
        if (index !== -1) {
            // Remove from pool and return
            const obstacle = this.obstaclePool.splice(index, 1)[0];
            this.scene.add(obstacle);
            return obstacle;
        }
        
        return null;
    }
    
    recycleObstacle(obstacle) {
        // Remove from scene
        this.scene.remove(obstacle);
        
        // Remove physics body
        if (obstacle.body) {
            this.physics.world.removeBody(obstacle.body);
            obstacle.body = null;
        }
        
        // Add to pool for reuse
        this.obstaclePool.push(obstacle);
    }
    
    addObstaclePhysics(obstacle, typeData) {
        // Create physics body for the obstacle
        let shape;
        
        // Choose appropriate shape based on obstacle type
        switch (typeData.type) {
            case 'tree':
                shape = new CANNON.Cylinder(0.5, 1, 10, 8);
                break;
            case 'rock':
                shape = new CANNON.Sphere(typeData.collisionRadius);
                break;
            case 'iceSpike':
                shape = new CANNON.Cone(0.8, 3);
                break;
            case 'logPile':
                shape = new CANNON.Box(new CANNON.Vec3(2, 1, 1));
                break;
            default:
                shape = new CANNON.Sphere(typeData.collisionRadius);
        }
        
        // Create the body
        const body = new CANNON.Body({
            mass: 0, // Static body
            position: new CANNON.Vec3(obstacle.position.x, obstacle.position.y, obstacle.position.z),
            shape: shape
        });
        
        // Add to physics world
        this.physics.world.addBody(body);
        
        // Link body to mesh
        obstacle.body = body;
    }
    
    checkObstaclesPassed(playerPosition) {
        // Check for obstacles that player has passed to update score
        this.activeObstacles.forEach(obstacle => {
            if (!obstacle.isAvoidedCounted && obstacle.position.z > playerPosition.z + 5) {
                obstacle.isAvoidedCounted = true;
                this.obstaclesAvoided++;
                
                // Update score display
                document.getElementById('score').textContent = this.obstaclesAvoided.toString();
            }
        });
    }
    
    // Custom obstacle creation methods
    createTree() {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 10, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunkMesh.position.y = 5;
        treeGroup.add(trunkMesh);
        
        // Create the snowy pine tree branches
        const createBranches = (y, radius, height, segments, angleOffset = 0) => {
            const coneGeometry = new THREE.ConeGeometry(radius, height, segments);
            const coneMaterial = new THREE.MeshStandardMaterial({
                color: 0x2d4c2a,
                roughness: 0.8
            });
            const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
            coneMesh.position.y = y;
            coneMesh.rotation.y = angleOffset;
            
            // Add snow on top
            const snowGeometry = new THREE.ConeGeometry(radius * 0.95, height * 0.3, segments);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.1
            });
            const snowMesh = new THREE.Mesh(snowGeometry, snowMaterial);
            snowMesh.position.y = height * 0.35;
            coneMesh.add(snowMesh);
            
            return coneMesh;
        };
        
        // Add multiple branch layers
        const branchLayers = [
            { y: 8, radius: 3.5, height: 3.5, segments: 8 },
            { y: 6, radius: 2.8, height: 3.0, segments: 8 },
            { y: 4, radius: 2.0, height: 2.5, segments: 8 }
        ];
        
        branchLayers.forEach(layer => {
            const branch = createBranches(layer.y, layer.radius, layer.height, layer.segments);
            treeGroup.add(branch);
        });
        
        // Add snow on trunk
        const addSnowPatch = (parent, y, scale) => {
            const snowGeometry = new THREE.SphereGeometry(0.8 * scale, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5
            });
            const snowPatch = new THREE.Mesh(snowGeometry, snowMaterial);
            snowPatch.rotation.x = Math.PI / 2;
            snowPatch.position.y = y;
            snowPatch.position.z = 0.5;
            
            parent.add(snowPatch);
        };
        
        // Add random snow patches on the trunk
        for (let i = 0; i < 3; i++) {
            const y = 2 + Math.random() * 6;
            const scale = 0.3 + Math.random() * 0.3;
            addSnowPatch(trunkMesh, y - 5, scale);
        }
        
        // Cast shadows
        treeGroup.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.scene.add(treeGroup);
        
        return treeGroup;
    }
    
    createRock() {
        // Create a more realistic rock using multiple geometries
        const rockGroup = new THREE.Group();
        
        // Main rock body
        const rockGeometry = new THREE.DodecahedronGeometry(1.5, 1);
        
        // Modify vertices for more natural look
        const positions = rockGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Apply noise to the positions
            const noise = (Math.random() - 0.5) * 0.3;
            positions.setXYZ(i, x + noise, y + noise, z + noise);
        }
        
        // Update geometry
        rockGeometry.computeVertexNormals();
        
        // Create material with snow patches
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.2
        });
        
        const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
        mainRock.position.y = 1.5;
        mainRock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rockGroup.add(mainRock);
        
        // Add snow on top of the rock
        const addSnowToRock = () => {
            const snowGeometry = new THREE.SphereGeometry(1.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 3);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5
            });
            const snow = new THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.y = 0.7;
            snow.rotation.x = Math.PI;
            
            // Deform snow
            const snowPositions = snowGeometry.attributes.position;
            for (let i = 0; i < snowPositions.count; i++) {
                const x = snowPositions.getX(i);
                const y = snowPositions.getY(i);
                const z = snowPositions.getZ(i);
                
                // Apply noise to the positions
                const noise = (Math.random() - 0.5) * 0.2;
                snowPositions.setXYZ(i, x + noise, y, z + noise);
            }
            
            snowGeometry.computeVertexNormals();
            mainRock.add(snow);
        };
        
        // Add snow on top
        addSnowToRock();
        
        // Add a few small rocks around the base
        const addSmallRock = (x, z, scale) => {
            const smallRockGeometry = new THREE.DodecahedronGeometry(scale, 0);
            const smallRock = new THREE.Mesh(smallRockGeometry, rockMaterial);
            smallRock.position.set(x, scale * 0.5, z);
            smallRock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            rockGroup.add(smallRock);
        };
        
        // Add 3-5 small rocks
        const smallRockCount = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < smallRockCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 1.2 + Math.random() * 0.8;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const scale = 0.2 + Math.random() * 0.4;
            
            addSmallRock(x, z, scale);
        }
        
        // Enable shadows
        rockGroup.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.scene.add(rockGroup);
        
        return rockGroup;
    }
    
    createIceSpike() {
        // Create a group for the ice spike
        const iceGroup = new THREE.Group();
        
        // Create main ice spike
        const spikeGeometry = new THREE.ConeGeometry(0.8, 3, 6);
        const iceMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xa0c0ff,
            roughness: 0.1,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 0.8,
            transmission: 0.5,
            ior: 1.3,
            thickness: 0.5
        });
        
        const mainSpike = new THREE.Mesh(spikeGeometry, iceMaterial);
        mainSpike.position.y = 1.5;
        iceGroup.add(mainSpike);
        
        // Add multiple smaller spikes around the base
        const smallSpikeCount = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < smallSpikeCount; i++) {
            const angle = (i / smallSpikeCount) * Math.PI * 2;
            const distance = 0.8;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const height = 1.0 + Math.random() * 1.0;
            const radius = 0.3 + Math.random() * 0.3;
            
            const smallSpikeGeometry = new THREE.ConeGeometry(radius, height, 5);
            const smallSpike = new THREE.Mesh(smallSpikeGeometry, iceMaterial);
            
            smallSpike.position.set(x, height / 2, z);
            smallSpike.rotation.y = Math.random() * Math.PI;
            
            // Tilt slightly outward from center
            const tiltAngle = Math.random() * 0.2 + 0.1;
            smallSpike.rotation.x = Math.sin(angle) * tiltAngle;
            smallSpike.rotation.z = -Math.cos(angle) * tiltAngle;
            
            iceGroup.add(smallSpike);
        }
        
        // Add a base of ice
        const baseGeometry = new THREE.CylinderGeometry(1.2, 1.5, 0.4, 8);
        const base = new THREE.Mesh(baseGeometry, iceMaterial);
        base.position.y = 0.2;
        iceGroup.add(base);
        
        // Enable shadows
        iceGroup.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.scene.add(iceGroup);
        
        return iceGroup;
    }
    
    createLogPile() {
        // Create a group for the log pile
        const logGroup = new THREE.Group();
        
        // Wood material
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create a pile of logs
        const createLog = (x, y, z, rotationY, scale = 1.0) => {
            const logGeometry = new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 4 * scale, 8);
            const log = new THREE.Mesh(logGeometry, woodMaterial);
            
            // Rotate to horizontal
            log.rotation.z = Math.PI / 2;
            log.rotation.y = rotationY;
            
            log.position.set(x, y, z);
            
            // Add snow on top of the log
            if (Math.random() > 0.3) {
                const snowGeometry = new THREE.BoxGeometry(0.2, 4 * scale * 0.8, 0.4);
                const snowMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.5
                });
                const snow = new THREE.Mesh(snowGeometry, snowMaterial);
                snow.position.y = 0.4;
                log.add(snow);
            }
            
            return log;
        };
        
        // Base layer
        const baseLogsCount = 3;
        for (let i = 0; i < baseLogsCount; i++) {
            const x = (i - baseLogsCount / 2 + 0.5) * 0.8;
            const log = createLog(x, 0.4, 0, 0);
            logGroup.add(log);
        }
        
        // Second layer - perpendicular to base
        const secondLogsCount = 2;
        for (let i = 0; i < secondLogsCount; i++) {
            const z = (i - secondLogsCount / 2 + 0.5) * 0.8;
            const log = createLog(0, 1.2, z, Math.PI / 2);
            logGroup.add(log);
        }
        
        // Top layer
        const topLog = createLog(0, 2.0, 0, 0, 0.9);
        logGroup.add(topLog);
        
        // Add a few branches sticking out
        const addBranch = (parent, x, y, z, rotationY, rotationZ, scale) => {
            const branchGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, 1.5 * scale, 5);
            const branchMaterial = new THREE.MeshStandardMaterial({
                color: 0x704214,
                roughness: 1.0
            });
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);
            
            branch.position.set(x, y, z);
            branch.rotation.y = rotationY;
            branch.rotation.z = rotationZ;
            
            parent.add(branch);
        };
        
        // Add random branches
        for (let i = 0; i < 5; i++) {
            const parent = logGroup.children[Math.floor(Math.random() * logGroup.children.length)];
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 0.3;
            const z = (Math.random() - 0.5) * 2;
            const rotationY = Math.random() * Math.PI * 2;
            const rotationZ = Math.random() * Math.PI - Math.PI / 2;
            const scale = 0.7 + Math.random() * 0.5;
            
            addBranch(parent, x, y, z, rotationY, rotationZ, scale);
        }
        
        // Enable shadows
        logGroup.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.scene.add(logGroup);
        
        return logGroup;
    }
    
    reset() {
        // Reset obstacle manager for a new game
        this.activeObstacles.forEach(obstacle => {
            this.recycleObstacle(obstacle);
        });
        
        this.activeObstacles = [];
        this.nextObstacleZ = -100;
        this.obstaclesAvoided = 0;
        this.difficultyLevel = 1;
        
        // Reset score display
        document.getElementById('score').textContent = "0";
    }
    
    getObstaclesAvoided() {
        return this.obstaclesAvoided;
    }
} 