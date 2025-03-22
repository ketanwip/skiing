/**
 * Physics manager for the skiing game using Cannon.js
 */
class Physics {
    constructor() {
        // Initialize Cannon.js world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth gravity
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.friction = 0.3;
        
        // Material definitions
        this.materials = {
            snow: new CANNON.Material('snow'),
            ice: new CANNON.Material('ice'),
            player: new CANNON.Material('player')
        };
        
        // Contact materials
        this.setupContactMaterials();
        
        // Debug visualization
        this.debugRenderer = null;
        this.debugMeshes = [];
    }
    
    setupContactMaterials() {
        // Player on snow contact
        const playerSnowContact = new CANNON.ContactMaterial(
            this.materials.player,
            this.materials.snow,
            {
                friction: 0.1,
                restitution: 0.2,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerSnowContact);
        
        // Player on ice contact (slippery)
        const playerIceContact = new CANNON.ContactMaterial(
            this.materials.player,
            this.materials.ice,
            {
                friction: 0.01,
                restitution: 0.4,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerIceContact);
    }
    
    update(deltaTime) {
        // Update physics simulation
        this.world.step(deltaTime);
        
        // Update debug visuals if enabled
        if (this.debugRenderer) {
            this.updateDebug();
        }
    }
    
    updateDebug() {
        // Update debug visualization to match physics bodies
        this.debugRenderer.update();
    }
    
    enableDebug(scene) {
        // Initialize debug renderer for visualizing physics bodies
        this.debugRenderer = new CannonDebugRenderer(scene, this.world);
    }
    
    disableDebug() {
        // Remove debug visualization
        if (this.debugRenderer) {
            this.debugRenderer.clearMeshes();
            this.debugRenderer = null;
        }
    }
}

/**
 * Class for visualizing Cannon.js physics bodies in Three.js
 * Based on the original CannonDebugRenderer by schteppe
 */
class CannonDebugRenderer {
    constructor(scene, world, options) {
        this.scene = scene;
        this.world = world;
        
        this.options = Object.assign({
            color: 0x00ff00,
            scale: 1,
            wireframe: true
        }, options);
        
        this._meshes = [];
        
        this._material = new THREE.MeshBasicMaterial({
            color: this.options.color,
            wireframe: this.options.wireframe
        });
        
        this._sphereGeometry = new THREE.SphereGeometry(1);
        this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
        this._cylinderGeometry = new THREE.CylinderGeometry(1, 1, 10, 10);
    }
    
    update() {
        // Clear the previous meshes
        this.clearMeshes();
        
        // Create new meshes for each body
        const bodies = this.world.bodies;
        
        for (let i = 0; i < bodies.length; i++) {
            this.addVisual(bodies[i]);
        }
    }
    
    addVisual(body) {
        // Create a mesh for the body
        const mesh = this._createMesh(body);
        
        if (mesh) {
            this.scene.add(mesh);
            this._meshes.push(mesh);
            
            // Update the mesh position and rotation
            this._updateMesh(mesh, body);
        }
    }
    
    _createMesh(body) {
        let mesh = null;
        const material = this._material;
        
        switch (body.shapes[0].type) {
            case CANNON.Shape.types.SPHERE:
                mesh = new THREE.Mesh(this._sphereGeometry, material);
                break;
                
            case CANNON.Shape.types.BOX:
                mesh = new THREE.Mesh(this._boxGeometry, material);
                break;
                
            case CANNON.Shape.types.PLANE:
                mesh = new THREE.Mesh(this._planeGeometry, material);
                break;
                
            case CANNON.Shape.types.CYLINDER:
                mesh = new THREE.Mesh(this._cylinderGeometry, material);
                break;
        }
        
        return mesh;
    }
    
    _updateMesh(mesh, body) {
        // Update mesh scale based on body shape
        const shape = body.shapes[0];
        
        if (shape.type === CANNON.Shape.types.SPHERE) {
            mesh.scale.set(
                shape.radius * this.options.scale,
                shape.radius * this.options.scale,
                shape.radius * this.options.scale
            );
        } else if (shape.type === CANNON.Shape.types.BOX) {
            mesh.scale.set(
                shape.halfExtents.x * 2 * this.options.scale,
                shape.halfExtents.y * 2 * this.options.scale,
                shape.halfExtents.z * 2 * this.options.scale
            );
        } else if (shape.type === CANNON.Shape.types.PLANE) {
            // Keep plane dimensions
        } else if (shape.type === CANNON.Shape.types.CYLINDER) {
            mesh.scale.set(
                shape.radiusTop * this.options.scale,
                shape.height * this.options.scale,
                shape.radiusBottom * this.options.scale
            );
        }
        
        // Update mesh position and rotation to match body
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    }
    
    clearMeshes() {
        // Remove all debug meshes
        for (let i = 0; i < this._meshes.length; i++) {
            this.scene.remove(this._meshes[i]);
        }
        
        this._meshes = [];
    }
} 