import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loadPolygons, savePolygons, loadWaypoints, saveWaypoints } from '../utils/storage';

const DroneDataContext = createContext(null);

export const DroneDataProvider = ({ children }) => {
  // Data state
  const [polygons, setPolygons] = useState(() => loadPolygons());
  const [waypoints, setWaypoints] = useState(() => loadWaypoints());
  const [selectedPolygonId, setSelectedPolygonId] = useState(null);
  
  // Undo/Redo history management
  const MAX_HISTORY = 20;
  const historyRef = useRef([{ polygons: loadPolygons(), waypoints: loadWaypoints() }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);

  // Auto-save polygons
  useEffect(() => {
    savePolygons(polygons);
  }, [polygons]);

  // Auto-save waypoints
  useEffect(() => {
    saveWaypoints(waypoints);
  }, [waypoints]);

  // History management
  const pushToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const currentState = { polygons, waypoints };
    const history = historyRef.current;
    const index = historyIndexRef.current;

    // Remove future states
    const newHistory = history.slice(0, index + 1);
    newHistory.push(currentState);

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      historyIndexRef.current = newHistory.length - 1;
    }

    historyRef.current = newHistory;
  }, [polygons, waypoints]);

  // Track changes for history
  useEffect(() => {
    pushToHistory();
  }, [polygons, waypoints, pushToHistory]);

  const undo = useCallback(() => {
    const index = historyIndexRef.current;
    if (index > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current = index - 1;
      const prevState = historyRef.current[index - 1];
      setPolygons(prevState.polygons);
      setWaypoints(prevState.waypoints);
      return true; // Success
    }
    return false; // Cannot undo
  }, []);

  const redo = useCallback(() => {
    const index = historyIndexRef.current;
    const history = historyRef.current;
    if (index < history.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current = index + 1;
      const nextState = history[index + 1];
      setPolygons(nextState.polygons);
      setWaypoints(nextState.waypoints);
      return true; // Success
    }
    return false; // Cannot redo
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return (
    <DroneDataContext.Provider value={{
      polygons,
      setPolygons,
      waypoints,
      setWaypoints,
      selectedPolygonId,
      setSelectedPolygonId,
      undo,
      redo,
      canUndo,
      canRedo
    }}>
      {children}
    </DroneDataContext.Provider>
  );
};

export const useDroneData = () => {
  const context = useContext(DroneDataContext);
  if (!context) {
    throw new Error('useDroneData must be used within a DroneDataProvider');
  }
  return context;
};
