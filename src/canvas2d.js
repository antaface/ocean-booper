import creaturesData from './data/creatures.json';
import habitatsData from './data/habitats.json';

export function setup2DCanvas(game) {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // 2D game state
  const canvas2d = {
    game,
    canvas,
    ctx,
    camera: { x: 0, y: 0, zoom: 1 },
    creatures: [],
    player: { x: 0, y: 0, angle: 0 }
  };

  // Setup canvas
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Initialize creatures for 2D
  initCreatures2D();

  // Mouse/touch controls
  canvas.addEventListener('click', (e) => {
    canvas2d.handleBoop(e.clientX, e.clientY);
  });

  // Keyboard controls for 2D movement
  const keys = {};
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  function initCreatures2D() {
    // Spawn creatures in their zones
    creaturesData.creatures.forEach(creatureType => {
      const count = getSpawnCount(creatureType.rarity);
      
      for (let i = 0; i < count; i++) {
        const zone = getZone(creatureType.habitat);
        if (!zone) continue;
        
        const bounds = zone.bounds;
        const x = bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]);
        const z = bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]);
        
        canvas2d.creatures.push({
          x: x,
          y: z, // Using z as y in 2D top-down view
          data: creatureType,
          lastBoopTime: 0,
          velocity: { x: 0, y: 0 },
          targetX: x,
          targetY: z,
          idleTimer: 0,
          zone: zone
        });
      }
    });
  }

  function getSpawnCount(rarity) {
    switch(rarity) {
      case 'common': return 2;
      case 'uncommon': return 1;
      case 'rare': return Math.random() < 0.5 ? 1 : 0;
      case 'very_rare': return Math.random() < 0.3 ? 1 : 0;
      default: return 1;
    }
  }

  function getZone(habitat) {
    return habitatsData.habitats.find(h => h.id === habitat) || null;
  }

  canvas2d.update = function(deltaTime) {
    // Clear canvas
    ctx.fillStyle = '#001030';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update player position
    const speed = 100; // pixels per second
    if (keys['KeyW']) canvas2d.player.y -= speed * deltaTime;
    if (keys['KeyS']) canvas2d.player.y += speed * deltaTime;
    if (keys['KeyA']) canvas2d.player.x -= speed * deltaTime;
    if (keys['KeyD']) canvas2d.player.x += speed * deltaTime;

    // Keep player in rectangular bounds
    canvas2d.player.x = Math.max(-125, Math.min(125, canvas2d.player.x));
    canvas2d.player.y = Math.max(-125, Math.min(125, canvas2d.player.y));

    // Center camera on player
    canvas2d.camera.x = canvas2d.player.x;
    canvas2d.camera.y = canvas2d.player.y;

    // Save context state
    ctx.save();

    // Apply camera transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(canvas2d.camera.zoom, canvas2d.camera.zoom);
    ctx.translate(-canvas2d.camera.x, -canvas2d.camera.y);

    // Draw zones
    drawZones();

    // Draw rectangular boundary
    ctx.strokeStyle = 'rgba(0, 102, 204, 0.3)';
    ctx.lineWidth = 5;
    ctx.strokeRect(-125, -125, 250, 250);

    // Update and draw creatures
    updateCreatures2D(deltaTime);
    drawCreatures();

    // Draw player
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(canvas2d.player.x - 5, canvas2d.player.y - 5, 10, 10);

    // Restore context
    ctx.restore();

    // Draw HUD (not affected by camera)
    drawHUD();
  };

  function drawZones() {
    habitatsData.habitats.forEach((habitat) => {
      const bounds = habitat.bounds;
      
      // Draw zone rectangle (using x and z bounds for top-down view)
      ctx.fillStyle = habitat.fog_color + '20'; // Add transparency
      ctx.fillRect(
        bounds.x[0], 
        bounds.z[0], 
        bounds.x[1] - bounds.x[0], 
        bounds.z[1] - bounds.z[0]
      );
      
      // Draw zone label at center
      const centerX = (bounds.x[0] + bounds.x[1]) / 2;
      const centerZ = (bounds.z[0] + bounds.z[1]) / 2;
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(habitat.label, centerX, centerZ);
    });
  }

  function updateCreatures2D(deltaTime) {
    canvas2d.creatures.forEach(creature => {
      creature.idleTimer += deltaTime;
      
      // Pick new target occasionally
      if (creature.idleTimer > 3 + Math.random() * 5) {
        creature.idleTimer = 0;
        
        // New random target within zone bounds
        const bounds = creature.zone.bounds;
        creature.targetX = bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]);
        creature.targetY = bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]);
      }
      
      // Move toward target
      const dx = creature.targetX - creature.x;
      const dy = creature.targetY - creature.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        const speed = creature.data.speed_mps * 20; // Convert to pixels
        creature.velocity.x = (dx / distance) * speed;
        creature.velocity.y = (dy / distance) * speed;
        
        creature.x += creature.velocity.x * deltaTime;
        creature.y += creature.velocity.y * deltaTime;
      }
    });
  }

  function drawCreatures() {
    canvas2d.creatures.forEach(creature => {
      const size = Math.max(5, creature.data.avg_length_m * 5); // Scale to pixels
      
      // Get color based on creature type
      const colors = {
        'blue_whale': '#4169e1',
        'moon_jelly': '#ffffff',
        'green_turtle': '#2f4f2f',
        'blacktip_shark': '#696969',
        'giant_squid': '#8b0000',
        'sea_otter': '#8b4513',
        'parrotfish': '#00ff7f',
        'tang': '#1e90ff',
        'rockfish': '#cd853f'
      };
      
      ctx.fillStyle = colors[creature.data.id] || '#808080';
      
      // Draw as circle for simplicity
      ctx.beginPath();
      ctx.arc(creature.x, creature.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw name if close to player
      const distToPlayer = Math.sqrt(
        (creature.x - canvas2d.player.x) ** 2 + 
        (creature.y - canvas2d.player.y) ** 2
      );
      
      if (distToPlayer < 50) {
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(creature.data.common_name, creature.x, creature.y - size - 5);
      }
    });
  }

  function drawHUD() {
    // Score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Boops: ${game.score}`, 20, 40);
    
    // Current zone - find which zone player is in
    let currentZone = 'Open Ocean';
    for (const habitat of habitatsData.habitats) {
      const bounds = habitat.bounds;
      if (canvas2d.player.x >= bounds.x[0] && canvas2d.player.x <= bounds.x[1] &&
          canvas2d.player.y >= bounds.z[0] && canvas2d.player.y <= bounds.z[1]) {
        currentZone = habitat.label;
        break;
      }
    }
    ctx.fillText(currentZone, 20, 70);
    
    // Mini map
    const mapSize = 100;
    const mapX = canvas.width - mapSize - 20;
    const mapY = 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    ctx.strokeStyle = 'rgba(0, 102, 204, 0.5)';
    ctx.strokeRect(mapX + 5, mapY + 5, mapSize - 10, mapSize - 10);
    
    // Player on minimap
    const px = mapX + mapSize/2 + (canvas2d.player.x / 250) * (mapSize/2 - 5);
    const py = mapY + mapSize/2 + (canvas2d.player.y / 250) * (mapSize/2 - 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }

  canvas2d.handleBoop = function(screenX, screenY) {
    // Convert screen coordinates to world coordinates
    const worldX = (screenX - canvas.width / 2) / canvas2d.camera.zoom + canvas2d.camera.x;
    const worldY = (screenY - canvas.height / 2) / canvas2d.camera.zoom + canvas2d.camera.y;
    
    // Check if any creature is clicked
    const now = Date.now();
    
    for (const creature of canvas2d.creatures) {
      const dist = Math.sqrt((creature.x - worldX) ** 2 + (creature.y - worldY) ** 2);
      const size = Math.max(5, creature.data.avg_length_m * 5);
      
      if (dist < size && (now - creature.lastBoopTime) > 10000) {
        // Boop successful!
        creature.lastBoopTime = now;
        game.score++;
        game.updateScore();
        
        // Update boopdex
        const key = creature.data.id || creature.data.common_name;
        const current = game.boopdex.get(key) || 0;
        game.boopdex.set(key, current + 1);
        
        // Visual feedback
        drawBoopEffect(creature.x, creature.y);
        
        // Play sound
        if (game.assetLoader && game.assetLoader.sounds.boop) {
          game.assetLoader.sounds.boop.play();
        }
        
        break;
      }
    }
  };

  function drawBoopEffect(x, y) {
    // Simple sparkle effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        ctx.save();
        ctx.translate(
          canvas.width / 2 - canvas2d.camera.x * canvas2d.camera.zoom,
          canvas.height / 2 - canvas2d.camera.y * canvas2d.camera.zoom
        );
        ctx.scale(canvas2d.camera.zoom, canvas2d.camera.zoom);
        
        ctx.fillStyle = `rgba(255, 255, 100, ${1 - i * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 5 + i * 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }, i * 50);
    }
  }

  return canvas2d;
}