import { describe, it, expect } from 'vitest';
import {
  NO_FLY_FACILITIES,
  getFacilitiesByType,
  isInNoFlyZone,
  generateRedZoneGeoJSON
} from './noFlyZones';

describe('NoFlyZoneService', () => {
  describe('Data Integrity', () => {
    it('should have facilities loaded', () => {
      expect(NO_FLY_FACILITIES.length).toBeGreaterThan(0);
    });

    it('should have unique IDs', () => {
      const ids = NO_FLY_FACILITIES.map(f => f.id);
      const uniqueIds = new Set(ids);
      // 重複がある場合は、どのIDが重複しているか確認できるようにする
      if (ids.length !== uniqueIds.size) {
        const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
        console.error('Duplicate IDs:', duplicates);
      }
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid coordinates', () => {
      NO_FLY_FACILITIES.forEach(f => {
        // 日本の概略範囲: 東経122-154, 北緯20-46
        expect(f.coordinates[0]).toBeGreaterThanOrEqual(120); // Longitude
        expect(f.coordinates[0]).toBeLessThanOrEqual(154);
        expect(f.coordinates[1]).toBeGreaterThanOrEqual(20);  // Latitude
        expect(f.coordinates[1]).toBeLessThanOrEqual(46);
      });
    });

    it('should have valid zone types', () => {
      NO_FLY_FACILITIES.forEach(f => {
        expect(['red', 'yellow']).toContain(f.zone);
      });
    });
  });

  describe('Utility Functions', () => {
    it('getFacilitiesByType should filter correctly', () => {
      const nuclearPlants = getFacilitiesByType('nuclear');
      expect(nuclearPlants.length).toBeGreaterThan(0);
      nuclearPlants.forEach(f => expect(f.type).toBe('nuclear'));
    });

    it('isInNoFlyZone should detect red zone', () => {
      // 皇居 (red zone)
      const result = isInNoFlyZone(35.6852, 139.7528);
      expect(result.inZone).toBe(true);
      expect(result.zone).toBe('red');
      expect(result.facility?.name).toBe('皇居');
    });

    it('isInNoFlyZone should return false for safe area', () => {
      // Safe area (太平洋上など)
      const result = isInNoFlyZone(30.0, 145.0);
      expect(result.inZone).toBe(false);
    });
  });

  describe('GeoJSON Generation', () => {
    it('generateRedZoneGeoJSON should return valid FeatureCollection', () => {
      const geojson = generateRedZoneGeoJSON();
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBeGreaterThan(0);
      geojson.features.forEach(f => {
        expect(f.type).toBe('Feature');
        expect(f.properties?.zone).toBe('red');
        expect(f.geometry.type).toBe('Polygon');
      });
    });
  });
});
