# Design Decisions

## Ambiguity Resolutions

### Creature Speeds
- Speed values in creatures.json are set as single values (not ranges) for simplicity
- Speeds are in meters per second, matching real-world approximations

### Zone Layout
- Zones are defined as 3D bounding boxes within a 250m × 250m × 150m cuboid
- Coral Reef: shallow northwest box
- Kelp Forest: shallow northeast box
- Open Ocean: central midwater volume
- Deep Sea: entire bottom layer
- Polar: wall zone at maximum Z
- Seagrass: shallow southeast corner

### Boop Range
- Set to 4 meters as specified
- In 2D mode, scales proportionally to creature size for better gameplay

### Mobile Controls
- Virtual joystick implemented for movement
- Swipe-to-look for camera rotation
- Tap-to-boop for interaction
- "Try on desktop" banner shown but game remains playable

### Creature Rendering
- Large creatures (whale, squid) use geometric meshes
- Medium creatures (shark, turtle, otter) use simplified meshes  
- Small fish use billboarded sprites
- Jellyfish use hybrid mesh + particle system

### Water Representation
- Semi-transparent plane at y=75 (water surface)
- Additional vertical planes for visual depth
- Fog provides underwater atmosphere
- No complex water shader in v1 as specified

### Audio Fallbacks
- Web Audio API synthesized "boop" sound when file missing
- Silent placeholders for missing ambient tracks
- Console info logged for missing audio files

### Performance Limits
- 0-1 large creatures visible per zone
- 3-5 common creatures per type
- 2-3 uncommon creatures per type
- Total ~30-40 creatures in arena

### 2D Fallback Trigger
- Manual toggle in settings panel
- Automatic on WebGL detection failure
- Page reload to switch modes (simplest approach)

### Compass Implementation  
- Simple rotating div element
- Shows cardinal direction (N marker)
- Updates based on camera rotation