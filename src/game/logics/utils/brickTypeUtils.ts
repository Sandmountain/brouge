import { BrickType } from "../../types";

/**
 * Check if a brick type is a fuse type
 */
export function isFuseType(type: BrickType): boolean {
  return (
    type === "fuse-horizontal" ||
    type === "fuse-left-up" ||
    type === "fuse-right-up" ||
    type === "fuse-left-down" ||
    type === "fuse-right-down" ||
    type === "fuse-vertical"
  );
}

