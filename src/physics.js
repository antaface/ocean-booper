import * as THREE from 'three';

export function setupPhysics(game) {
  const physics = {
    game,
    gravity: new THREE.Vector3(0, 0.5, 0), // Slight buoyancy
    waterDrag: 0.98,
    boundaries: {
      minX: -125,
      maxX: 125,
      minY: -75,
      maxY: 75,
      minZ: -125,
      maxZ: 125
    }
  };

  physics.update = function(deltaTime) {
    if (!game.controls || !game.camera) return;
    
    // Apply buoyancy effect
    if (game.controls.velocity) {
      // Gentle floating effect when not moving
      const idleFloat = Math.sin(Date.now() * 0.0005) * 0.1;
      
      if (game.controls.velocity.length() < 0.5) {
        game.camera.position.y += idleFloat * deltaTime;
      }
      
      // Apply water drag
      game.controls.velocity.multiplyScalar(this.waterDrag);
    }
    
    // Enforce boundaries
    this.enforceBoundaries();
  };

  physics.enforceBoundaries = function() {
    const pos = game.camera.position;
    
    // X boundaries
    if (pos.x < this.boundaries.minX) {
      pos.x = this.boundaries.minX;
      if (game.controls.velocity) {
        game.controls.velocity.x = Math.abs(game.controls.velocity.x) * 0.5;
      }
    } else if (pos.x > this.boundaries.maxX) {
      pos.x = this.boundaries.maxX;
      if (game.controls.velocity) {
        game.controls.velocity.x = -Math.abs(game.controls.velocity.x) * 0.5;
      }
    }
    
    // Y boundaries
    if (pos.y < this.boundaries.minY) {
      pos.y = this.boundaries.minY;
      if (game.controls.velocity) {
        game.controls.velocity.y = Math.abs(game.controls.velocity.y) * 0.5;
      }
    } else if (pos.y > this.boundaries.maxY) {
      pos.y = this.boundaries.maxY;
      if (game.controls.velocity) {
        game.controls.velocity.y = -Math.abs(game.controls.velocity.y) * 0.5;
      }
    }
    
    // Z boundaries
    if (pos.z < this.boundaries.minZ) {
      pos.z = this.boundaries.minZ;
      if (game.controls.velocity) {
        game.controls.velocity.z = Math.abs(game.controls.velocity.z) * 0.5;
      }
    } else if (pos.z > this.boundaries.maxZ) {
      pos.z = this.boundaries.maxZ;
      if (game.controls.velocity) {
        game.controls.velocity.z = -Math.abs(game.controls.velocity.z) * 0.5;
      }
    }
  };

  physics.applyCurrents = function(position) {
    // Find which zone we're in
    let currentZoneId = null;
    
    if (game.zones) {
      for (const zone of game.zones) {
        const bounds = zone.bounds;
        if (position.x >= bounds.x[0] && position.x <= bounds.x[1] &&
            position.y >= bounds.y[0] && position.y <= bounds.y[1] &&
            position.z >= bounds.z[0] && position.z <= bounds.z[1]) {
          currentZoneId = zone.id;
          break;
        }
      }
    }
    
    const current = new THREE.Vector3();
    
    // Different zones have different current patterns
    switch(currentZoneId) {
      case 'coral_reef':
        // Gentle circular current in shallow water
        current.x = Math.sin(Date.now() * 0.0001) * 0.5;
        current.z = Math.cos(Date.now() * 0.0001) * 0.5;
        break;
      case 'kelp_forest':
        // Vertical currents through kelp
        current.y = Math.sin(Date.now() * 0.0002) * 0.3;
        break;
      case 'open_ocean':
        // Stronger horizontal current
        current.x = 1.0;
        break;
      case 'deep_sea':
        // Slow drift in deep water
        current.x = Math.sin(Date.now() * 0.00005) * 0.2;
        current.z = Math.cos(Date.now() * 0.00005) * 0.2;
        break;
      case 'polar':
        // Ice drift along wall
        current.x = 0.3;
        current.y = Math.sin(Date.now() * 0.0001) * 0.2;
        break;
      case 'seagrass_mangrove':
        // Tidal flow
        current.x = Math.sin(Date.now() * 0.0001) * 0.8;
        break;
    }
    
    return current;
  };

  return physics;
}