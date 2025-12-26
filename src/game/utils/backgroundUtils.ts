import { Scene } from "phaser";

/**
 * Creates a gradient background that matches the game's theme
 * @param scene The Phaser scene to add the background to
 * @param depth Optional depth for the background (default: 0)
 */
export function createGradientBackground(
  scene: Scene,
  depth: number = 0
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.setDepth(depth);

  const width = scene.scale.width;
  const height = scene.scale.height;

  // Create a colorful gradient from dark purple/blue to darker at bottom
  // Using colors that match the brick theme
  const topColor = 0x1a1a2e; // Dark purple-blue
  const bottomColor = 0x0a0a1a; // Very dark blue

  // Extract RGB components
  const topR = (topColor >> 16) & 0xff;
  const topG = (topColor >> 8) & 0xff;
  const topB = topColor & 0xff;

  const bottomR = (bottomColor >> 16) & 0xff;
  const bottomG = (bottomColor >> 8) & 0xff;
  const bottomB = bottomColor & 0xff;

  // Draw gradient using multiple rectangles
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const r = Math.floor(topR + (bottomR - topR) * ratio);
    const g = Math.floor(topG + (bottomG - topG) * ratio);
    const b = Math.floor(topB + (bottomB - topB) * ratio);
    const color = (r << 16) | (g << 8) | b;

    graphics.fillStyle(color);
    graphics.fillRect(0, (height / steps) * i, width, height / steps);
  }

  return graphics;
}

/**
 * Star data structure for parallax effect
 */
export interface StarData {
  star: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  depth: number; // 0-1, where 0 is closest (moves most) and 1 is farthest (moves least)
  parallaxFactor: number; // How much this star moves relative to mouse (0-1)
  spriteSwitchTimer: number; // Timer for switching between star sprites
  currentSpriteType: string; // 'particleStar' or 'particleSmallStar'
  driftX: number; // Continuous drift speed in X direction
  driftY: number; // Continuous drift speed in Y direction
}

/**
 * Creates static stars with different Z-levels and clusters for parallax effect
 * @param scene The Phaser scene to add the stars to
 * @param starCount Number of stars to create (default: 60)
 * @param minDepth Minimum depth layer (default: 1)
 * @param maxDepth Maximum depth layer (default: 10)
 */
