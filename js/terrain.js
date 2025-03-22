/**
 * Terrain generation and management for the skiing game
 */
class Terrain {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.segments = 256; // Higher number = more detailed terrain
        this.size = 2000; // Size of the terrain
        this.height = 400; // Maximum height of mountains
        this.terrainChunks = [];
        this.chunkSize = 500; // Size of each terrain chunk
        this.visibleChunks = 5; // Number of chunks visible at once
        this.currentChunkIndex = 0;
        
        // Terrain materials
        this.snowMaterial = this.createSnowMaterial();
        this.rockMaterial = this.createRockMaterial();
        this.iceMaterial = this.createIceMaterial();

        // Terrain bodies for physics
        this.terrainBodies = [];
        
        // Generate initial terrain chunks
        this.generateInitialChunks();
    }
    
    createSnowMaterial() {
        // Create procedural snow texture
        const snowCanvas = createSnowTexture(1024);
        const snowTexture = new THREE.CanvasTexture(snowCanvas);
        snowTexture.wrapS = THREE.RepeatWrapping;
        snowTexture.wrapT = THREE.RepeatWrapping;
        snowTexture.repeat.set(20, 20);
        
        // Generate normal map from height map
        const normalCanvas = generateNormalMap(snowCanvas, 2.0);
        const normalMap = new THREE.CanvasTexture(normalCanvas);
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(20, 20);
        
        // Create snow material with subsurface scattering effect
        const snowMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            map: snowTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughness: 0.8,
            metalness: 0.0,
            clearcoat: 0.2,
            clearcoatRoughness: 0.4,
            reflectivity: 0.2,
            transmission: 0.1,
            thickness: 1.0,
            envMapIntensity: 0.5,
            side: THREE.FrontSide
        });
        
        return snowMaterial;
    }
    
    createRockMaterial() {
        // Use a procedural rock texture
        const rockCanvas = this.createRockTexture();
        const rockTexture = new THREE.CanvasTexture(rockCanvas);
        rockTexture.wrapS = THREE.RepeatWrapping;
        rockTexture.wrapT = THREE.RepeatWrapping;
        rockTexture.repeat.set(5, 5);
        
        // Generate normal map
        const normalCanvas = generateNormalMap(rockCanvas, 3.0);
        const normalMap = new THREE.CanvasTexture(normalCanvas);
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(5, 5);
        
        // Rock material
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            map: rockTexture,
            normalMap: normalMap,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.FrontSide
        });
        
        return rockMaterial;
    }
    
    createIceMaterial() {
        // Ice material with high reflectivity and translucency
        const iceMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xadd8e6,
            roughness: 0.1,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 0.8,
            transmission: 0.5,
            ior: 1.3,
            thickness: 0.5,
            envMapIntensity: 1.0,
            side: THREE.FrontSide
        });
        
        return iceMaterial;
    }
    
    createRockTexture(size = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        
        // Base color
        context.fillStyle = '#777777';
        context.fillRect(0, 0, size, size);
        
        // Add noise and cracks
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 3 + 1;
            const brightness = Math.random() * 0.2 + 0.4; // Random between 0.4 and 0.6
            
            context.fillStyle = `rgba(${Math.floor(brightness * 255)}, ${Math.floor(brightness * 255)}, ${Math.floor(brightness * 255)}, 1.0)`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        // Add cracks
        for (let i = 0; i < 20; i++) {
            const startX = Math.random() * size;
            const startY = Math.random() * size;
            const length = Math.random() * 100 + 50;
            const angle = Math.random() * Math.PI * 2;
            const width = Math.random() * 2 + 0.5;
            
            context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            context.lineWidth = width;
            context.beginPath();
            context.moveTo(startX, startY);
            
            let currentX = startX;
            let currentY = startY;
            const segments = 10;
            
            for (let j = 0; j < segments; j++) {
                const segmentLength = length / segments;
                const angleVariation = (Math.random() - 0.5) * 0.5;
                const currentAngle = angle + angleVariation;
                
                currentX += Math.cos(currentAngle) * segmentLength;
                currentY += Math.sin(currentAngle) * segmentLength;
                
                context.lineTo(currentX, currentY);
            }
            
            context.stroke();
        }
        
        return canvas;
    }

    // Generate noise for terrain
    generateTerrainNoise(x, y, chunkIndex) {
        // Use the generateNoise function from utils.js
        // Adjust parameters for more interesting terrain
        const baseHeight = generateNoise(x + chunkIndex * this.chunkSize, y, 8, 0.65, 2.0, 300.0);
        
        // Create steeper mountains further down the slope
        const mountainScale = Math.min(1.0, chunkIndex * 0.1); // Increase mountains as you go further
        const mountainNoise = generateNoise(x + chunkIndex * this.chunkSize, y, 4, 0.5, 2.2, 180.0) * mountainScale;
        
        // Add some smaller bumps for detail
        const detailNoise = generateNoise(x + chunkIndex * this.chunkSize * 2, y * 2, 3, 0.3, 3.0, 50.0) * 0.1;
        
        // Create a slope that gradually goes downward (decreasing z as x increases)
        const slopeZ = -chunkIndex * 30 - (x / this.size) * 200;
        
        // Combine everything
        let finalHeight = (baseHeight * 0.7 + mountainNoise * 0.3 + detailNoise) * this.height;
        
        // Add the slope
        finalHeight += slopeZ;
        
        // Make the edges lower to create a natural boundary
        const edgeFactor = 1.0 - Math.pow(Math.abs(y / (this.size * 0.5)), 4);
        
        return finalHeight * edgeFactor;
    }
    
    generateChunk(chunkIndex) {
        const geometry = new THREE.PlaneGeometry(
            this.chunkSize, 
            this.chunkSize, 
            this.segments / (this.size / this.chunkSize), 
            this.segments / (this.size / this.chunkSize)
        );
        
        // Calculate chunk position in the world
        const chunkOffsetX = 0;
        const chunkOffsetY = chunkIndex * this.chunkSize;
        
        // Apply noise to vertices
        const vertices = geometry.attributes.position.array;
        const heightData = [];
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vertexIndex = i / 3;
            const x = geometry.attributes.position.getX(vertexIndex) + this.size / 2 + chunkOffsetX;
            const y = geometry.attributes.position.getY(vertexIndex) + chunkOffsetY;
            
            // Generate height
            const height = this.generateTerrainNoise(x, y, chunkIndex);
            vertices[i + 2] = height; // z-coordinate
            
            // Store height data for physics
            heightData.push(height);
        }
        
        // Update normals for lighting
        geometry.computeVertexNormals();
        
        // Material settings based on chunk index
        // Earlier chunks have more snow, later chunks have more ice for increased difficulty
        const iceFactor = Math.min(0.8, chunkIndex * 0.1);
        
        // Create the mesh with adjusted material
        let material;
        if (Math.random() < iceFactor) {
            material = this.iceMaterial;
        } else {
            material = this.snowMaterial;
        }
        
        // Expose some rocks on steeper areas
        const rocksMesh = this.addRockFeatures(geometry, chunkIndex);
        
        // Create the main terrain mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Rotate to horizontal plane
        mesh.position.set(0, 0, -chunkIndex * this.chunkSize);
        
        // Add rocks mesh as child
        if (rocksMesh) {
            mesh.add(rocksMesh);
        }
        
        // Add physics body for the terrain
        this.addTerrainPhysics(mesh, heightData, chunkIndex);
        
        // Add trees and obstacles
        this.addEnvironmentalFeatures(mesh, chunkIndex);
        
        return mesh;
    }
    
    addRockFeatures(geometry, chunkIndex) {
        // Create a clone of the geometry for the rock features
        const rockGeometry = geometry.clone();
        const vertices = rockGeometry.attributes.position.array;
        
        // Only apply rock material to steep areas
        const indices = [];
        const normals = rockGeometry.attributes.normal.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const normalIndex = i;
            const normalY = normals[normalIndex + 1];
            
            // Check if this area is steep (normal has small Y component)
            if (Math.abs(normalY) < 0.7 && Math.random() < 0.6) {
                indices.push(i / 3);
            }
        }
        
        if (indices.length === 0) {
            return null;
        }
        
        // Create rock mesh only for the steep areas
        const rockMesh = new THREE.Mesh(rockGeometry, this.rockMaterial);
        rockMesh.rotation.x = -Math.PI / 2;
        
        return rockMesh;
    }
    
    addTerrainPhysics(mesh, heightData, chunkIndex) {
        // Create a heightfield shape for physics
        const sizeX = this.chunkSize;
        const sizeY = this.chunkSize;
        const elementSize = sizeX / this.segments;
        
        try {
            // Flatten the height data for Cannon.js heightfield
            const data = [];
            for (let i = 0; i < this.segments + 1; i++) {
                data[i] = [];
                for (let j = 0; j < this.segments + 1; j++) {
                    const index = i * (this.segments + 1) + j;
                    data[i][j] = heightData[index] || 0;
                }
            }
            
            // Create the heightfield shape
            const heightfieldShape = new CANNON.Heightfield(data, {
                elementSize: elementSize
            });
            
            // Create the physics body
            const terrainBody = new CANNON.Body({
                mass: 0, // Static body
                material: this.physics.materials.snow // Use snow material
            });
            
            // Position the body correctly
            const matrix = new CANNON.Quaternion();
            matrix.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate to match Three.js orientation
            
            // Add the shape to the body with proper orientation
            terrainBody.addShape(heightfieldShape, new CANNON.Vec3(), matrix);
            
            // Position the physics body to match the visual mesh
            terrainBody.position.x = mesh.position.x;
            terrainBody.position.y = mesh.position.y;
            terrainBody.position.z = mesh.position.z;
            
            // Add the body to the physics world
            this.physics.world.addBody(terrainBody);
            
            // Store the body for later removal
            this.terrainBodies.push({
                body: terrainBody,
                chunkIndex: chunkIndex
            });
            
            // Debug visualizations
            if (this.physics.debugRenderer) {
                this.physics.updateDebug();
            }
        } catch (e) {
            console.error("Error creating terrain physics:", e);
        }
    }
    
    addEnvironmentalFeatures(mesh, chunkIndex) {
        // This will be implemented in environment.js
        // Function stub for now
    }
    
    generateInitialChunks() {
        // Initialize SimplexNoise
        noise.seed(Math.random());
        
        // Generate the first few chunks
        for (let i = 0; i < this.visibleChunks; i++) {
            const chunk = this.generateChunk(i);
            this.scene.add(chunk);
            this.terrainChunks.push(chunk);
        }
    }
    
    update(playerPosition) {
        // Check if we need to generate a new chunk ahead
        const playerChunkIndex = Math.floor(-playerPosition.z / this.chunkSize);
        
        // If player is approaching the end of the current chunks, generate more
        if (playerChunkIndex + 3 >= this.currentChunkIndex + this.terrainChunks.length) {
            this.generateNextChunk();
        }
        
        // Remove chunks too far behind the player
        if (this.terrainChunks.length > this.visibleChunks && playerChunkIndex > this.currentChunkIndex + 2) {
            this.removeOldestChunk();
        }
    }
    
    generateNextChunk() {
        const newChunkIndex = this.currentChunkIndex + this.terrainChunks.length;
        const newChunk = this.generateChunk(newChunkIndex);
        this.scene.add(newChunk);
        this.terrainChunks.push(newChunk);
    }
    
    removeOldestChunk() {
        // Remove the oldest chunk from the scene and physics world
        const oldestChunk = this.terrainChunks.shift();
        this.scene.remove(oldestChunk);
        
        // Remove associated physics body
        const oldestBody = this.terrainBodies.shift();
        this.physics.world.removeBody(oldestBody.body);
        
        // Update the current chunk index
        this.currentChunkIndex++;
    }
}

