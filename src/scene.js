import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import habitatsData from './data/habitats.json';

export function setupScene(game) {
  // Create scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0000ff, 10, 300);
  scene.background = new THREE.Color(0x001030);
  
  // Create camera (first-person height ~1.6m)
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 10, 0);
  
  // Setup controls
  const controls = setupControls(camera, game);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);
  
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.set(100, 100, 50);
  scene.add(sunLight);
  
  // Create water surfaces
  const water = createWater();
  scene.add(water);
  
  // Create zones
  const zones = createZones(scene);
  
  // Add zone markers
  createZoneMarkers(scene, zones);
  
  // Create arena boundary
  createBoundary(scene);
  
  return {
    scene,
    camera,
    controls,
    zones,
    water
  };
}

function setupControls(camera, game) {
  const canvas = game.renderer?.domElement || document.getElementById('gameCanvas');
  
  // Try pointer lock first
  let controls;
  let usePointerLock = true;
  
  try {
    controls = new PointerLockControls(camera, document.body);
    
    // Movement state
    const moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    // Multiple event listeners for better detection
    const handleClick = (e) => {
      console.log('Click event detected! isLocked:', controls.isLocked, 'button:', e.button);
      
      if (controls.isLocked) {
        // Try to boop when pointer is locked
        console.log('Pointer is locked, attempting boop');
        e.preventDefault();
        e.stopPropagation();
        
        // Use center of screen for pointer lock since cursor is hidden
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        console.log('Using center coordinates:', centerX, centerY);
        
        game.attemptBoop(centerX, centerY);
      } else {
        console.log('Locking pointer controls');
        controls.lock();
      }
    };
    
    // Add multiple listeners to catch the event
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        console.log('Mousedown detected, isLocked:', controls.isLocked);
        if (controls.isLocked) {
          handleClick(e);
        }
      }
    });
    
    // Also listen on document when pointer is locked
    document.addEventListener('click', (e) => {
      if (controls.isLocked) {
        console.log('Document click while locked');
        handleClick(e);
      }
    });
    
    // Show/hide pointer lock prompt
    controls.addEventListener('lock', () => {
      console.log('Pointer locked');
      const prompt = document.getElementById('pointerLockPrompt');
      if (prompt) prompt.classList.add('hidden');
    });
    
    controls.addEventListener('unlock', () => {
      console.log('Pointer unlocked');
      const prompt = document.getElementById('pointerLockPrompt');
      if (prompt) prompt.classList.remove('hidden');
    });
    
    // Keyboard controls including F for boop (as backup)
    document.addEventListener('keydown', (e) => {
      switch(e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': 
          e.preventDefault();
          moveState.up = true; 
          break;
        case 'ControlLeft':
        case 'ControlRight':
          e.preventDefault();
          moveState.down = true;
          break;
        case 'KeyF':
          // F key as alternative boop trigger
          if (controls.isLocked) {
            console.log('F key pressed - attempting boop');
            game.attemptBoop(window.innerWidth / 2, window.innerHeight / 2);
          }
          break;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.up = false; break;
        case 'ControlLeft':
        case 'ControlRight': 
          moveState.down = false;
          break;
      }
    });
    
    // Custom update function for swimming physics
    controls.update = function(deltaTime) {
      if (!controls.isLocked) return;
      
      // Apply movement with swimming inertia
      const speed = 20.0; // meters per second (increased from 8.0)
      const drag = 2.0; // water resistance (reduced for faster movement)
      
      direction.z = Number(moveState.forward) - Number(moveState.backward);
      direction.x = Number(moveState.right) - Number(moveState.left);
      direction.y = Number(moveState.up) - Number(moveState.down);
      direction.normalize();
      
      // Get camera direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      // Calculate movement vector
      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, camera.up).normalize();
      
      // Apply forces
      if (direction.length() > 0) {
        velocity.x += (right.x * direction.x + cameraDirection.x * direction.z) * speed * deltaTime;
        velocity.z += (right.z * direction.x + cameraDirection.z * direction.z) * speed * deltaTime;
        velocity.y += direction.y * speed * deltaTime;
      }
      
      // Apply drag
      velocity.multiplyScalar(1 - drag * deltaTime);
      
      // Update position
      camera.position.add(velocity.clone().multiplyScalar(deltaTime));
      
      // Keep within arena bounds (250m × 250m × 150m)
      camera.position.x = Math.max(-125, Math.min(125, camera.position.x));
      camera.position.z = Math.max(-125, Math.min(125, camera.position.z));
      camera.position.y = Math.max(-75, Math.min(75, camera.position.y));
    };
    
    controls.moveState = moveState;
    controls.velocity = velocity;
    
  } catch (e) {
    console.warn('PointerLockControls failed, using OrbitControls fallback');
    usePointerLock = false;
    
    // Fallback to orbit controls
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.maxDistance = 300;
    controls.minDistance = 1;
    
    // Click handler for orbit controls - works without pointer lock!
    canvas.addEventListener('click', (e) => {
      console.log('Click detected in OrbitControls mode - attempting boop');
      game.attemptBoop(e.clientX, e.clientY);
    });
    
    // Hide pointer lock prompt for orbit controls
    const prompt = document.getElementById('pointerLockPrompt');
    if (prompt) prompt.style.display = 'none';
  }
  
  return controls;
}