export function createParallaxStars(
  scene: Scene,
  starCount: number = 60,
  minDepth: number = 1,
  maxDepth: number = 10
): StarData[] {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const stars: StarData[] = [];

  // Create star clusters
  const clusterCount = Math.floor(starCount / 10); // ~10 stars per cluster
  const starsPerCluster = Math.floor(starCount / clusterCount);

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    // Cluster center position
    const clusterX = Phaser.Math.Between(width * 0.1, width * 0.9);
    const clusterY = Phaser.Math.Between(height * 0.1, height * 0.9);
    const clusterRadius = Phaser.Math.Between(80, 150);

    // Create stars in this cluster
    for (let i = 0; i < starsPerCluster && stars.length < starCount; i++) {
      // Random position within cluster radius
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(0, clusterRadius);
      const x = clusterX + Math.cos(angle) * distance;
      const y = clusterY + Math.sin(angle) * distance;

      // Ensure stars stay within bounds
      const finalX = Phaser.Math.Clamp(x, 20, width - 20);
      const finalY = Phaser.Math.Clamp(y, 20, height - 20);

      // Randomly choose between small and regular star
      const starType =
        Phaser.Math.Between(0, 1) === 0 ? "particleStar" : "particleSmallStar";
      const star = scene.add.image(finalX, finalY, starType);

      // Random scale for variety
      const scale = Phaser.Math.FloatBetween(0.2, 0.7);
      star.setScale(scale);

      // Random depth layer (higher number = farther away)
      const depth = Phaser.Math.Between(minDepth, maxDepth);

      // Parallax factor: closer stars (lower depth) move more
      // Depth 1 moves most (factor 1.0), depth 10 moves least (factor 0.1)
      const parallaxFactor = 1 - (depth - minDepth) / (maxDepth - minDepth);
      const normalizedParallaxFactor = Math.max(0.1, parallaxFactor); // Minimum 0.1 movement

      star.setDepth(depth);

      // Random alpha based on depth (farther = dimmer)
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9) * (1 - (depth - minDepth) / (maxDepth - minDepth) * 0.5);
      star.setAlpha(Math.max(0.2, alpha));

      // Random drift speed based on depth (closer stars drift faster)
      const baseDriftSpeed = 0.1;
      const driftSpeed = baseDriftSpeed * normalizedParallaxFactor;
      const driftAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      
      stars.push({
        star,
        baseX: finalX,
        baseY: finalY,
        depth,
        parallaxFactor: normalizedParallaxFactor,
        spriteSwitchTimer: Phaser.Math.Between(2000, 5000), // Random initial timer
        currentSpriteType: starType,
        driftX: Math.cos(driftAngle) * driftSpeed,
        driftY: Math.sin(driftAngle) * driftSpeed,
      });
    }
  }

  // Add some scattered individual stars outside clusters
  const remainingStars = starCount - stars.length;
  for (let i = 0; i < remainingStars; i++) {
    const x = Phaser.Math.Between(20, width - 20);
    const y = Phaser.Math.Between(20, height - 20);

    const starType =
      Phaser.Math.Between(0, 1) === 0 ? "particleStar" : "particleSmallStar";
    const star = scene.add.image(x, y, starType);

    const scale = Phaser.Math.FloatBetween(0.2, 0.7);
    star.setScale(scale);

    const depth = Phaser.Math.Between(minDepth, maxDepth);
    const parallaxFactor = 1 - (depth - minDepth) / (maxDepth - minDepth);
    const normalizedParallaxFactor = Math.max(0.1, parallaxFactor);

    star.setDepth(depth);

    const alpha = Phaser.Math.FloatBetween(0.3, 0.9) * (1 - (depth - minDepth) / (maxDepth - minDepth) * 0.5);
    star.setAlpha(Math.max(0.2, alpha));

    // Random drift speed based on depth
    const baseDriftSpeed = 0.1;
    const driftSpeed = baseDriftSpeed * normalizedParallaxFactor;
    const driftAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    
    stars.push({
      star,
      baseX: x,
      baseY: y,
      depth,
      parallaxFactor: normalizedParallaxFactor,
      spriteSwitchTimer: Phaser.Math.Between(2000, 5000), // Random initial timer
      currentSpriteType: starType,
      driftX: Math.cos(driftAngle) * driftSpeed,
      driftY: Math.sin(driftAngle) * driftSpeed,
    });
  }

  return stars;
}

/**
 * Creates static stars that don't move at all (farthest background layer)
 * @param scene The Phaser scene to add the stars to
 * @param starCount Number of static stars to create (default: 30)
 */
export function createStaticStars(
  scene: Scene,
  starCount: number = 30
): StarData[] {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const stars: StarData[] = [];

  // Create static stars at random positions
  for (let i = 0; i < starCount; i++) {
    const x = Phaser.Math.Between(20, width - 20);
    const y = Phaser.Math.Between(20, height - 20);

    // Randomly choose between small and regular star
    const starType =
      Phaser.Math.Between(0, 1) === 0 ? "particleStar" : "particleSmallStar";
    const star = scene.add.image(x, y, starType);

    // Smaller scale for distant stars
    const scale = Phaser.Math.FloatBetween(0.1, 0.4);
    star.setScale(scale);

    // Highest depth (farthest away)
    const depth = 15; // Higher than parallax stars

    star.setDepth(depth);

    // Dimmer alpha for distant stars
    const alpha = Phaser.Math.FloatBetween(0.2, 0.5);
    star.setAlpha(alpha);

    stars.push({
      star,
      baseX: x,
      baseY: y,
      depth,
      parallaxFactor: 0, // No parallax movement
      spriteSwitchTimer: Phaser.Math.Between(2000, 5000), // Random initial timer
      currentSpriteType: starType,
      driftX: 0, // No drift
      driftY: 0, // No drift
    });
  }

  return stars;
}

