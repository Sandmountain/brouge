import ReactDOM from "react-dom/client";
import App from "./App.tsx";
// Import all brick CSS modules - styles will be injected globally
import "./bricks/BaseBrick.module.css";
import "./bricks/DefaultBrick/DefaultBrick.module.css";
import "./bricks/MetalBrick/MetalBrick.module.css";
import "./bricks/UnbreakableBrick/UnbreakableBrick.module.css";
import "./bricks/TNTBrick/TNTBrick.module.css";
import "./bricks/GoldBrick/GoldBrick.module.css";
import "./bricks/BoostBrick/BoostBrick.module.css";
import "./bricks/PortalBrick/PortalBrick.module.css";
import "./bricks/ChaosBrick/ChaosBrick.module.css";
import "./bricks/FuseHorizontalBrick/FuseHorizontalBrick.module.css";
import "./bricks/FuseLeftUpBrick/FuseLeftUpBrick.module.css";
import "./bricks/FuseRightUpBrick/FuseRightUpBrick.module.css";
import "./bricks/FuseLeftDownBrick/FuseLeftDownBrick.module.css";
import "./bricks/FuseRightDownBrick/FuseRightDownBrick.module.css";
import "./bricks/FuseVerticalBrick/FuseVerticalBrick.module.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
