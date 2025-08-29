# 🐠 Ocean Booper - First Person Marine Harassment Simulator™

A whimsical 3D underwater exploration game where you swim around and boop sea creatures for points. Built with Three.js and Vite.

## 🎮 Play Now

Visit [Ocean Booper](https://ocean-booper.vercel.app) (deployment pending)

## 🌊 Features

- **First-person underwater exploration** in a 250m × 250m × 150m aquatic arena
- **9 unique sea creatures** to discover and boop, from tiny blue tangs to massive blue whales
- **4 distinct ocean zones**: Coral Reef, Kelp Forest, Open Ocean, and Deep Sea
- **Realistic creature behaviors** with wandering movement patterns
- **Dynamic lighting and fog** that changes based on depth and zone
- **Boopdex tracking system** to record your encounters
- **Speed indicator** showing your swimming velocity (up to 72 km/h!)
- **Minimap** for navigation
- **Distance tracking** to nearest creature

## 🎯 How to Play

### Controls
- **WASD** - Swim around
- **Mouse** - Look around
- **Space** - Swim up
- **Ctrl** - Swim down  
- **Click** - Boop a creature (must be within 25 meters)
- **H** - Toggle help
- **B** - Open Boopdex
- **ESC** - Settings

### Gameplay
1. Get within 25 meters of a creature
2. Aim roughly at it (we're not asking for sniper precision)
3. Click to boop!
4. Each creature has a 10-second cooldown between boops
5. Listen for the satisfying *ding* sound of success

## 🐙 Creatures

- **Common**: Moon Jellyfish, Parrotfish, Blue Tang, Rockfish
- **Uncommon**: Green Sea Turtle, Blacktip Reef Shark, Sea Otter
- **Rare**: Blue Whale
- **Very Rare**: Giant Squid

Creatures have realistic cross-habitat behaviors - turtles cross open ocean, sharks venture to deeper waters, and jellyfish drift everywhere!

## 🛠️ Tech Stack

- **Three.js** - 3D graphics and rendering
- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No framework overhead
- **WebGL** - Hardware-accelerated 3D graphics

## 🚀 Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/antaface/ocean-booper.git
cd ocean-booper

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📝 Project Structure

```
ocean-booper/
├── src/
│   ├── main.js          # Game initialization and main loop
│   ├── creatures.js     # Creature spawning and management
│   ├── scene.js         # 3D scene setup and zones
│   ├── controls.js      # Player movement controls
│   ├── physics.js       # Physics and collision detection
│   ├── ui.js            # HUD and UI elements
│   ├── assets.js        # Asset loading
│   ├── canvas2d.js      # 2D fallback renderer
│   ├── styles.css       # Styling
│   └── data/
│       └── creatures.json  # Creature definitions
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 Recent Updates

- Enhanced giant squid rendering with anatomically correct tentacles and suckers
- Improved blacktip shark model with realistic fins and countershading
- Increased creature spawn rates for a more populated ocean
- Added cross-habitat spawning for migrating species

## 🤝 Contributing

Feel free to open issues or submit pull requests! Some ideas for contributions:
- New sea creatures
- Additional ocean zones
- Multiplayer support
- Creature animations
- Sound effects and ambient music
- Achievement system

## 📄 License

MIT License - feel free to use this code for your own projects!

## 🙏 Acknowledgments

- No actual sea creatures were harmed in the making of this game
- Can't say the same for their dignity

---

*Made with 🤿 by antaface*