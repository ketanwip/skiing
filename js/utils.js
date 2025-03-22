/**
 * Utility functions for the skiing game
 */

// Random number between min and max
function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

// Random integer between min and max (inclusive)
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check collision between two objects with sphere collision
function checkSphereCollision(obj1, obj2, minDistance) {
    if (!obj1.position || !obj2.position) return false;
    
    const dx = obj1.position.x - obj2.position.x;
    const dy = obj1.position.y - obj2.position.y;
    const dz = obj1.position.z - obj2.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance < minDistance;
}

// Lerp function for smooth transitions
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// Degrees to radians
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Clamp value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Create snow texture
function createSnowTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // Fill with white
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    
    // Add noise
    for (let i = 0; i < size * size / 2; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const brightness = 0.9 + Math.random() * 0.1; // Random between 0.9 and 1.0
        
        context.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        context.fillRect(x, y, 2, 2);
    }
    
    return canvas;
}

// Generate normal map from height map
function generateNormalMap(heightMap, strength = 1.0) {
    const width = heightMap.width;
    const height = heightMap.height;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(heightMap, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const normalData = new Uint8ClampedArray(width * height * 4);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Get height values from 8 surrounding pixels
            const tl = data[(y - 1) * width * 4 + (x - 1) * 4] / 255.0;
            const t = data[(y - 1) * width * 4 + x * 4] / 255.0;
            const tr = data[(y - 1) * width * 4 + (x + 1) * 4] / 255.0;
            const l = data[y * width * 4 + (x - 1) * 4] / 255.0;
            const r = data[y * width * 4 + (x + 1) * 4] / 255.0;
            const bl = data[(y + 1) * width * 4 + (x - 1) * 4] / 255.0;
            const b = data[(y + 1) * width * 4 + x * 4] / 255.0;
            const br = data[(y + 1) * width * 4 + (x + 1) * 4] / 255.0;
            
            // Sobel filter for x and y derivatives
            const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
            const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
            
            // Cross product to get normal
            const normal = [
                -dX * strength,
                -dY * strength,
                1.0
            ];
            
            // Normalize
            const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
            
            // Convert to RGB (0-255)
            normalData[idx] = ((normal[0] * 0.5) + 0.5) * 255;     // R
            normalData[idx + 1] = ((normal[1] * 0.5) + 0.5) * 255; // G
            normalData[idx + 2] = ((normal[2] * 0.5) + 0.5) * 255; // B
            normalData[idx + 3] = 255;                            // A
        }
    }
    
    const normalImgData = new ImageData(normalData, width, height);
    ctx.putImageData(normalImgData, 0, 0);
    
    return canvas;
}

// Load texture and return a promise
function loadTexture(path) {
    return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
            path,
            texture => resolve(texture),
            undefined,
            error => reject(error)
        );
    });
}

// Load GLTF model and return a promise
function loadGLTFModel(path) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            path,
            gltf => resolve(gltf),
            undefined,
            error => reject(error)
        );
    });
}

// Easing functions
const Easing = {
    // Quadratic easing in/out
    easeInOutQuad: function (t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    
    // Cubic easing in/out
    easeInOutCubic: function (t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    
    // Exponential easing in/out
    easeInOutExpo: function (t) {
        if (t === 0 || t === 1) return t;
        
        return t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
};

/**
 * Improved Perlin Noise implementation 
 * For terrain generation
 */
class ImprovedNoise {
    constructor() {
        this.p = new Uint8Array(512);
        this.permutation = [ 151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180 ];
        
        for (let i = 0; i < 256; i++) {
            this.p[i] = this.p[i + 256] = this.permutation[i];
        }
    }
    
    noise(x, y, z) {
        // Find unit cube that contains point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        // Find relative x, y, z of point in cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves for each of x, y, z
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;
        
        // Add blended results from 8 corners of cube
        return this.lerp(
            this.lerp(
                this.lerp(this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z), u),
                this.lerp(this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z), u),
                v
            ),
            this.lerp(
                this.lerp(this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1), u),
                this.lerp(this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1), u),
                v
            ),
            w
        );
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y, z) {
        // Convert low 4 bits of hash code into 12 gradient directions
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }
}

// Create a global instance of the noise generator
const perlinNoise = new ImprovedNoise();

// Function to generate simplex noise for terrain
function generateNoise(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0, scale = 100.0) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;  // Used for normalizing result to 0-1
    
    for (let i = 0; i < octaves; i++) {
        total += perlinNoise.noise(x * frequency / scale, y * frequency / scale, 0) * amplitude;
        
        maxValue += amplitude;
        
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    
    // Normalize the result to 0-1
    return total / maxValue;
} 