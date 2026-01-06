import { useContext } from 'react';
import { DroneDataContext } from '../contexts/DroneDataContext';

export const useDroneData = () => {
  const context = useContext(DroneDataContext);
  if (!context) {
    throw new Error('useDroneData must be used within a DroneDataProvider');
  }
  return context;
};
