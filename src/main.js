import * as THREE from 'three';
import { setupScene } from './scene.js';
import { setupUI } from './ui.js';
import { CreatureManager } from './creatures.js';
import { setupPhysics } from './physics.js';
import { AssetLoader } from './assets.js';

class FirstPersonBooper {
  constructor() {
    this.webglEnabled = true;
    this.isRunning = false;
    this.score = 0;
    this.boopdex = new Map();
    this.sessionLog = [];
  }

  async init() {
    console.log('Initializing First Person Booper...');
    
    // Setup start modal
    this.setupStartModal();
    
    // Check WebGL support
    const canvas = document.getElementById('gameCanvas');
    const testContext = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!testContext) {
      console.warn('WebGL not supported, falling back to 2D mode');
      this.webglEnabled = false;
    }

    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.getElementById('mobileWarning').classList.remove('hidden');
    }

    // Initialize asset loader
    this.assetLoader = new AssetLoader();
    await this.assetLoader.loadAll();

    // Setup based on mode
    if (this.webglEnabled) {
      await this.init3D();
    } else {
      await this.init2D();
    }

    // Setup UI
    this.ui = setupUI(this);

    // Start game loop (but paused until modal closed)
    this.isRunning = false;
    this.animate();
  }
  
  setupStartModal() {
    const modal = document.getElementById('startModal');
    const startButton = document.getElementById('startButton');
    
    // Start button handler
    const startGame = () => {
      modal.classList.add('hidden');
      this.isRunning = true;
      
      // Show pointer lock prompt instead of auto-locking
      const prompt = document.getElementById('pointerLockPrompt');
      if (prompt && this.controls && this.controls.lock) {
        prompt.classList.remove('hidden');
      }
    };
    
    startButton.addEventListener('click', startGame);
    
    // Also allow Enter to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !modal.classList.contains('hidden')) {
        startGame();
      }
    });
  }

  async init3D() {
    console.log('Initializing 3D mode...');
    
    // Setup Three.js scene
    const canvas = document.getElementById('gameCanvas');
    this.renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create scene and camera
    const sceneData = setupScene(this);
    this.scene = sceneData.scene;
    this.camera = sceneData.camera;
    this.controls = sceneData.controls;
    this.zones = sceneData.zones;
    this.water = sceneData.water;
    
    console.log('Scene setup complete, controls type:', this.controls.constructor.name);
    
    // Setup physics
    this.physics = setupPhysics(this);
    
    // Initialize creature manager
    this.creatureManager = new CreatureManager(this);
    await this.creatureManager.loadCreatures();
    this.creatureManager.spawnCreatures();
    
    console.log('Creatures spawned, total:', this.creatureManager.creatures.length);

    // Setup raycaster for booping with larger detection area
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 30; // Very generous boop range
    this.raycaster.params.Points = { threshold: 5 };
    this.raycaster.params.Line = { threshold: 5 };
    this.raycaster.params.Mesh = {}; // Default mesh detection
    
    // Window resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  async init2D() {
    console.log('Initializing 2D fallback mode...');
    const { setup2DCanvas } = await import('./canvas2d.js');
    this.canvas2d = setup2DCanvas(this);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Skip updates if game hasn't started
    if (!this.isRunning) return;
    
    const deltaTime = this.clock ? this.clock.getDelta() : 0.016;
    if (!this.clock) {
      this.clock = new THREE.Clock();
    }
    
    // Update based on mode
    if (this.webglEnabled && this.renderer) {
      this.update3D(deltaTime);
    } else if (this.canvas2d) {
      this.canvas2d.update(deltaTime);
    }
  }

  update3D(deltaTime) {
    // Always render the scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    
    // Only update game logic if running
    if (this.isRunning) {
      // Update controls
      if (this.controls && this.controls.update) {
        this.controls.update(deltaTime);
      }
      
      // Update physics
      if (this.physics) {
        this.physics.update(deltaTime);
      }
      
      // Update speed indicator
      this.updateSpeedIndicator();
      
      // Update creatures
      if (this.creatureManager) {
        this.creatureManager.update(deltaTime);
        
        // Check for creature under crosshair
        this.checkCreatureAiming();
        
        // Update distance indicator
        this.updateDistanceIndicator();
      }
      
      // Update zone detection
      this.updateCurrentZone();
      
      // Update minimap
      this.updateMinimap();
    }
  }
  
  updateSpeedIndicator() {
    if (this.controls && this.controls.velocity) {
      const velocity = this.controls.velocity;
      const speed = velocity.length(); // m/s
      const kph = Math.round(speed * 3.6); // Convert to km/h
      document.getElementById('speedValue').textContent = kph;
    }
  }
  
  updateDistanceIndicator() {
    if (!this.creatureManager || !this.camera) return;
    
    const creatures = this.creatureManager.getAllCreatures();
    if (!creatures || creatures.length === 0) {
      document.getElementById('distanceValue').textContent = '--';
      return;
    }
    
    let closestDistance = Infinity;
    let closestCreature = null;
    const cameraPos = this.camera.position.clone();
    
    // Find closest creature
    creatures.forEach(creature => {
      if (!creature.mesh) return;
      
      const creaturePos = new THREE.Vector3();
      creature.mesh.getWorldPosition(creaturePos);
      const distance = cameraPos.distanceTo(creaturePos);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCreature = creature;
      }
    });
    
    const distanceElement = document.getElementById('distanceIndicator');
    const distanceValue = document.getElementById('distanceValue');
    
    if (closestCreature && closestDistance < Infinity) {
      // Round to 1 decimal place
      const displayDistance = closestDistance.toFixed(1);
      distanceValue.textContent = `${displayDistance}m`;
      
      // Add visual feedback when in boop range
      if (closestDistance < 25) {
        distanceElement.classList.add('in-range');
        distanceValue.textContent = `${displayDistance}m - IN RANGE!`;
      } else {
        distanceElement.classList.remove('in-range');
      }
    } else {
      distanceValue.textContent = '--';
      distanceElement.classList.remove('in-range');
    }
  }
  
  updateMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas || !this.zones || !this.camera) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 150;
    
    // Clear minimap
    ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    ctx.fillRect(0, 0, 150, 150);
    
    // Draw zones
    const scale = 150 / 250; // Arena is 250m wide, minimap is 150px
    
    this.zones.forEach(zone => {
      const bounds = zone.bounds;
      // Use hex color string or fallback
      const colorStr = zone.fogColor.getStyle ? zone.fogColor.getStyle() : '#0066cc';
      ctx.fillStyle = colorStr + '40';
      ctx.fillRect(
        (bounds.x[0] + 125) * scale,
        (bounds.z[0] + 125) * scale,
        (bounds.x[1] - bounds.x[0]) * scale,
        (bounds.z[1] - bounds.z[0]) * scale
      );
    });
    
    // Draw boundary
    ctx.strokeStyle = 'rgba(0, 102, 204, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 148, 148);
    
    // Draw creatures as dots
    if (this.creatureManager && this.creatureManager.creatures) {
      this.creatureManager.creatures.forEach(creature => {
        if (creature.mesh && creature.mesh.position) {
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(
            (creature.mesh.position.x + 125) * scale - 1,
            (creature.mesh.position.z + 125) * scale - 1,
            2, 2
          );
        }
      });
    }
    
    // Draw player
    const px = (this.camera.position.x + 125) * scale;
    const pz = (this.camera.position.z + 125) * scale;
    
    ctx.save();
    ctx.translate(px, pz);
    
    // Get camera direction
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);
    ctx.rotate(angle);
    
    // Draw player arrow
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3, 3);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  checkCreatureAiming() {
    // Raycast from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    const creatures = this.creatureManager.getAllCreatures();
    const intersects = this.raycaster.intersectObjects(creatures.map(c => c.mesh));
    
    const creatureLabel = document.getElementById('creatureLabel');
    
    if (intersects.length > 0) {
      const creature = intersects[0].object.userData.creature;
      if (creature) {
        creatureLabel.textContent = creature.common_name;
        creatureLabel.classList.add('visible');
      }
    } else {
      creatureLabel.classList.remove('visible');
    }
  }

  updateCurrentZone() {
    if (!this.camera || !this.zones) return;
    
    const pos = this.camera.position;
    
    // Find which zone the player is in based on box bounds
    let currentZone = null;
    let zoneIndex = -1;
    
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const bounds = zone.bounds;
      
      if (pos.x >= bounds.x[0] && pos.x <= bounds.x[1] &&
          pos.y >= bounds.y[0] && pos.y <= bounds.y[1] &&
          pos.z >= bounds.z[0] && pos.z <= bounds.z[1]) {
        currentZone = zone;
        zoneIndex = i;
        break;
      }
    }
    
    // Default to open ocean if not in any specific zone
    if (!currentZone && this.zones.length > 0) {
      currentZone = this.zones.find(z => z.id === 'open_ocean') || this.zones[2];
      zoneIndex = 2;
    }
    
    const zoneLabel = document.getElementById('zoneLabel');
    if (currentZone && zoneLabel.textContent !== currentZone.label) {
      zoneLabel.textContent = currentZone.label;
      
      // Update fog for zone
      this.scene.fog.color.copy(currentZone.fogColor);
    }
  }

  attemptBoop(screenX, screenY) {
    console.log('=== attemptBoop called ===');
    console.log('WebGL enabled:', this.webglEnabled);
    console.log('Screen coordinates:', screenX, screenY);
    
    if (!this.webglEnabled) {
      // Handle 2D boop
      if (this.canvas2d) {
        this.canvas2d.handleBoop(screenX, screenY);
      }
      return;
    }
    
    // Check if we have required objects
    if (!this.creatureManager) {
      console.error('CreatureManager not initialized!');
      return;
    }
    
    if (!this.camera) {
      console.error('Camera not initialized!');
      return;
    }
    
    console.log('Attempting boop...');
    
    // Get all creatures
    const creatures = this.creatureManager.getAllCreatures();
    console.log(`Found ${creatures.length} creatures to check`);
    
    if (!creatures || creatures.length === 0) {
      console.log('No creatures available to boop');
      this.showBoopFeedback('No creatures nearby', false);
      return;
    }
    
    let closestCreature = null;
    let closestDistance = Infinity;
    let closestPoint = null;
    
    // Get camera position and direction
    const cameraPos = this.camera.position.clone();
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    
    // Check each creature with improved detection
    creatures.forEach(creature => {
      if (!creature.mesh) return;
      
      // Get world position of creature mesh
      const creaturePos = new THREE.Vector3();
      creature.mesh.getWorldPosition(creaturePos);
      
      const distance = cameraPos.distanceTo(creaturePos);
      
      // Direction to creature
      const toCreature = new THREE.Vector3();
      toCreature.subVectors(creaturePos, cameraPos).normalize();
      
      // Check angle (dot product)
      const angle = cameraDir.dot(toCreature);
      
      // More generous detection: 
      // - Within 25 meters for direct clicks
      // - Within 15 meters even if not perfectly aimed
      // - Must be somewhat in front of camera (angle > 0.3)
      const maxDistance = angle > 0.7 ? 25 : 15; // More range if well-aimed
      
      console.log(`Creature ${creature.data.common_name}: ${distance.toFixed(1)}m, angle: ${angle.toFixed(2)}`);
      
      if (distance < maxDistance && angle > 0.3 && distance < closestDistance) {
        closestCreature = creature;
        closestDistance = distance;
        closestPoint = creaturePos;
      }
    });
    
    if (closestCreature) {
      const creatureData = closestCreature.data;
      const mesh = closestCreature.mesh;
      
      console.log(`Closest creature: ${creatureData.common_name} at ${closestDistance.toFixed(1)}m`);
      
      // Check if recently booped
      if (this.isRecentlyBooped(mesh)) {
        console.log('Creature was recently booped, cooldown active');
        this.showBoopFeedback(`${creatureData.common_name} needs time to recover!`, false);
        return;
      }
      
      // BOOP SUCCESS!
      console.log(`BOOP SUCCESS! ${creatureData.common_name}`);
      
      this.doBoopFX(closestPoint);
      this.markBooped(mesh);
      this.score++;
      this.updateScore();
      this.logBoop(creatureData, closestPoint);
      
      // Show boop success text
      this.showBoopSuccess(closestPoint);
      
      // Update boopdex
      const key = creatureData.id || creatureData.common_name;
      const current = this.boopdex.get(key) || 0;
      this.boopdex.set(key, current + 1);
      
      // Update UI
      if (this.ui && this.ui.updateBoopdex) {
        this.ui.updateBoopdex();
      }
      
      // Visual feedback on creature
      this.creatureBoopAnimation(mesh);
      
      // Play enhanced boop sound
      this.playBoopSound();
      
    } else {
      console.log('No creature in boop range or angle');
      this.showBoopFeedback('Too far! Get closer to boop', false);
      
      // Show all creature distances for debugging
      creatures.forEach(c => {
        if (c.mesh) {
          const pos = new THREE.Vector3();
          c.mesh.getWorldPosition(pos);
          const dist = cameraPos.distanceTo(pos);
          console.log(`  - ${c.data.common_name}: ${dist.toFixed(1)}m away`);
        }
      });
    }
  }
  
  showBoopFeedback(message, success = false) {
    // Create temporary feedback message
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 60%;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.7);
      color: ${success ? '#00ff00' : '#ff6666'};
      font-size: 18px;
      font-weight: bold;
      border-radius: 5px;
      z-index: 1000;
      pointer-events: none;
      animation: fadeOut 2s forwards;
    `;
    feedback.textContent = message;
    
    // Add fade out animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    
    if (!document.head.querySelector('style[data-boop-feedback]')) {
      style.setAttribute('data-boop-feedback', 'true');
      document.head.appendChild(style);
    }
    
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2000);
  }
  
  showBoopSuccess(position) {
    // Create floating +1 Boop! text
    const boopText = document.createElement('div');
    boopText.className = 'boop-success';
    boopText.textContent = '+1 Boop!';
    
    // Convert 3D position to screen coordinates
    const vector = position.clone();
    vector.project(this.camera);
    
    const x = (vector.x + 1) * window.innerWidth / 2;
    const y = (-vector.y + 1) * window.innerHeight / 2;
    
    boopText.style.left = x + 'px';
    boopText.style.top = y + 'px';
    
    document.body.appendChild(boopText);
    
    // Animate upward and fade out
    setTimeout(() => {
      boopText.style.transform = 'translateY(-50px)';
      boopText.style.opacity = '0';
    }, 10);
    
    setTimeout(() => boopText.remove(), 1000);
  }
  
  playBoopSound() {
    // Enhanced boop sound with pitch variation
    if (this.assetLoader && this.assetLoader.sounds.boop) {
      const sound = this.assetLoader.sounds.boop;
      sound.playbackRate = 0.9 + Math.random() * 0.3; // Vary pitch
      sound.play();
    } else {
      // Fallback Web Audio API ding
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Pleasant ding sound
        oscillator.frequency.value = 800 + Math.random() * 200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        console.warn('Could not play sound:', e);
      }
    }
  }
  
  creatureBoopAnimation(object) {
    // Handle both single meshes and groups
    const meshesToAnimate = [];
    
    if (object.type === 'Group') {
      // It's a group, animate all children
      object.traverse(child => {
        if (child.type === 'Mesh' && child.material) {
          meshesToAnimate.push(child);
        }
      });
    } else if (object.material) {
      // It's a single mesh
      meshesToAnimate.push(object);
    }
    
    // Store original colors and animate all meshes
    meshesToAnimate.forEach(mesh => {
      // Store original values
      const originalColor = mesh.material.color ? mesh.material.color.clone() : null;
      const originalEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : null;
      const originalIntensity = mesh.material.emissiveIntensity || 0.1;
      
      // Apply boop effect
      if (mesh.material.color) {
        mesh.material.color = new THREE.Color(0xffff00);
      }
      if (mesh.material.emissive) {
        mesh.material.emissive = new THREE.Color(0xffff00);
        mesh.material.emissiveIntensity = 0.8;
      }
      
      // Restore original colors after animation
      setTimeout(() => {
        if (originalColor && mesh.material.color) {
          mesh.material.color.copy(originalColor);
        }
        if (originalEmissive && mesh.material.emissive) {
          mesh.material.emissive.copy(originalEmissive);
          mesh.material.emissiveIntensity = originalIntensity;
        }
      }, 500);
    });
    
    // Brief scale animation for the whole object
    const originalScale = object.scale.clone();
    object.scale.multiplyScalar(1.3);
    setTimeout(() => {
      object.scale.copy(originalScale);
    }, 300);
  }

  isRecentlyBooped(object) {
    const now = Date.now();
    const lastBoop = object.userData.lastBoopTime || 0;
    return (now - lastBoop) < 10000; // 10 second cooldown
  }

  markBooped(object) {
    object.userData.lastBoopTime = Date.now();
  }

  doBoopFX(position) {
    // Create particle effect
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'boop-particle';
      
      // Convert 3D position to screen coordinates
      const vector = position.clone();
      vector.project(this.camera);
      
      const x = (vector.x + 1) * window.innerWidth / 2;
      const y = (-vector.y + 1) * window.innerHeight / 2;
      
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      
      // Random direction
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const distance = 20 + Math.random() * 30;
      particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
      
      document.body.appendChild(particle);
      
      setTimeout(() => particle.remove(), 800);
    }
    
    // Play sound if available
    if (this.assetLoader && this.assetLoader.sounds.boop) {
      this.assetLoader.sounds.boop.play();
    }
  }

  logBoop(creature, position) {
    this.sessionLog.push({
      timestamp: Date.now(),
      species: creature.common_name,
      habitat: creature.habitat,
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z)
      }
    });
  }

  updateScore() {
    document.getElementById('boopCounter').textContent = this.score;
  }

  toggleWebGL(enabled) {
    if (enabled !== this.webglEnabled) {
      this.webglEnabled = enabled;
      location.reload(); // Simple reload to switch modes
    }
  }

  onResize() {
    if (!this.webglEnabled) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize game
const game = new FirstPersonBooper();
game.init().catch(console.error);

// Expose for debugging
window.game = game;