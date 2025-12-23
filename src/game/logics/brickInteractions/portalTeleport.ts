import { BrickData } from "../../types";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };
type Scene = Phaser.Scene;

interface PortalTeleportContext {
  scene: Scene;
  ball: Phaser.Physics.Arcade.Sprite;
  bricks: Phaser.Physics.Arcade.StaticGroup;
  prevBallVelocity: { x: number; y: number };
}

/**
 * Teleport ball to paired portal
 */
export function teleportBall(
  brick: BrickSprite,
  brickData: BrickData,
  context: PortalTeleportContext
): void {
  const { scene, ball, bricks, prevBallVelocity } = context;

  if (!brickData.id) return;

  // If this portal is one-way, it can only receive, not send
  if (brickData.isOneWay) return;

  // Find the paired portal
  let pairedPortal: BrickSprite | null = null;

  bricks.children.entries.forEach((b) => {
    const brickSprite = b as BrickSprite;
    if (
      brickSprite.brickData &&
      brickSprite.brickData.type === "portal" &&
      brickSprite.brickData.id === brickData.id &&
      brickSprite !== brick
    ) {
      pairedPortal = brickSprite;
    }
  });

  if (!pairedPortal) return;
  const portalWithData = pairedPortal as BrickSprite & {
    brickData: BrickData;
  };
  if (!portalWithData.brickData) return;

  // Teleport ball to paired portal position
  const portalX = (pairedPortal as Phaser.GameObjects.DOMElement).x;
  const portalY = (pairedPortal as Phaser.GameObjects.DOMElement).y;
  ball.setPosition(portalX, portalY);

  // Restore pre-collision velocity (preserve momentum and direction)
  ball.setVelocity(prevBallVelocity.x, prevBallVelocity.y);

  // Visual feedback on both portals
  scene.tweens.add({
    targets: [brick, pairedPortal],
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 150,
    yoyo: true,
    ease: "Power2",
  });

  // Add particle effect or visual indicator
  scene.cameras.main.flash(100, 155, 89, 189, false); // Purple flash
}

