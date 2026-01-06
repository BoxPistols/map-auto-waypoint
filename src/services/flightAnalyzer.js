/**
 * FlightAnalyzer Facade
 * Backward compatibility for refactored services
 */

export * from './didService';
export * from './riskService';
export * from './optimizationService';
export * from './supportServices';

// Re-export utilities used in tests/components
export { getPolygonCenter, calculatePolygonArea as getPolygonArea } from './waypointGenerator';
export { getDistanceMeters } from '../utils/geoUtils';