/**
 * Smoke data structure for background ambiance
 */
export interface SmokeData {
  smoke: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  fadeSpeed: number;
  minAlpha: number;
  maxAlpha: number;
  currentAlpha: number;
  alphaDirection: number; // 1 for fading in, -1 for fading out
  parallaxFactor: number; // How much this smoke moves relative to mouse (0-1)
  depth: number; // Depth layer for parallax
}

/**
 * Creates random smoke effects for background ambiance in clusters
 * @param scene The Phaser scene to add the smoke to
 * @param smokeCount Number of smoke particles to create (default: 8)
 * @param starData Optional array of star data to position smoke clusters near star clusters
 * @param planetData Optional array of planet data to position smoke clusters near planets
 */
export function createBackgroundSmoke(
  scene: Scene,
  smokeCount: number = 8,
  starData?: StarData[],
  planetData?: PlanetData[]
): SmokeData[] {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const smokeParticles: SmokeData[] = [];

  // Find star cluster centers by grouping nearby stars
  const starClusterCenters: { x: number; y: number }[] = [];
  if (starData && starData.length > 0) {
    // Group stars that are within 150 pixels of each other
    const processed = new Set<number>();
    for (let i = 0; i < starData.length; i++) {
      if (processed.has(i)) continue;
      
      const clusterStars: number[] = [i];
      processed.add(i);
      
      // Find nearby stars
      for (let j = i + 1; j < starData.length; j++) {
        if (processed.has(j)) continue;
        const dx = starData[i].baseX - starData[j].baseX;
        const dy = starData[i].baseY - starData[j].baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          clusterStars.push(j);
          processed.add(j);
        }
      }
      
      // If cluster has at least 3 stars, calculate center
      if (clusterStars.length >= 3) {
        let sumX = 0, sumY = 0;
        clusterStars.forEach(idx => {
          sumX += starData[idx].baseX;
          sumY += starData[idx].baseY;
        });
        starClusterCenters.push({
          x: sumX / clusterStars.length,
          y: sumY / clusterStars.length
        });
      }
    }
  }

  // Create smoke clusters (at least 3 per cluster, can be more)
  // Calculate number of clusters based on smoke count
  const minSmokePerCluster = 3;
  const maxClusters = Math.floor(smokeCount / minSmokePerCluster);
  const clusterCount = Math.max(1, Phaser.Math.Between(1, maxClusters));
  const baseSmokePerCluster = Math.floor(smokeCount / clusterCount);
  const extraSmoke = smokeCount % clusterCount;

  // First, create cloud clusters above and in front of planets (one per planet)
  let smokeCreated = 0;
  if (planetData && planetData.length > 0) {
    for (let p = 0; p < planetData.length && smokeCreated < smokeCount; p++) {
      const planet = planetData[p];
      // Position cloud cluster close to and above the planet
      const planetScale = planet.scale;
      const planetRadius = 100 * planetScale; // Approximate planet radius
      
      // Cluster center: slightly offset horizontally, positioned above planet
      const offsetX = Phaser.Math.Between(-planetRadius * 0.5, planetRadius * 0.5);
      const offsetY = -planetRadius * Phaser.Math.FloatBetween(0.8, 1.5); // Above planet
      
      const clusterX = Phaser.Math.Clamp(planet.baseX + offsetX, 50, width - 50);
      const clusterY = Phaser.Math.Clamp(planet.baseY + offsetY, height * 0.1, height * 0.8);
      
      // Smaller cluster radius for planet clouds
      const clusterRadius = Phaser.Math.Between(40, 80);
      
      // Create 3-5 smoke particles per planet cloud cluster
      const smokePerPlanet = Phaser.Math.Between(3, 5);
      const actualSmokeCount = Math.min(smokePerPlanet, smokeCount - smokeCreated);
      
      for (let i = 0; i < actualSmokeCount && smokeCreated < smokeCount; i++) {
        // Random position within cluster radius
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(0, clusterRadius);
        const x = clusterX + Math.cos(angle) * distance;
        const y = clusterY + Math.sin(angle) * distance;

        // Ensure smoke stays within bounds
        const finalX = Phaser.Math.Clamp(x, 20, width - 20);
        const finalY = Phaser.Math.Clamp(y, height * 0.1, height * 0.9);

        // Randomly choose a smoke sprite
        const smokeNum = Phaser.Math.Between(1, 8);
        const smokeKey = `smoke_${smokeNum.toString().padStart(2, "0")}`;
        const smoke = scene.add.image(finalX, finalY, smokeKey);

        // Random scale for variety
        const scale = Phaser.Math.FloatBetween(0.3, 0.8);
        smoke.setScale(scale);

        // Depth should be higher than planet depth to render in front
        // Planets are at depth 11-15, so clouds in front should be at depth 16+
        const cloudDepth = planet.depth + 1; // In front of the planet
        smoke.setDepth(cloudDepth);

        // Parallax factor: use planet's parallax factor for clouds in front
        const normalizedParallaxFactor = planet.parallaxFactor;

        // Random slow drift (mostly upward with slight horizontal)
        const driftAngle = Phaser.Math.FloatBetween(-Math.PI / 6, Math.PI / 6); // Slight angle variation
        const driftSpeed = Phaser.Math.FloatBetween(0.02, 0.08);
        const driftX = Math.sin(driftAngle) * driftSpeed;
        const driftY = -Math.abs(Math.cos(driftAngle) * driftSpeed); // Always upward

        // Random alpha range for subtle pulsing (reduced overall alpha for clusters)
        const minAlpha = Phaser.Math.FloatBetween(0.04, 0.08);
        const maxAlpha = Phaser.Math.FloatBetween(0.08, 0.15);
        const initialAlpha = Phaser.Math.FloatBetween(minAlpha, maxAlpha);

        smoke.setAlpha(initialAlpha);

        // Random fade speed (slower for more gradual fading)
        const fadeSpeed = Phaser.Math.FloatBetween(0.0002, 0.0008);

        smokeParticles.push({
          smoke,
          baseX: finalX,
          baseY: finalY,
          driftX,
          driftY,
          fadeSpeed,
          minAlpha,
          maxAlpha,
          currentAlpha: initialAlpha,
          alphaDirection: Phaser.Math.Between(0, 1) === 0 ? 1 : -1, // Random initial direction
          parallaxFactor: normalizedParallaxFactor,
          depth: cloudDepth,
        });
        
        smokeCreated++;
      }
      
      // Also create a cloud cluster in front of the planet (not just above)
      const frontClusterX = Phaser.Math.Clamp(
        planet.baseX + Phaser.Math.Between(-planetRadius * 0.3, planetRadius * 0.3),
        50,
        width - 50
      );
      const frontClusterY = Phaser.Math.Clamp(
        planet.baseY + Phaser.Math.Between(-planetRadius * 0.3, planetRadius * 0.3),
        height * 0.1,
        height * 0.9
      );
      
      const frontClusterRadius = Phaser.Math.Between(30, 60);
      const frontSmokeCount = Phaser.Math.Between(3, 5);
      const actualFrontSmokeCount = Math.min(frontSmokeCount, smokeCount - smokeCreated);
      
      for (let i = 0; i < actualFrontSmokeCount && smokeCreated < smokeCount; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(0, frontClusterRadius);
        const x = frontClusterX + Math.cos(angle) * distance;
        const y = frontClusterY + Math.sin(angle) * distance;

        const finalX = Phaser.Math.Clamp(x, 20, width - 20);
        const finalY = Phaser.Math.Clamp(y, height * 0.1, height * 0.9);

        const smokeNum = Phaser.Math.Between(1, 8);
        const smokeKey = `smoke_${smokeNum.toString().padStart(2, "0")}`;
        const smoke = scene.add.image(finalX, finalY, smokeKey);

        const scale = Phaser.Math.FloatBetween(0.3, 0.8);
        smoke.setScale(scale);

        // Depth higher than planet to render in front
        const frontCloudDepth = planet.depth + 1;
        smoke.setDepth(frontCloudDepth);

        const driftAngle = Phaser.Math.FloatBetween(-Math.PI / 6, Math.PI / 6);
        const driftSpeed = Phaser.Math.FloatBetween(0.02, 0.08);
        const driftX = Math.sin(driftAngle) * driftSpeed;
        const driftY = -Math.abs(Math.cos(driftAngle) * driftSpeed);

        const minAlpha = Phaser.Math.FloatBetween(0.04, 0.08);
        const maxAlpha = Phaser.Math.FloatBetween(0.08, 0.15);
        const initialAlpha = Phaser.Math.FloatBetween(minAlpha, maxAlpha);

        smoke.setAlpha(initialAlpha);

        const fadeSpeed = Phaser.Math.FloatBetween(0.0002, 0.0008);

        smokeParticles.push({
          smoke,
          baseX: finalX,
          baseY: finalY,
          driftX,
          driftY,
          fadeSpeed,
          minAlpha,
          maxAlpha,
          currentAlpha: initialAlpha,
          alphaDirection: Phaser.Math.Between(0, 1) === 0 ? 1 : -1,
          parallaxFactor: planet.parallaxFactor,
          depth: frontCloudDepth,
        });
        
        smokeCreated++;
      }
    }
  }

  // Then create remaining smoke clusters (near star clusters or random)
  for (let cluster = 0; cluster < clusterCount && smokeCreated < smokeCount; cluster++) {
    // Determine cluster center - prefer near star clusters
    let clusterX: number, clusterY: number;
    
    if (starClusterCenters.length > 0 && Phaser.Math.Between(0, 1) < 0.7) {
      // 70% chance to position near a star cluster
      const starCluster = starClusterCenters[Phaser.Math.Between(0, starClusterCenters.length - 1)];
      // Add some random offset to not be exactly on the star cluster
      clusterX = Phaser.Math.Clamp(
        starCluster.x + Phaser.Math.Between(-100, 100),
        50,
        width - 50
      );
      clusterY = Phaser.Math.Clamp(
        starCluster.y + Phaser.Math.Between(-100, 100),
        height * 0.2,
        height * 0.9
      );
    } else {
      // Random position
      clusterX = Phaser.Math.Between(width * 0.1, width * 0.9);
      clusterY = Phaser.Math.Between(height * 0.3, height * 0.9);
    }

    // Cluster radius for smoke
    const clusterRadius = Phaser.Math.Between(60, 120);
    
    // Number of smoke particles in this cluster (at least 3)
    const smokeInCluster = baseSmokePerCluster + (cluster < extraSmoke ? 1 : 0);
    const actualSmokeCount = Math.max(3, smokeInCluster);
    
    // Create smoke particles in this cluster
    for (let i = 0; i < actualSmokeCount && smokeCreated < smokeCount; i++) {
      // Random position within cluster radius
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(0, clusterRadius);
      const x = clusterX + Math.cos(angle) * distance;
      const y = clusterY + Math.sin(angle) * distance;

      // Ensure smoke stays within bounds
      const finalX = Phaser.Math.Clamp(x, 20, width - 20);
      const finalY = Phaser.Math.Clamp(y, height * 0.2, height * 0.9);

      // Randomly choose a smoke sprite
      const smokeNum = Phaser.Math.Between(1, 8);
      const smokeKey = `smoke_${smokeNum.toString().padStart(2, "0")}`;
      const smoke = scene.add.image(finalX, finalY, smokeKey);

      // Random scale for variety
      const scale = Phaser.Math.FloatBetween(0.3, 0.8);
      smoke.setScale(scale);

        // Depth should be higher than planet depth to render in front
        // Planets are at depth 11-15, so clouds in front should be at depth 16+
        const cloudDepth = planet.depth + 1; // In front of the planet
        smoke.setDepth(cloudDepth);

        // Parallax factor: use planet's parallax factor for clouds in front
        const normalizedParallaxFactor = planet.parallaxFactor;

      // Random slow drift (mostly upward with slight horizontal)
      const driftAngle = Phaser.Math.FloatBetween(-Math.PI / 6, Math.PI / 6); // Slight angle variation
      const driftSpeed = Phaser.Math.FloatBetween(0.02, 0.08);
      const driftX = Math.sin(driftAngle) * driftSpeed;
      const driftY = -Math.abs(Math.cos(driftAngle) * driftSpeed); // Always upward

      // Random alpha range for subtle pulsing (reduced overall alpha for clusters)
      const minAlpha = Phaser.Math.FloatBetween(0.04, 0.08);
      const maxAlpha = Phaser.Math.FloatBetween(0.08, 0.15);
      const initialAlpha = Phaser.Math.FloatBetween(minAlpha, maxAlpha);

      smoke.setAlpha(initialAlpha);

      // Random fade speed (slower for more gradual fading)
      const fadeSpeed = Phaser.Math.FloatBetween(0.0002, 0.0008);

      smokeParticles.push({
        smoke,
        baseX: finalX,
        baseY: finalY,
        driftX,
        driftY,
        fadeSpeed,
        minAlpha,
        maxAlpha,
        currentAlpha: initialAlpha,
        alphaDirection: Phaser.Math.Between(0, 1) === 0 ? 1 : -1, // Random initial direction
          parallaxFactor: normalizedParallaxFactor,
          depth: cloudDepth,
        });
      
      smokeCreated++;
    }
  }

  return smokeParticles;
}

