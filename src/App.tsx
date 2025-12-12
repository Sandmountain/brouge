import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { MainMenu } from "./game/scenes/MainMenu";
import { LevelEditor } from "./components/LevelEditor";
import { LevelData } from "./game/types";
import { EventBus } from "./game/EventBus";

function App() {
  // Persist editor state across hot reloads
  const [showEditor, setShowEditor] = useState(() => {
    // Check localStorage on initial mount
    const saved = localStorage.getItem("showEditor");
    return saved === "true";
  });

  const [testLevelData, setTestLevelData] = useState<LevelData | null>(null);
  // The sprite can only be moved in the MainMenu Scene
  const [canMoveSprite, setCanMoveSprite] = useState(true);

  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [spritePosition, setSpritePosition] = useState({ x: 0, y: 0 });

  // Persist editor state to localStorage whenever it changes
  useEffect(() => {
    if (showEditor) {
      localStorage.setItem("showEditor", "true");
    } else {
      localStorage.removeItem("showEditor");
    }
  }, [showEditor]);

  const changeScene = () => {
    if (phaserRef.current) {
      const scene = phaserRef.current.scene as MainMenu;

      if (scene) {
        scene.changeScene();
      }
    }
  };

  const moveSprite = () => {
    if (phaserRef.current) {
      const scene = phaserRef.current.scene as MainMenu;

      if (scene && scene.scene.key === "MainMenu") {
        // Get the update logo position
        scene.moveLogo(({ x, y }) => {
          setSpritePosition({ x, y });
        });
      }
    }
  };

  const addSprite = () => {
    if (phaserRef.current) {
      const scene = phaserRef.current.scene;

      if (scene) {
        // Add more stars
        const x = Phaser.Math.Between(64, scene.scale.width - 64);
        const y = Phaser.Math.Between(64, scene.scale.height - 64);

        //  `add.sprite` is a Phaser GameObjectFactory method and it returns a Sprite Game Object instance
        const star = scene.add.sprite(x, y, "star");

        //  ... which you can then act upon. Here we create a Phaser Tween to fade the star sprite in and out.
        //  You could, of course, do this from within the Phaser Scene code, but this is just an example
        //  showing that Phaser objects and systems can be acted upon from outside of Phaser itself.
        scene.add.tween({
          targets: star,
          duration: 500 + Math.random() * 1000,
          alpha: 0,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  };

  // Event emitted from the PhaserGame component
  const currentScene = (scene: Phaser.Scene) => {
    setCanMoveSprite(scene.scene.key !== "MainMenu");
  };

  const handleTestLevel = (levelData: LevelData) => {
    setTestLevelData(levelData);
    setShowEditor(false);
    // Start the game with the test level after a short delay to ensure Phaser is ready
    setTimeout(() => {
      if (phaserRef.current?.game) {
        phaserRef.current.game.scene.start("BrickBreaker", {
          gameState: {
            coins: 0,
            lives: 3,
            level: 1,
            score: 0,
            talents: [],
          },
          levelData: levelData,
          isTestMode: true, // Flag to indicate we're in test mode
        });
      }
    }, 200);
  };

  const handleBackToEditor = () => {
    setTestLevelData(null);
    setShowEditor(true);
    if (phaserRef.current?.game) {
      phaserRef.current.game.scene.stop("BrickBreaker");
      phaserRef.current.game.scene.start("MainMenu");
    }
  };

  const handleReturnFromTest = () => {
    setTestLevelData(null);
    setShowEditor(true);
    if (phaserRef.current?.game) {
      phaserRef.current.game.scene.stop("BrickBreaker");
    }
  };

  // Listen for return to editor event
  useEffect(() => {
    const handleReturnToEditor = () => {
      handleReturnFromTest();
    };

    EventBus.on("return-to-editor", handleReturnToEditor);
    return () => {
      EventBus.removeListener("return-to-editor");
    };
  }, []);

  if (showEditor) {
    return (
      <div id="app">
        <LevelEditor
          onTestLevel={handleTestLevel}
          onReturnFromTest={handleReturnFromTest}
          onBackToGame={() => setShowEditor(false)}
        />
      </div>
    );
  }

  if (testLevelData) {
    return (
      <div id="app">
        <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
          <button className="button" onClick={handleBackToEditor}>
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
      <div>
        <div>
          <button className="button" onClick={() => setShowEditor(true)}>
            Level Editor
          </button>
        </div>
        <div>
          <button className="button" onClick={changeScene}>
            Change Scene
          </button>
        </div>
        <div>
          <button
            disabled={canMoveSprite}
            className="button"
            onClick={moveSprite}
          >
            Toggle Movement
          </button>
        </div>
        <div className="spritePosition">
          Sprite Position:
          <pre>{`{\n  x: ${spritePosition.x}\n  y: ${spritePosition.y}\n}`}</pre>
        </div>
        <div>
          <button className="button" onClick={addSprite}>
            Add New Sprite
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
