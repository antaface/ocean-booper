import creaturesData from './data/creatures.json';

export function setupUI(game) {
  const ui = {
    game,
    panels: {
      help: document.getElementById('helpPanel'),
      settings: document.getElementById('settingsPanel'),
      boopdex: document.getElementById('boopdexPanel')
    },
    currentPanel: null
  };

  // Keyboard controls for UI
  document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
      case 'h':
        ui.togglePanel('help');
        break;
      case 'b':
        ui.togglePanel('boopdex');
        ui.updateBoopdex();
        break;
      case 'escape':
        e.preventDefault();
        ui.togglePanel('settings');
        break;
    }
  });

  // Settings panel controls
  const webglToggle = document.getElementById('webglToggle');
  webglToggle.checked = game.webglEnabled;
  webglToggle.addEventListener('change', (e) => {
    game.toggleWebGL(e.target.checked);
  });

  const volumeSlider = document.getElementById('volumeSlider');
  volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    if (game.assetLoader) {
      game.assetLoader.setVolume(volume);
    }
  });

  // Close buttons
  document.getElementById('closeSettings').addEventListener('click', () => {
    ui.togglePanel('settings');
  });

  document.getElementById('closeBoopdex').addEventListener('click', () => {
    ui.togglePanel('boopdex');
  });

  // Panel management
  ui.togglePanel = function(panelName) {
    const panel = this.panels[panelName];
    if (!panel) return;

    if (this.currentPanel === panel) {
      // Close current panel
      panel.classList.add('hidden');
      this.currentPanel = null;
      
      // Resume game if using pointer lock
      if (game.controls && game.controls.lock) {
        game.controls.lock();
      }
    } else {
      // Close any open panel
      if (this.currentPanel) {
        this.currentPanel.classList.add('hidden');
      }
      
      // Open new panel
      panel.classList.remove('hidden');
      this.currentPanel = panel;
      
      // Unlock pointer if locked
      if (game.controls && game.controls.unlock) {
        game.controls.unlock();
      }
    }
  };

  // Update boopdex display
  ui.updateBoopdex = function() {
    const boopdexList = document.getElementById('boopdexList');
    boopdexList.innerHTML = '';

    if (game.boopdex.size === 0) {
      boopdexList.innerHTML = '<p>No creatures booped yet!</p>';
      return;
    }

    // Get creature data map
    const creatureMap = new Map();
    creaturesData.creatures.forEach(c => {
      creatureMap.set(c.id || c.common_name, c);
    });

    // Display booped creatures
    game.boopdex.forEach((count, creatureId) => {
      const creatureData = creatureMap.get(creatureId);
      if (!creatureData) return;

      const entry = document.createElement('div');
      entry.className = 'boopdex-entry';
      
      entry.innerHTML = `
        <h4>${creatureData.common_name}</h4>
        <div class="scientific">${creatureData.scientific_name}</div>
        <div>Habitat: ${formatHabitat(creatureData.habitat)}</div>
        <div>Size: ~${creatureData.avg_length_m}m</div>
        <div class="count">Booped ${count} time${count > 1 ? 's' : ''}</div>
      `;
      
      boopdexList.appendChild(entry);
    });

    // Show completion stats
    const totalSpecies = creaturesData.creatures.length;
    const discoveredSpecies = game.boopdex.size;
    
    const stats = document.createElement('div');
    stats.style.marginTop = '20px';
    stats.style.borderTop = '1px solid #444';
    stats.style.paddingTop = '10px';
    stats.innerHTML = `
      <strong>Progress:</strong> ${discoveredSpecies}/${totalSpecies} species discovered
    `;
    boopdexList.appendChild(stats);
  };

  // Compass update
  ui.updateCompass = function(angle) {
    const compass = document.getElementById('compass');
    if (compass) {
      compass.style.transform = `rotate(${-angle}rad)`;
    }
  };

  // Touch controls for mobile
  if ('ontouchstart' in window) {
    setupTouchControls(game, ui);
  }

  return ui;
}

function formatHabitat(habitat) {
  return habitat.replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function setupTouchControls(game, ui) {
  const canvas = document.getElementById('gameCanvas');
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;

  // Virtual joystick for movement
  const joystick = document.createElement('div');
  joystick.style.cssText = `
    position: absolute;
    bottom: 100px;
    left: 50px;
    width: 100px;
    height: 100px;
    border: 2px solid rgba(255,255,255,0.5);
    border-radius: 50%;
    background: rgba(0,0,0,0.3);
    z-index: 50;
  `;
  
  const joystickKnob = document.createElement('div');
  joystickKnob.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.7);
    transition: none;
  `;
  
  joystick.appendChild(joystickKnob);
  document.body.appendChild(joystick);

  // Touch handlers
  joystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isTouching = true;
  });

  joystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isTouching) return;

    const touch = e.touches[0];
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // Limit to joystick radius
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 20;
    
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // Update movement state if using pointer lock controls
    if (game.controls && game.controls.moveState) {
      game.controls.moveState.forward = deltaY < -10;
      game.controls.moveState.backward = deltaY > 10;
      game.controls.moveState.left = deltaX < -10;
      game.controls.moveState.right = deltaX > 10;
    }
  });

  joystick.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    
    // Reset movement
    if (game.controls && game.controls.moveState) {
      game.controls.moveState.forward = false;
      game.controls.moveState.backward = false;
      game.controls.moveState.left = false;
      game.controls.moveState.right = false;
    }
  });

  // Swipe for look
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    
    // Rotate camera based on swipe
    if (game.camera) {
      game.camera.rotation.y -= deltaX * 0.01;
      game.camera.rotation.x -= deltaY * 0.01;
      game.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, game.camera.rotation.x));
    }
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  // Tap to boop
  canvas.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    game.attemptBoop(touch.clientX, touch.clientY);
  });
}