/**
 * Updates smoke positions, alpha, rotation, and parallax for ambient effect
 * @param smokeParticles Array of smoke data
 * @param deltaTime Time elapsed since last frame
 * @param mouseX Mouse X position (normalized to -1 to 1, where 0 is center)
 * @param mouseY Mouse Y position (normalized to -1 to 1, where 0 is center)
 * @param maxOffset Maximum offset distance in pixels for mouse parallax
 * @param width Screen width for wrapping
 * @param height Screen height
 */
export function updateBackgroundSmoke(
  smokeParticles: SmokeData[],
  deltaTime: number,
  mouseX: number,
  mouseY: number,
  maxOffset: number = 50,
  width: number,
  height: number
): void {
  smokeParticles.forEach((smokeData) => {
    // Update position with drift
    smokeData.baseX += smokeData.driftX * (deltaTime / 16);
    smokeData.baseY += smokeData.driftY * (deltaTime / 16);

    // Wrap horizontally, reset vertically when off screen
    if (smokeData.baseX < -50) smokeData.baseX = width + 50;
    if (smokeData.baseX > width + 50) smokeData.baseX = -50;
    if (smokeData.baseY < -50) {
      // Reset to bottom when it goes off top
      smokeData.baseY = height + 50;
      smokeData.baseX = Phaser.Math.Between(0, width);
    }

    // Calculate mouse parallax offset (additive to drift)
    const parallaxOffsetX = mouseX * maxOffset * smokeData.parallaxFactor;
    const parallaxOffsetY = mouseY * maxOffset * smokeData.parallaxFactor;

    // Update alpha with pulsing effect
    smokeData.currentAlpha +=
      smokeData.alphaDirection * smokeData.fadeSpeed * (deltaTime / 16);

    // Reverse direction at boundaries
    if (smokeData.currentAlpha >= smokeData.maxAlpha) {
      smokeData.currentAlpha = smokeData.maxAlpha;
      smokeData.alphaDirection = -1;
    } else if (smokeData.currentAlpha <= smokeData.minAlpha) {
      smokeData.currentAlpha = smokeData.minAlpha;
      smokeData.alphaDirection = 1;
    }

    // Update smoke position (no rotation)
    smokeData.smoke.setAlpha(smokeData.currentAlpha);
    smokeData.smoke.setPosition(
      smokeData.baseX + parallaxOffsetX,
      smokeData.baseY + parallaxOffsetY
    );
  });
}

