import { useState, useCallback, useRef, useEffect } from "react";
import { LevelData } from "../../../game/types";

interface HistoryState {
  past: LevelData[];
  present: LevelData;
  future: LevelData[];
}

export const useHistory = (initialState: LevelData) => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    setHistory((current) => {
      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, [canRedo]);

  const setState = useCallback(
    (newState: LevelData | ((prev: LevelData) => LevelData), skipHistory = false) => {
      if (skipHistory) {
        // Direct update without adding to history (used when undoing/redoing)
        setHistory((current) => ({
          ...current,
          present:
            typeof newState === "function" ? newState(current.present) : newState,
        }));
        return;
      }

      setHistory((current) => {
        const nextState =
          typeof newState === "function" ? newState(current.present) : newState;

        // Deep comparison to avoid adding duplicate states
        // Only add to history if state actually changed
        const stateChanged =
          JSON.stringify(current.present) !== JSON.stringify(nextState);

        if (!stateChanged) {
          return {
            ...current,
            present: nextState,
          };
        }

        return {
          past: [...current.past, current.present].slice(-50), // Limit to 50 undo steps
          present: nextState,
          future: [], // Clear future when new action is performed
        };
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory((current) => ({
      past: [],
      present: current.present,
      future: [],
    }));
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
};

