export class AssetLoader {
  constructor() {
    this.sounds = {};
    this.textures = {};
    this.volume = 0.5;
  }

  async loadAll() {
    console.log('Loading assets...');
    
    // Try to load audio files
    await this.loadSounds();
    
    // Load any textures if needed
    await this.loadTextures();
    
    console.log('Assets loaded');
  }

  async loadSounds() {
    const soundFiles = {
      boop: '/audio/boop.mp3',
      ambient_coral: '/audio/coral_reef.mp3',
      ambient_kelp: '/audio/kelp_forest.mp3',
      ambient_ocean: '/audio/open_ocean.mp3',
      ambient_deep: '/audio/deep_sea.mp3',
      ambient_polar: '/audio/polar.mp3',
      ambient_seagrass: '/audio/seagrass.mp3'
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(path);
        audio.volume = this.volume;
        
        // For ambient sounds, make them loop
        if (key.startsWith('ambient_')) {
          audio.loop = true;
        }
        
        // Test if file exists by trying to load it
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplay', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });
        
        this.sounds[key] = audio;
        console.log(`Loaded sound: ${key}`);
      } catch (e) {
        // File doesn't exist, create fallback
        console.info(`Sound file not found: ${path}, using fallback`);
        this.sounds[key] = this.createFallbackSound(key);
      }
    }
  }

  createFallbackSound(key) {
    // Create a simple Web Audio API sound as fallback
    if (key === 'boop') {
      return {
        play: () => {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
          } catch (e) {
            console.warn('Could not play fallback sound:', e);
          }
        }
      };
    }
    
    // For ambient sounds, return silent placeholder
    return {
      play: () => {},
      pause: () => {},
      loop: false
    };
  }

  async loadTextures() {
    // Placeholder for texture loading if needed
    // Could load coral textures, fish sprites, etc.
  }

  setVolume(volume) {
    this.volume = volume;
    
    // Update all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound.volume !== undefined) {
        sound.volume = volume;
      }
    });
  }

  playAmbient(habitat) {
    // Stop all ambient sounds
    Object.keys(this.sounds).forEach(key => {
      if (key.startsWith('ambient_')) {
        this.sounds[key].pause();
      }
    });
    
    // Play the appropriate ambient sound
    const ambientKey = `ambient_${habitat}`;
    if (this.sounds[ambientKey]) {
      this.sounds[ambientKey].play();
    }
  }
}