/**
 * Updates star positions with continuous drift and mouse parallax
 * Also handles sprite switching for twinkling effect
 * @param stars Array of star data
 * @param deltaTime Time elapsed since last frame
 * @param mouseX Mouse X position (normalized to -1 to 1, where 0 is center)
 * @param mouseY Mouse Y position (normalized to -1 to 1, where 0 is center)
 * @param maxOffset Maximum offset distance in pixels for mouse parallax
 * @param width Screen width for wrapping
 * @param height Screen height for wrapping
 */
export function updateStarParallax(
  stars: StarData[],
  deltaTime: number,
  mouseX: number,
  mouseY: number,
  maxOffset: number = 50,
  width: number,
  height: number
): void {
  stars.forEach((starData) => {
    // Update sprite switch timer
    starData.spriteSwitchTimer -= deltaTime;
    if (starData.spriteSwitchTimer <= 0) {
      // Switch sprite
      const newSpriteType =
        starData.currentSpriteType === "particleStar"
          ? "particleSmallStar"
          : "particleStar";
      starData.currentSpriteType = newSpriteType;
      
      // Update the star's texture
      starData.star.setTexture(newSpriteType);
      
      // Reset timer with random duration
      starData.spriteSwitchTimer = Phaser.Math.Between(2000, 5000);
    }

    // Update base position with continuous drift
    starData.baseX += starData.driftX * (deltaTime / 16); // Normalize to 60fps
    starData.baseY += starData.driftY * (deltaTime / 16);

    // Wrap around screen edges
    if (starData.baseX < 0) starData.baseX += width;
    if (starData.baseX > width) starData.baseX -= width;
    if (starData.baseY < 0) starData.baseY += height;
    if (starData.baseY > height) starData.baseY -= height;

    // Calculate mouse parallax offset (additive to drift)
    const parallaxOffsetX = mouseX * maxOffset * starData.parallaxFactor;
    const parallaxOffsetY = mouseY * maxOffset * starData.parallaxFactor;

    // Update star position: base position + drift + mouse parallax
    starData.star.setPosition(
      starData.baseX + parallaxOffsetX,
      starData.baseY + parallaxOffsetY
    );
  });
}

