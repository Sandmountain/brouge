import React from "react";
import { BrickComponentProps } from "./types";
import { DefaultBrick } from "./DefaultBrick";
import { MetalBrick } from "./MetalBrick";
import { UnbreakableBrick } from "./UnbreakableBrick";
import { TNTBrick } from "./TNTBrick";
import { GoldBrick } from "./GoldBrick";
import { BoostBrick } from "./BoostBrick";
import { PortalBrick } from "./PortalBrick";
import { ChaosBrick } from "./ChaosBrick";
import { InvisibleBrick } from "./InvisibleBrick";
import { FuseHorizontalBrick } from "./FuseHorizontalBrick";
import { FuseLeftUpBrick } from "./FuseLeftUpBrick";
import { FuseRightUpBrick } from "./FuseRightUpBrick";
import { FuseLeftDownBrick } from "./FuseLeftDownBrick";
import { FuseRightDownBrick } from "./FuseRightDownBrick";
import { FuseVerticalBrick } from "./FuseVerticalBrick";

/**
 * Main Brick component that routes to the appropriate brick type component
 */
export function Brick(props: BrickComponentProps) {
  const { brickData, width, height, mode = "editor", className } = props;

  const commonProps = {
    brickData,
    width,
    height,
    mode,
    className,
  };

  switch (brickData.type) {
    case "default":
      return <DefaultBrick {...commonProps} />;
    case "metal":
      return <MetalBrick {...commonProps} />;
    case "unbreakable":
      return <UnbreakableBrick {...commonProps} />;
    case "tnt":
      return <TNTBrick {...commonProps} />;
    case "gold":
      return <GoldBrick {...commonProps} />;
    case "boost":
      return <BoostBrick {...commonProps} />;
    case "portal":
      return <PortalBrick {...commonProps} />;
    case "chaos":
      return <ChaosBrick {...commonProps} />;
    case "invisible":
      return <InvisibleBrick {...commonProps} />;
    case "fuse-horizontal":
      return <FuseHorizontalBrick {...commonProps} />;
    case "fuse-left-up":
      return <FuseLeftUpBrick {...commonProps} />;
    case "fuse-right-up":
      return <FuseRightUpBrick {...commonProps} />;
    case "fuse-left-down":
      return <FuseLeftDownBrick {...commonProps} />;
    case "fuse-right-down":
      return <FuseRightDownBrick {...commonProps} />;
    case "fuse-vertical":
      return <FuseVerticalBrick {...commonProps} />;
    default:
      return <DefaultBrick {...commonProps} />;
  }
}
