# First Person Booper - Design Document

## Architecture Overview

The application is built with a modular architecture using Vite, Three.js, and vanilla JavaScript.

### Core Components

#### main.js
- Entry point and game orchestration
- Handles WebGL detection and mode switching (3D vs 2D)
- Manages game loop and state
- Coordinates between all subsystems

#### scene.js  
- Three.js scene setup and management
- Zone creation with procedural props
- Lighting and fog configuration
- Signpost generation for zone navigation

#### creatures.js
- Data-driven creature spawning system
- Idle movement AI
- Mesh/sprite/particle generation based on creature type
- Zone-based habitat placement

#### ui.js
- HUD elements (crosshair, score, compass, zone label)
- Panel management (Help, Settings, Boopdex)
- Keyboard and touch input handling
- Mobile-specific controls

#### physics.js
- Swimming physics with inertia and drag
- Boundary enforcement (arena radius and depth limits)
- Buoyancy simulation
- Zone-specific water currents

#### assets.js
- Audio loading with fallbacks
- Web Audio API synthesized sounds when files missing
- Volume control management

#### canvas2d.js
- Complete 2D fallback implementation
- Top-down view with minimap
- Shares creature data with 3D mode
- Click-to-boop mechanics

## Arena Structure

### Cuboid Arena Model
- Rectangular arena: 250m × 250m × 150m (X × Z × Y)
- Y-axis represents depth (-75m bottom to +75m surface)
- 6 sub-zones defined by 3D bounding boxes

### Zone Layout
1. **Coral Reef**: Near-surface shallow box in northwest quadrant
2. **Kelp Forest**: Shallow/temperate box in northeast quadrant  
3. **Open Ocean**: Large midwater zone spanning center
4. **Deep Sea**: Bottom layer covering entire floor
5. **Polar Waters**: Side wall zone at +Z boundary
6. **Seagrass & Mangrove**: Shallow corner in southeast

## Data Structure

### creatures.json
- Species definitions with scientific accuracy
- Habitat assignments for zone placement
- Physical properties (size, speed, depth range)
- Render hints (model, sprite, particle)
- Rarity for spawn frequency

### habitats.json
- Zone visual configuration with 3D bounds
- Each zone has x, y, z ranges defining its box
- Fog and ambient colors per zone
- Typical depth ranges

## Rendering Strategy

### 3D Mode (WebGL)
- Ultra low-poly meshes for performance
- Billboarded sprites for small fish
- Particle systems for jellyfish
- InstancedMesh batching where possible
- LOD consideration for large creatures

### 2D Mode (Canvas)
- Top-down view of X-Z plane
- Rectangle zones with transparency overlays
- Circle representations scaled by creature size
- Real-time minimap showing arena bounds
- Simplified collision detection

## Performance Optimizations

- Creature spawn limits based on rarity
- View frustum culling (built into Three.js)
- Reused geometries and materials
- Debounced boop interactions
- Efficient zone detection using 3D bounding box checks

## Accessibility Features

- Multiple control schemes (pointer lock, orbit, touch)
- Visual feedback for all interactions
- Clear HUD with high contrast
- Help panel with full control listing
- 2D fallback for devices without WebGL