/**
 * Planet data structure for parallax effect
 */
export interface PlanetData {
  planet: Phaser.GameObjects.Image;
  light?: Phaser.GameObjects.Image; // Light effect on top
  baseX: number;
  baseY: number;
  depth: number; // Depth layer for parallax (should be very different between planets)
  parallaxFactor: number; // How much this planet moves relative to mouse (0-1)
  scale: number; // Planet scale
}

/**
 * Creates planets for background using pre-made planet sprites
 * @param scene The Phaser scene to add the planets to
 * @param planetCount Number of planets to create (default: 2)
 */
export function createPlanets(
  scene: Scene,
  planetCount: number = 2
): PlanetData[] {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const planets: PlanetData[] = [];
  
  // All planets use the same light (one light source)
  const lightNum = Phaser.Math.Between(0, 10);
  const lightKey = `light${lightNum}`;
  
  // Distribute planets across different depths for parallax
  // Planets should be above stars (stars are at depth 1-10, so planets at 11-15)
  const depths = [11, 12, 13, 14, 15]; // Very different z-space, above stars
  const minDepth = 11;
  const maxDepth = 15;
  
  for (let i = 0; i < planetCount; i++) {
    // Random planet sprite (0-8)
    const planetNum = Phaser.Math.Between(0, 8);
    const planetKey = `planet${planetNum.toString().padStart(2, "0")}`;
    
    // Very different z-space (depth)
    const depth = depths[i % depths.length];
    
    // Parallax factor based on depth (closer = moves more)
    const parallaxFactor = (maxDepth - depth) / (maxDepth - minDepth);
    const normalizedParallaxFactor = Math.max(0.1, Math.min(1.0, parallaxFactor));
    
    // Scale based on depth (farther = smaller) - smaller overall
    const baseScale = 0.08;
    const scaleVariation = 0.05;
    const scale = baseScale + (1 - normalizedParallaxFactor) * scaleVariation;
    
    // Random position (avoid overlap)
    const x = Phaser.Math.Between(width * 0.1, width * 0.9);
    const y = Phaser.Math.Between(height * 0.15, height * 0.85);
    
    // Create planet using pre-made sprite
    const planet = scene.add.image(x, y, planetKey);
    planet.setScale(scale);
    planet.setDepth(depth);
    planet.setAlpha(1.0); // Fully opaque (solid)
    
    // Tint planet darker/muted to fade into background (without using alpha)
    // Use a dark tint to make planets less visible and blend with background
    const tintAmount = Phaser.Math.FloatBetween(0.4, 0.6); // Darker tint for more subtle appearance
    planet.setTint(Phaser.Display.Color.GetColor(
      Math.floor(255 * tintAmount),
      Math.floor(255 * tintAmount),
      Math.floor(255 * tintAmount)
    ));
    
    // Add light effect on top of planet with color blending
    // Scale light to match planet size (proportional to planet scale)
    const light = scene.add.image(x, y, lightKey);
    light.setScale(scale); // Match planet scale exactly for proper fit
    light.setDepth(depth + 0.1); // In front of planet (higher depth = on top)
    light.setAlpha(Phaser.Math.FloatBetween(0.4, 0.5));
    
    // Use blend mode for better color blending with the planet
    // SCREEN or ADD work well for light effects
    light.setBlendMode(Phaser.BlendModes.SCREEN);
    
    planets.push({
      planet,
      light,
      baseX: x,
      baseY: y,
      depth,
      parallaxFactor: normalizedParallaxFactor,
      scale,
    });
  }
  
  return planets;
}

/**
 * Updates planet positions with parallax effect
 * @param planets Array of planet data
 * @param deltaTime Time elapsed since last frame
 * @param mouseX Mouse X position (normalized to -1 to 1, where 0 is center)
 * @param mouseY Mouse Y position (normalized to -1 to 1, where 0 is center)
 * @param maxOffset Maximum offset distance in pixels for mouse parallax
 * @param width Screen width
 * @param height Screen height
 */
export function updatePlanetParallax(
  planets: PlanetData[],
  deltaTime: number,
  mouseX: number,
  mouseY: number,
  maxOffset: number = 30,
  width: number,
  height: number
): void {
  planets.forEach((planetData) => {
    // Calculate mouse parallax offset
    const parallaxOffsetX = mouseX * maxOffset * planetData.parallaxFactor;
    const parallaxOffsetY = mouseY * maxOffset * planetData.parallaxFactor;
    
    // Update planet position
    planetData.planet.setPosition(
      planetData.baseX + parallaxOffsetX,
      planetData.baseY + parallaxOffsetY
    );
    
    // Update light position if it exists
    if (planetData.light) {
      planetData.light.setPosition(
        planetData.baseX + parallaxOffsetX,
        planetData.baseY + parallaxOffsetY
      );
    }
  });
}

