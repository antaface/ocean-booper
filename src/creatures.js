import * as THREE from 'three';
import creaturesData from './data/creatures.json';

export class CreatureManager {
  constructor(game) {
    this.game = game;
    this.creatures = [];
    this.creatureData = [];
    this.spawnedCreatures = new Map();
  }

  async loadCreatures() {
    console.log('Loading creatures data...');
    this.creatureData = creaturesData.creatures;
    console.log(`Loaded ${this.creatureData.length} creature types`);
  }

  spawnCreatures() {
    const zones = this.game.zones;
    if (!zones) return;
    
    // Spawn creatures for each zone
    this.creatureData.forEach(creatureType => {
      const count = this.getSpawnCount(creatureType.rarity);
      
      for (let i = 0; i < count; i++) {
        this.spawnCreature(creatureType);
      }
      
      // Add cross-habitat spawning for creatures that travel
      // Green turtles are known to cross open ocean
      if (creatureType.id === 'green_turtle') {
        // Add 1-2 turtles in open ocean
        const extraTurtles = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < extraTurtles; i++) {
          this.spawnCreature(creatureType, 'open_ocean');
        }
      }
      
      // Blacktip sharks sometimes venture to deeper waters
      if (creatureType.id === 'blacktip_shark') {
        // Add 1 shark in open ocean occasionally
        if (Math.random() < 0.7) {  // 70% chance
          this.spawnCreature(creatureType, 'open_ocean');
        }
      }
      
      // Moon jellies drift everywhere
      if (creatureType.id === 'moon_jelly') {
        // Add some jellies in other zones
        this.spawnCreature(creatureType, 'coral_reef');
        this.spawnCreature(creatureType, 'coral_reef');
        if (Math.random() < 0.5) {
          this.spawnCreature(creatureType, 'kelp_forest');
        }
      }
      
      // Sea otters occasionally explore beyond kelp forests
      if (creatureType.id === 'sea_otter') {
        // Add 1 otter in open ocean near surface
        if (Math.random() < 0.5) {  // 50% chance
          this.spawnCreature(creatureType, 'open_ocean');
        }
      }
    });
    