function createWater() {
  const group = new THREE.Group();
  
  // Surface water plane - fixed position
  const surfaceGeometry = new THREE.PlaneGeometry(300, 300);
  const surfaceMaterial = new THREE.MeshPhongMaterial({
    color: 0x006994,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false  // Prevent z-fighting
  });
  
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, 75, 0);  // Explicit position
  surface.name = 'waterSurface';
  group.add(surface);
  
  // Side water planes - fixed positions
  const sideGeometry = new THREE.PlaneGeometry(300, 150);
  const sideWater1 = new THREE.Mesh(sideGeometry, surfaceMaterial);
  sideWater1.position.set(0, 0, -125);
  sideWater1.name = 'waterSide1';
  group.add(sideWater1);
  
  const sideWater2 = new THREE.Mesh(sideGeometry, surfaceMaterial);
  sideWater2.position.set(0, 0, 125);
  sideWater2.name = 'waterSide2';
  group.add(sideWater2);
  
  // Ensure water doesn't move
  group.matrixAutoUpdate = false;
  group.updateMatrix();
  
  return group;
}

function createZones(scene) {
  const zones = [];
  const habitats = habitatsData.habitats;
  
  // Create box zones based on bounds
  habitats.forEach((habitat, i) => {
    const zone = {
      id: habitat.id,
      label: habitat.label,
      bounds: habitat.bounds,
      fogColor: new THREE.Color(habitat.fog_color),
      ambientColor: new THREE.Color(habitat.ambient_color),
      depthRange: habitat.typical_depth_range
    };
    
    // Add zone-specific props
    addZoneProps(scene, zone);
    
    zones.push(zone);
  });
  
  return zones;
}

function addZoneProps(scene, zone) {
  const bounds = zone.bounds;
  const centerX = (bounds.x[0] + bounds.x[1]) / 2;
  const centerY = (bounds.y[0] + bounds.y[1]) / 2;
  const centerZ = (bounds.z[0] + bounds.z[1]) / 2;
  
  switch(zone.id) {
    case 'coral_reef':
      // Add colorful coral billboards in shallow area
      for (let i = 0; i < 20; i++) {
        const coral = createBillboard(
          [0xff6b9d, 0xfeca57, 0x48dbfb, 0xff9ff3][Math.floor(Math.random() * 4)],
          2 + Math.random() * 3
        );
        coral.position.set(
          bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
          bounds.y[0] + Math.random() * (bounds.y[1] - bounds.y[0]),
          bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
        );
        scene.add(coral);
      }
      
      // Add brighter zone light
      const reefLight = new THREE.PointLight(0xffdd00, 0.5, 100);
      reefLight.position.set(centerX, centerY, centerZ);
      scene.add(reefLight);
      break;
      
    case 'kelp_forest':
      // Add tall kelp cards
      for (let i = 0; i < 25; i++) {
        const kelp = createKelp();
        kelp.position.set(
          bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
          bounds.y[0] + 7.5, // Kelp anchored to bottom of zone
          bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
        );
        scene.add(kelp);
      }
      
      // Green light shafts
      const kelpLight = new THREE.DirectionalLight(0x3cb371, 0.3);
      kelpLight.position.set(centerX, bounds.y[1], centerZ);
      kelpLight.target.position.set(centerX, bounds.y[0], centerZ);
      scene.add(kelpLight);
      scene.add(kelpLight.target);
      break;
      
    case 'deep_sea':
      // Add bioluminescent particles
      const particles = createBioluminescentParticles(zone);
      scene.add(particles);
      
      // Very dim ambient light
      const deepLight = new THREE.PointLight(0x191970, 0.2, 150);
      deepLight.position.set(centerX, centerY, centerZ);
      scene.add(deepLight);
      break;
      
    case 'polar':
      // Add floating ice meshes at surface
      for (let i = 0; i < 10; i++) {
        const ice = createIceberg();
        ice.position.set(
          bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
          Math.random() * 20 + 55, // Near surface
          125 // Against polar wall
        );
        scene.add(ice);
      }
      
      // Cold blue-white light
      const polarLight = new THREE.DirectionalLight(0xb0e0e6, 0.4);
      polarLight.position.set(centerX, 50, 125);
      scene.add(polarLight);
      break;
      
    case 'seagrass_mangrove':
      // Add seagrass planes in shallow corner
      for (let i = 0; i < 30; i++) {
        const grass = createSeagrass();
        grass.position.set(
          bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
          bounds.y[0] + 1.5, // Just above bottom
          bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
        );
        scene.add(grass);
      }
      break;
      
    case 'open_ocean':
      // Sparse environment, just add some light shafts
      const oceanLight = new THREE.DirectionalLight(0x0000cd, 0.3);
      oceanLight.position.set(0, 75, 0);
      oceanLight.target.position.set(0, -75, 0);
      scene.add(oceanLight);
      scene.add(oceanLight.target);
      break;
  }
}