// Initialize SimplexNoise
const noise = {
    grad3: [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],
    p: [],
    perm: [],
    simplex: [[0,1,2,3],[0,1,3,2],[0,2,3,1],[0,2,1,3],[0,3,1,2],[0,3,2,1],[1,2,3,0],[1,2,0,3],[1,3,0,2],[1,3,2,0],[1,0,2,3],[1,0,3,2],[2,3,0,1],[2,3,1,0],[2,0,1,3],[2,0,3,1],[2,1,3,0],[2,1,0,3],[3,0,1,2],[3,0,2,1],[3,1,2,0],[3,1,0,2],[3,2,0,1],[3,2,1,0]],
    
    seed: function(seed) {
        if(seed > 0 && seed < 1) {
            seed *= 65536;
        }
        
        seed = Math.floor(seed);
        if(seed < 256) {
            seed |= seed << 8;
        }
        
        this.p = new Array(256);
        for(let i = 0; i < 256; i++) {
            let v;
            if (i & 1) {
                v = this.p[i - 1] ^ (seed & 255);
            } else {
                v = this.p[i - 1] ^ ((seed >> 8) & 255);
            }
            this.p[i] = v;
        }
        
        this.perm = new Array(512);
        for(let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    },
    
    dot: function(g, x, y) {
        return g[0]*x + g[1]*y;
    },
    
    simplex2: function(xin, yin) {
        let n0, n1, n2;
        
        const F2 = 0.5*(Math.sqrt(3)-1);
        const G2 = (3-Math.sqrt(3))/6;
        
        const s = (xin+yin)*F2;
        const i = Math.floor(xin+s);
        const j = Math.floor(yin+s);
        
        const t = (i+j)*G2;
        const X0 = i-t;
        const Y0 = j-t;
        const x0 = xin-X0;
        const y0 = yin-Y0;
        
        let i1, j1;
        if(x0>y0) {
            i1=1; j1=0;
        } else {
            i1=0; j1=1;
        }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        let gi0 = this.perm[ii+this.perm[jj]] % 12;
        let gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
        let gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
        
        let t0 = 0.5 - x0*x0-y0*y0;
        if(t0<0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1*x1-y1*y1;
        if(t1<0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2*x2-y2*y2;
        if(t2<0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        
        return 70.0 * (n0 + n1 + n2);
    }
}; 