    console.log(`Spawned ${this.creatures.length} creatures total`);
  }

  getSpawnCount(rarity) {
    switch(rarity) {
      case 'common': return 4 + Math.floor(Math.random() * 3);  // 4-6 (was 3-5)
      case 'uncommon': return 3 + Math.floor(Math.random() * 2); // 3-4 (was 2-3)
      case 'rare': return 1;  // Keep blue whale at 1
      case 'very_rare': 
      case 'legendary': return Math.random() < 0.5 ? 1 : 0;  // Keep giant squid at 0-1
      default: return 1;
    }
  }

  spawnCreature(creatureType, overrideHabitat = null) {
    // Find appropriate zone (use override if provided)
    const habitat = overrideHabitat || creatureType.habitat;
    const zone = this.getZone(habitat);
    if (!zone) return;
    
    // Create mesh based on render type
    let mesh;
    if (creatureType.render === 'model' || creatureType.render === 'mesh') {
      mesh = this.createCreatureMesh(creatureType);
    } else if (creatureType.render === 'particle') {
      mesh = this.createJellyfishParticle(creatureType);
    } else {
      mesh = this.createCreatureSprite(creatureType);
    }
    
    // Position in zone bounds
    const bounds = zone.bounds;
    const x = bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]);
    const z = bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]);
    
    // Use zone Y bounds, respecting creature depth preferences
    const zoneDepthMin = bounds.y[0];
    const zoneDepthMax = bounds.y[1];
    const creaturePreferredMin = 75 - creatureType.max_depth_m; // Convert to Y coordinate
    const creaturePreferredMax = 75 - creatureType.min_depth_m;
    
    const minY = Math.max(zoneDepthMin, creaturePreferredMin);
    const maxY = Math.min(zoneDepthMax, creaturePreferredMax);
    const y = minY + Math.random() * (maxY - minY);
    
    mesh.position.set(x, y, z);
    
    // Store creature data
    mesh.userData.creature = creatureType;
    mesh.userData.isCreature = true;
    
    // Add movement behavior
    const creature = {
      mesh,
      data: creatureType,
      velocity: new THREE.Vector3(),
      targetPosition: mesh.position.clone(),
      idleTimer: 0,
      zone,
      baseY: mesh.position.y
    };
    
    this.creatures.push(creature);
    this.game.scene.add(mesh);
  }

  createCreatureMesh(creatureType) {
    const length = creatureType.avg_length_m;
    const group = new THREE.Group();
    
    switch(creatureType.id) {
      case 'blue_whale':
        // Create whale with body and fins
        const whaleBody = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.15, 12, 8),
          new THREE.MeshPhongMaterial({ 
            color: 0x4169e1,
            emissive: 0x2040a0,
            emissiveIntensity: 0.2
          })
        );
        whaleBody.scale.set(4, 1, 1.2);
        group.add(whaleBody);
        
        // Tail fin
        const tailGeom = new THREE.ConeGeometry(length * 0.15, length * 0.3, 4);
        const tail = new THREE.Mesh(tailGeom, whaleBody.material);
        tail.rotation.z = Math.PI / 2;
        tail.position.x = -length * 0.4;
        tail.scale.set(1, 2, 0.3);
        group.add(tail);
        
        // Eye dots
        const eye1 = new THREE.Mesh(
          new THREE.SphereGeometry(0.3),
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        eye1.position.set(length * 0.3, 0.5, 2);
        group.add(eye1);
        
        const eye2 = eye1.clone();
        eye2.position.z = -2;
        group.add(eye2);
        break;
        
      case 'giant_squid':
        // More realistic giant squid with proper proportions
        // Giant squids can reach 13m with mantle up to 2m
        const mantleLength = length * 0.15;  // Mantle is about 15% of total length
        
        // Tapered mantle with fins
        const mantleGeometry = new THREE.ConeGeometry(
          length * 0.03,   // top radius (narrow)
          length * 0.05,   // bottom radius (wider)
          mantleLength,    // height
          12,              // more segments for smoother look
          1,
          false,
          0,
          Math.PI * 2
        );
        
        // Deep red-purple color typical of giant squids
        const squidMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x7d2c3b,      // Deep reddish-purple
          emissive: 0x3d1020,
          emissiveIntensity: 0.15,
          shininess: 80
        });
        
        const mantle = new THREE.Mesh(mantleGeometry, squidMaterial);
        mantle.position.y = mantleLength * 0.5;
        mantle.rotation.z = Math.PI;  // Point narrow end up
        group.add(mantle);
        
        // Add lateral fins on mantle
        const finGeometry = new THREE.ConeGeometry(length * 0.02, length * 0.08, 4);
        const leftFin = new THREE.Mesh(finGeometry, squidMaterial);
        leftFin.rotation.z = Math.PI / 3;
        leftFin.position.set(-length * 0.04, mantleLength * 0.4, 0);
        leftFin.scale.set(0.3, 1.5, 2);
        group.add(leftFin);
        
        const rightFin = leftFin.clone();
        rightFin.position.x = length * 0.04;
        rightFin.rotation.z = -Math.PI / 3;
        group.add(rightFin);
        
        // Head section with more detail
        const headGeometry = new THREE.CapsuleGeometry(length * 0.04, length * 0.06, 6, 8);
        const head = new THREE.Mesh(headGeometry, squidMaterial);
        head.position.y = -length * 0.03;
        group.add(head);
        
        // Giant eyes (27cm diameter - largest in animal kingdom!)
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x1a1a1a,
          emissive: 0x000000,
          shininess: 100
        });
        
        // Eye with iris detail
        for (let side of [-1, 1]) {
          // Eye ball
          const eyeball = new THREE.Mesh(
            new THREE.SphereGeometry(length * 0.025, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0xffffff })
          );
          eyeball.position.set(side * length * 0.04, -length * 0.03, 0);
          group.add(eyeball);
          
          // Iris
          const iris = new THREE.Mesh(
            new THREE.SphereGeometry(length * 0.02, 16, 16),
            eyeMaterial
          );
          iris.position.set(side * length * 0.045, -length * 0.03, 0);
          group.add(iris);
          
          // Pupil
          const pupil = new THREE.Mesh(
            new THREE.SphereGeometry(length * 0.01, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
          );
          pupil.position.set(side * length * 0.048, -length * 0.03, 0);
          group.add(pupil);
        }
        
        // Beak (hidden between tentacles)
        const beakGeometry = new THREE.ConeGeometry(length * 0.01, length * 0.02, 4);
        const beak = new THREE.Mesh(
          beakGeometry, 
          new THREE.MeshPhongMaterial({ color: 0x2a2a2a })
        );
        beak.position.y = -length * 0.08;
        beak.rotation.x = Math.PI;
        group.add(beak);
        
        // Realistic tentacle arrangement: 8 arms + 2 feeding tentacles
        const armBaseY = -length * 0.09;
        
        // 8 regular arms in a circle
        for (let i = 0; i < 8; i++) {
          const armLength = length * 0.35;  // Regular arms are shorter
          const angle = (i / 8) * Math.PI * 2;
          const radius = length * 0.03;
          
          // Create tapered arm with sucker details
          const armGroup = new THREE.Group();
          
          // Main arm segments
          const segments = 5;
          for (let j = 0; j < segments; j++) {
            const segmentLength = armLength / segments;
            const topRadius = length * 0.012 * (1 - j * 0.15);
            const bottomRadius = length * 0.012 * (1 - (j + 1) * 0.15);
            
            const segmentGeometry = new THREE.CylinderGeometry(
              topRadius,
              bottomRadius,
              segmentLength,
              8
            );
            const segment = new THREE.Mesh(segmentGeometry, squidMaterial);
            
            segment.position.y = -(j * segmentLength + segmentLength * 0.5);
            
            // Add slight curve
            segment.rotation.z = Math.sin(angle + j * 0.3) * 0.1;
            segment.rotation.x = Math.cos(angle + j * 0.3) * 0.1;
            
            // Add suckers (small spheres)
            if (j > 0) {
              for (let k = 0; k < 3; k++) {
                const sucker = new THREE.Mesh(
                  new THREE.SphereGeometry(length * 0.002),
                  new THREE.MeshPhongMaterial({ color: 0xffdddd })
                );
                sucker.position.set(
                  topRadius * 0.8,
                  -k * segmentLength / 3,
                  0
                );
                segment.add(sucker);
              }
            }
            
            armGroup.add(segment);
          }
          
          armGroup.position.set(
            Math.cos(angle) * radius,
            armBaseY,
            Math.sin(angle) * radius
          );
          
          group.add(armGroup);
        }
        
        // 2 longer feeding tentacles with clubs
        for (let i = 0; i < 2; i++) {
          const tentacleLength = length * 0.6;  // Much longer than arms
          const angle = i * Math.PI + Math.PI / 4;  // Position between regular arms
          const radius = length * 0.03;
          
          const tentacleGroup = new THREE.Group();
          
          // Thin stalk part
          const stalkLength = tentacleLength * 0.7;
          const stalk = new THREE.Mesh(
            new THREE.CylinderGeometry(
              length * 0.006,
              length * 0.004,
              stalkLength,
              6
            ),
            squidMaterial
          );
          stalk.position.y = -stalkLength * 0.5;
          tentacleGroup.add(stalk);
          
          // Club at the end (wider part with suckers)
          const clubLength = tentacleLength * 0.3;
          const club = new THREE.Mesh(
            new THREE.CylinderGeometry(
              length * 0.008,
              length * 0.015,
              clubLength,
              8
            ),
            squidMaterial
          );
          club.position.y = -stalkLength - clubLength * 0.5;
          
          // Add larger suckers on club
          for (let j = 0; j < 8; j++) {
            const sucker = new THREE.Mesh(
              new THREE.SphereGeometry(length * 0.003),
              new THREE.MeshPhongMaterial({ color: 0xffcccc })
            );
            const suckerAngle = (j / 8) * Math.PI * 2;
            sucker.position.set(
              Math.cos(suckerAngle) * length * 0.01,
              -j * clubLength / 8,
              Math.sin(suckerAngle) * length * 0.01
            );
            club.add(sucker);
          }
          
          tentacleGroup.add(club);
          
          tentacleGroup.position.set(
            Math.cos(angle) * radius,
            armBaseY,
            Math.sin(angle) * radius
          );
          
          // Add some waviness
          tentacleGroup.rotation.z = Math.sin(i) * 0.2;
          
          group.add(tentacleGroup);
        }
        break;
        
      case 'sea_otter':
        // Fluffy body
        const otterBody = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.3, 8, 6),
          new THREE.MeshPhongMaterial({ 
            color: 0x8b4513,
            emissive: 0x4a2511,
            emissiveIntensity: 0.2,
            roughness: 0.9
          })
        );
        otterBody.scale.set(1.5, 0.8, 0.8);
        group.add(otterBody);
        
        // Head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.15),
          otterBody.material
        );
        head.position.x = length * 0.35;
        group.add(head);
        
        // Cute nose
        const nose = new THREE.Mesh(
          new THREE.SphereGeometry(0.05),
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        nose.position.set(length * 0.45, 0, 0);
        group.add(nose);
        break;
        
      case 'green_turtle':
        // Shell
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.4, 8, 6),
          new THREE.MeshPhongMaterial({ 
            color: 0x2f4f2f,
            emissive: 0x1a2a1a,
            emissiveIntensity: 0.2
          })
        );
        shell.scale.set(1.2, 0.4, 1);
        group.add(shell);
        
        // Head
        const turtleHead = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.12),
          new THREE.MeshPhongMaterial({ color: 0x3a5a3a })
        );
        turtleHead.position.x = length * 0.4;
        group.add(turtleHead);
        
        // Flippers
        for (let i = 0; i < 4; i++) {
          const flipper = new THREE.Mesh(
            new THREE.BoxGeometry(length * 0.15, 0.05, length * 0.2),
            shell.material
          );
          flipper.position.set(
            (i < 2 ? 0.3 : -0.3) * length,
            -0.1,
            (i % 2 === 0 ? 0.3 : -0.3) * length
          );
          group.add(flipper);
        }
        break;
        
      case 'blacktip_shark':
        // More anatomically accurate blacktip reef shark
        // Average 1.5m length, streamlined predator
        
        // Gradient material for more realistic coloring
        const sharkTopMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x5c6670,      // Dark grey-blue top (countershading)
          emissive: 0x2a2e33,
          emissiveIntensity: 0.1,
          shininess: 60
        });
        
        const sharkBellyMaterial = new THREE.MeshPhongMaterial({
          color: 0xe8e8e8,      // Light grey-white belly
          emissive: 0xcccccc,
          emissiveIntensity: 0.05
        });
        
        // Main body - fusiform shape with proper proportions
        // Sharks have thick middle section tapering at both ends
        const bodyGroup = new THREE.Group();
        
        // Create body segments for more realistic shape
        // Front section (head to mid-body)
        const frontBodyGeometry = new THREE.CylinderGeometry(
          length * 0.08,   // front radius
          length * 0.12,   // middle radius
          length * 0.4,    // length
          12,              // segments
          1
        );
        const frontBody = new THREE.Mesh(frontBodyGeometry, sharkTopMaterial);
        frontBody.rotation.z = Math.PI / 2;
        frontBody.position.x = length * 0.1;
        bodyGroup.add(frontBody);
        
        // Mid-section (thickest part)
        const midBodyGeometry = new THREE.SphereGeometry(length * 0.12, 12, 8);
        const midBody = new THREE.Mesh(midBodyGeometry, sharkTopMaterial);
        midBody.scale.set(1.8, 0.9, 1);
        midBody.position.x = -length * 0.1;
        bodyGroup.add(midBody);
        
        // Rear section (tapering to tail)
        const rearBodyGeometry = new THREE.CylinderGeometry(
          length * 0.12,   // middle radius
          length * 0.04,   // tail radius
          length * 0.35,   // length
          12,
          1
        );
        const rearBody = new THREE.Mesh(rearBodyGeometry, sharkTopMaterial);
        rearBody.rotation.z = Math.PI / 2;
        rearBody.position.x = -length * 0.35;
        bodyGroup.add(rearBody);
        
        // White belly (ventral surface)
        const bellyGeometry = new THREE.BoxGeometry(length * 0.7, length * 0.08, length * 0.16);
        const belly = new THREE.Mesh(bellyGeometry, sharkBellyMaterial);
        belly.position.set(0, -length * 0.08, 0);
        bodyGroup.add(belly);
        
        group.add(bodyGroup);
        
        // Realistic pointed snout with nostrils
        const snoutGroup = new THREE.Group();
        
        // Main snout shape
        const snoutGeometry = new THREE.ConeGeometry(length * 0.06, length * 0.2, 8);
        const snout = new THREE.Mesh(snoutGeometry, sharkTopMaterial);
        snout.rotation.z = -Math.PI / 2;
        snout.scale.set(1, 1, 0.7);  // Flattened vertically
        snoutGroup.add(snout);
        
        // Nostrils
        const nostrilMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        for (let side of [-1, 1]) {
          const nostril = new THREE.Mesh(
            new THREE.BoxGeometry(length * 0.01, length * 0.003, length * 0.02),
            nostrilMaterial
          );
          nostril.position.set(length * 0.08, -length * 0.02, side * length * 0.03);
          snoutGroup.add(nostril);
        }
        
        // Mouth (ventral, with teeth hint)
        const mouthGeometry = new THREE.BoxGeometry(length * 0.12, length * 0.01, length * 0.08);
        const mouth = new THREE.Mesh(mouthGeometry, nostrilMaterial);
        mouth.position.set(length * 0.05, -length * 0.04, 0);
        snoutGroup.add(mouth);
        
        snoutGroup.position.x = length * 0.35;
        group.add(snoutGroup);
        
        // Heterocercal tail (upper lobe longer than lower)
        const tailGroup = new THREE.Group();
        
        // Upper tail lobe (longer)
        const upperTailGeometry = new THREE.ConeGeometry(length * 0.04, length * 0.25, 4);
        const upperTail = new THREE.Mesh(upperTailGeometry, sharkTopMaterial);
        upperTail.rotation.z = Math.PI * 0.4;
        upperTail.position.set(-length * 0.1, length * 0.08, 0);
        upperTail.scale.set(0.4, 1.5, 0.2);
        tailGroup.add(upperTail);
        
        // Lower tail lobe (shorter)
        const lowerTailGeometry = new THREE.ConeGeometry(length * 0.03, length * 0.15, 4);
        const lowerTail = new THREE.Mesh(lowerTailGeometry, sharkTopMaterial);
        lowerTail.rotation.z = Math.PI * 0.7;
        lowerTail.position.set(-length * 0.05, -length * 0.05, 0);
        lowerTail.scale.set(0.4, 1.2, 0.2);
        tailGroup.add(lowerTail);
        
        // Tail peduncle (narrow part before tail)
        const peduncleGeometry = new THREE.CylinderGeometry(
          length * 0.04,
          length * 0.035,
          length * 0.1,
          8
        );
        const peduncle = new THREE.Mesh(peduncleGeometry, sharkTopMaterial);
        peduncle.rotation.z = Math.PI / 2;
        peduncle.position.x = length * 0.05;
        tailGroup.add(peduncle);
        
        tailGroup.position.x = -length * 0.5;
        group.add(tailGroup);
        
        // First dorsal fin (large, triangular)
        const dorsalFinGeometry = new THREE.ConeGeometry(length * 0.05, length * 0.18, 4);
        const dorsalFin = new THREE.Mesh(dorsalFinGeometry, sharkTopMaterial);
        dorsalFin.position.set(-length * 0.05, length * 0.14, 0);
        dorsalFin.rotation.x = Math.PI;
        dorsalFin.rotation.y = Math.PI * 0.1;  // Slight backward lean
        dorsalFin.scale.set(0.3, 1, 1.2);
        group.add(dorsalFin);
        
        // Second dorsal fin (smaller)
        const secondDorsalGeometry = new THREE.ConeGeometry(length * 0.03, length * 0.08, 3);
        const secondDorsal = new THREE.Mesh(secondDorsalGeometry, sharkTopMaterial);
        secondDorsal.position.set(-length * 0.38, length * 0.08, 0);
        secondDorsal.rotation.x = Math.PI;
        secondDorsal.scale.set(0.3, 1, 0.8);
        group.add(secondDorsal);
        
        // Pectoral fins (wing-like, horizontal)
        const pectoralFinGeometry = new THREE.ConeGeometry(length * 0.04, length * 0.2, 4);
        for (let side of [-1, 1]) {
          const pectoralFin = new THREE.Mesh(pectoralFinGeometry, sharkTopMaterial);
          pectoralFin.rotation.z = side * Math.PI * 0.4;
          pectoralFin.rotation.x = -Math.PI * 0.1;  // Slight downward angle
          pectoralFin.position.set(length * 0.12, -length * 0.06, side * length * 0.12);
          pectoralFin.scale.set(0.2, 1.8, 1);
          group.add(pectoralFin);
        }
        
        // Pelvic fins (smaller, near belly)
        for (let side of [-1, 1]) {
          const pelvicFin = new THREE.Mesh(
            new THREE.ConeGeometry(length * 0.02, length * 0.08, 3),
            sharkTopMaterial
          );
          pelvicFin.rotation.z = side * Math.PI * 0.5;
          pelvicFin.position.set(-length * 0.2, -length * 0.08, side * length * 0.08);
          pelvicFin.scale.set(0.2, 1, 0.6);
          group.add(pelvicFin);
        }
        
        // Anal fin (ventral, near tail)
        const analFin = new THREE.Mesh(
          new THREE.ConeGeometry(length * 0.02, length * 0.06, 3),
          sharkTopMaterial
        );
        analFin.position.set(-length * 0.4, -length * 0.08, 0);
        analFin.rotation.x = 0;
        analFin.scale.set(0.3, 1, 0.8);
        group.add(analFin);
        
        // Black tips on fins (characteristic markings)
        const blackTipMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
        
        // Black tip on first dorsal fin
        const dorsalTipGeometry = new THREE.ConeGeometry(length * 0.02, length * 0.04, 3);
        const dorsalTip = new THREE.Mesh(dorsalTipGeometry, blackTipMaterial);
        dorsalTip.position.set(-length * 0.05, length * 0.23, 0);
        dorsalTip.rotation.x = Math.PI;
        dorsalTip.scale.set(0.3, 1, 1);
        group.add(dorsalTip);
        
        // Black tips on pectoral fins
        for (let side of [-1, 1]) {
          const pectoralTip = new THREE.Mesh(
            new THREE.ConeGeometry(length * 0.015, length * 0.03, 3),
            blackTipMaterial
          );
          pectoralTip.rotation.z = side * Math.PI * 0.4;
          pectoralTip.position.set(length * 0.2, -length * 0.12, side * length * 0.2);
          pectoralTip.scale.set(0.2, 1, 0.8);
          group.add(pectoralTip);
        }
        
        // Black edge on tail
        const tailTipUpper = new THREE.Mesh(
          new THREE.BoxGeometry(length * 0.02, length * 0.12, length * 0.01),
          blackTipMaterial
        );
        tailTipUpper.rotation.z = Math.PI * 0.3;
        tailTipUpper.position.set(-length * 0.65, length * 0.12, 0);
        group.add(tailTipUpper);
        
        // Eyes (positioned laterally)
        const eyeWhiteMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xffffff,
          emissive: 0xaaaaaa,
          emissiveIntensity: 0.1
        });
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        for (let side of [-1, 1]) {
          // Eye socket
          const eyeSocket = new THREE.Mesh(
            new THREE.SphereGeometry(length * 0.018, 8, 8),
            eyeWhiteMaterial
          );
          eyeSocket.position.set(length * 0.28, length * 0.01, side * length * 0.07);
          group.add(eyeSocket);
          
          // Pupil (vertical slit for sharks)
          const pupil = new THREE.Mesh(
            new THREE.BoxGeometry(length * 0.003, length * 0.012, length * 0.003),
            pupilMaterial
          );
          pupil.position.set(length * 0.285, length * 0.01, side * length * 0.072);
          group.add(pupil);
        }
        
        // Gills (5 gill slits per side)
        for (let i = 0; i < 5; i++) {
          const gillGeometry = new THREE.BoxGeometry(length * 0.002, length * 0.04, length * 0.01);
          for (let side of [-1, 1]) {
            const gill = new THREE.Mesh(gillGeometry, nostrilMaterial);
            gill.position.set(
              length * 0.15 - i * length * 0.025,
              -length * 0.02,
              side * length * 0.1
            );
            gill.rotation.z = -Math.PI * 0.1;  // Angled backward
            group.add(gill);
          }
        }
        
        // Lateral line (sensory organ - subtle line along body)
        for (let side of [-1, 1]) {
          const lateralLine = new THREE.Mesh(
            new THREE.BoxGeometry(length * 0.6, length * 0.002, length * 0.002),
            nostrilMaterial
          );
          lateralLine.position.set(0, 0, side * length * 0.1);
          group.add(lateralLine);
        }
        break;
        
      default:
        // Generic fish with more detail
        const fishBody = new THREE.Mesh(
          new THREE.SphereGeometry(length * 0.3, 8, 6),
          new THREE.MeshPhongMaterial({ 
            color: this.getCreatureColorHex(creatureType.id),
            emissive: this.getCreatureColorHex(creatureType.id),
            emissiveIntensity: 0.2
          })
        );
        fishBody.scale.set(2, 0.8, 0.6);
        group.add(fishBody);
        
        // Tail fin
        const fishTail = new THREE.Mesh(
          new THREE.ConeGeometry(length * 0.15, length * 0.2, 4),
          fishBody.material
        );
        fishTail.rotation.z = -Math.PI / 2;
        fishTail.position.x = -length * 0.5;
        fishTail.scale.set(1, 1.5, 0.3);
        group.add(fishTail);
    }
    
    // Add a glowing sphere around creature to make it easier to spot
    const glowGeometry = new THREE.SphereGeometry(length * 0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    group.userData.creature = creatureType;
    group.userData.isCreature = true;
    return group;
  }
  
  getCreatureColorHex(id) {
    const colors = {
      'parrotfish': 0x00ff7f,
      'tang': 0x1e90ff,
      'rockfish': 0xcd853f
    };
    return colors[id] || 0x808080;
  }

  createJellyfishParticle(creatureType) {
    // Create translucent jellyfish with particle tentacles
    const group = new THREE.Group();
    
    // Bell
    const bellGeometry = new THREE.SphereGeometry(
      creatureType.avg_length_m * 0.5,
      8,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.6
    );
    
    const bellMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x6495ed,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6
    });
    
    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    group.add(bell);
    
    // Tentacle particles
    const particleCount = 20;
    const positions = [];
    const radius = creatureType.avg_length_m * 0.3;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      for (let j = 0; j < 5; j++) {
        positions.push(
          Math.cos(angle) * radius * (1 - j * 0.1),
          -j * creatureType.avg_length_m * 0.2,
          Math.sin(angle) * radius * (1 - j * 0.1)
        );
      }
    }
    
    const tentacleGeometry = new THREE.BufferGeometry();
    tentacleGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(positions, 3)
    );
    
    const tentacleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });
    
    const tentacles = new THREE.Points(tentacleGeometry, tentacleMaterial);
    group.add(tentacles);
    
    group.userData.isCreature = true;
    return group;
  }

  createCreatureSprite(creatureType) {
    // Billboard sprite for smaller fish
    const length = creatureType.avg_length_m;
    const geometry = new THREE.PlaneGeometry(length, length * 0.6);
    
    // Create canvas for fish texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Simple fish shape
    ctx.fillStyle = this.getCreatureColor(creatureType.id);
    ctx.beginPath();
    ctx.ellipse(64, 32, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.beginPath();
    ctx.moveTo(20, 32);
    ctx.lineTo(5, 20);
    ctx.lineTo(5, 44);
    ctx.closePath();
    ctx.fill();
    
    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(85, 28, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(86, 28, 3, 0, Math.PI * 2);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const sprite = new THREE.Mesh(geometry, material);
    sprite.userData.isCreature = true;
    
    return sprite;
  }

  getCreatureColor(id) {
    const colors = {
      'parrotfish': '#00CED1',
      'tang': '#1E90FF', 
      'rockfish': '#CD853F'
    };
    return colors[id] || '#808080';
  }

  getZone(habitat) {
    if (!this.game.zones) return null;
    return this.game.zones.find(z => z.id === habitat) || null;
  }

  update(deltaTime) {
    // Update creature positions with idle movement
    this.creatures.forEach(creature => {
      creature.idleTimer += deltaTime;
      
      // Pick new target occasionally
      if (creature.idleTimer > 3 + Math.random() * 5) {
        creature.idleTimer = 0;
        
        // New target within zone bounds
        const bounds = creature.zone.bounds;
        
        creature.targetPosition.set(
          bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
          creature.baseY + (Math.random() - 0.5) * 10,
          bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
        );
        
        // Keep within Y bounds
        creature.targetPosition.y = Math.max(bounds.y[0], 
          Math.min(bounds.y[1], creature.targetPosition.y));
      }
      
      // Move toward target
      const direction = new THREE.Vector3()
        .subVectors(creature.targetPosition, creature.mesh.position)
        .normalize();
      
      const speed = creature.data.speed_mps || 1;
      creature.velocity.lerp(
        direction.multiplyScalar(speed),
        deltaTime * 2
      );
      
      creature.mesh.position.add(
        creature.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Face direction of movement
      if (creature.velocity.length() > 0.1) {
        creature.mesh.lookAt(
          creature.mesh.position.clone().add(creature.velocity)
        );
      }
      
      // Bobbing for some creatures
      if (creature.data.id === 'moon_jelly') {
        creature.mesh.position.y = creature.baseY + 
          Math.sin(Date.now() * 0.001) * 2;
      }
    });
  }

  getAllCreatures() {
    return this.creatures;
  }
}