function createBillboard(color, size) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = Math.random() * Math.PI;
  return mesh;
}

function createKelp() {
  const geometry = new THREE.PlaneGeometry(2, 15);
  const material = new THREE.MeshBasicMaterial({
    color: 0x2d5016,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const kelp = new THREE.Mesh(geometry, material);
  kelp.rotation.y = Math.random() * Math.PI;
  return kelp;
}

function createBioluminescentParticles(zone) {
  const particleCount = 150;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const bounds = zone.bounds;
  
  for (let i = 0; i < particleCount; i++) {
    positions.push(
      bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
      bounds.y[0] + Math.random() * (bounds.y[1] - bounds.y[0]),
      bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
    );
    
    // Bioluminescent blue-green
    colors.push(0, 0.5 + Math.random() * 0.5, 0.8 + Math.random() * 0.2);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });
  
  return new THREE.Points(geometry, material);
}

function createIceberg() {
  const geometry = new THREE.IcosahedronGeometry(5 + Math.random() * 10, 0);
  const material = new THREE.MeshPhongMaterial({
    color: 0xeeffff,
    transparent: true,
    opacity: 0.9
  });
  const ice = new THREE.Mesh(geometry, material);
  ice.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  return ice;
}

function createSeagrass() {
  const geometry = new THREE.PlaneGeometry(1, 3);
  const material = new THREE.MeshBasicMaterial({
    color: 0x3a5f3a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  const grass = new THREE.Mesh(geometry, material);
  grass.rotation.y = Math.random() * Math.PI;
  return grass;
}

function createZoneMarkers(scene, zones) {
  zones.forEach((zone) => {
    const bounds = zone.bounds;
    const centerX = (bounds.x[0] + bounds.x[1]) / 2;
    const centerY = (bounds.y[0] + bounds.y[1]) / 2;
    const centerZ = (bounds.z[0] + bounds.z[1]) / 2;
    
    // Create floating text marker for zone
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 512, 256);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, 256, 140);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(20, 10, 1);
    sprite.position.set(centerX, centerY, centerZ);
    
    scene.add(sprite);
  });
}

function createBoundary(scene) {
  // Create wireframe box for arena boundaries
  const geometry = new THREE.BoxGeometry(250, 150, 250);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ 
    color: 0x0066cc,
    transparent: true,
    opacity: 0.3
  });
  const boundary = new THREE.LineSegments(edges, material);
  scene.add(boundary);
  
  // Add corner markers for orientation
  const corners = [
    [-125, -75, -125], [125, -75, -125],
    [-125, -75, 125], [125, -75, 125],
    [-125, 75, -125], [125, 75, -125],
    [-125, 75, 125], [125, 75, 125]
  ];
  
  corners.forEach(corner => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(2),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x00ffff })
    );
    marker.position.set(...corner);
    scene.add(marker);
  });
}