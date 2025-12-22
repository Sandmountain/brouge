import { BrickData, LevelData } from "../../../game/types";

export const getUnpairedPortalIds = (bricks: BrickData[]): string[] => {
  const portalIdCounts = new Map<string, number>();
  bricks
    .filter((b) => b.type === "portal" && b.id)
    .forEach((b) => {
      const count = portalIdCounts.get(b.id!) || 0;
      portalIdCounts.set(b.id!, count + 1);
    });

  const unpairedPortalIds: string[] = [];
  for (const [id, count] of portalIdCounts.entries()) {
    if (count === 1) {
      unpairedPortalIds.push(id);
    }
  }

  return unpairedPortalIds;
};

export const generatePortalPairIds = (
  count: number,
  existingBricks: BrickData[]
): string[] => {
  const unpairedPortalIds = getUnpairedPortalIds(existingBricks);
  const portalPairIds: string[] = [];

  for (let i = 0; i < count; i++) {
    if (i < unpairedPortalIds.length) {
      // Link to existing unpaired portal
      portalPairIds.push(unpairedPortalIds[i]);
    } else {
      // Create new pair - portals in pairs get the same ID
      const isFirstInPair = (i - unpairedPortalIds.length) % 2 === 0;
      if (isFirstInPair) {
        // First portal in new pair - create new ID
        const newPairId = `portal_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        portalPairIds.push(newPairId);
      } else {
        // Second portal in pair - use the ID from the previous portal
        portalPairIds.push(portalPairIds[portalPairIds.length - 1]);
      }
    }
  }

  return portalPairIds;
};

export const getNextPortalPairId = (
  levelData: LevelData
): string | undefined => {
  const unpairedPortalIds = getUnpairedPortalIds(levelData.bricks);
  return (
    unpairedPortalIds[0] ||
    `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
};

