/**
 * airspace テスト
 *
 * 空港・飛行禁止区域データのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  AIRPORT_ZONES,
  NO_FLY_ZONES,
  checkAirspaceRestrictions,
  getAirportZonesGeoJSON,
  getNoFlyZonesGeoJSON,
  getExternalMapLinks
} from './airspace';

describe('airspace', () => {

  describe('AIRPORT_ZONES', () => {
    it('主要空港データが存在する', () => {
      expect(AIRPORT_ZONES.length).toBeGreaterThan(20);
    });

    it('羽田空港が含まれている', () => {
      const haneda = AIRPORT_ZONES.find(a => a.name.includes('羽田'));
      expect(haneda).toBeDefined();
      expect(haneda.radius).toBe(9000);
      expect(haneda.type).toBe('airport');
    });

    it('成田空港が含まれている', () => {
      const narita = AIRPORT_ZONES.find(a => a.name.includes('成田'));
      expect(narita).toBeDefined();
      expect(narita.radius).toBe(9000);
    });

    it('すべての空港に必要なプロパティがある', () => {
      AIRPORT_ZONES.forEach(airport => {
        expect(airport).toHaveProperty('name');
        expect(airport).toHaveProperty('lat');
        expect(airport).toHaveProperty('lng');
        expect(airport).toHaveProperty('radius');
        expect(airport).toHaveProperty('type');
        expect(typeof airport.lat).toBe('number');
        expect(typeof airport.lng).toBe('number');
        expect(airport.radius).toBeGreaterThan(0);
      });
    });

    it('座標が日本国内の範囲にある', () => {
      AIRPORT_ZONES.forEach(airport => {
        expect(airport.lat).toBeGreaterThan(20); // 沖縄より南
        expect(airport.lat).toBeLessThan(50);    // 北海道より北
        expect(airport.lng).toBeGreaterThan(120);
        expect(airport.lng).toBeLessThan(150);
      });
    });
  });

  describe('NO_FLY_ZONES', () => {
    it('飛行禁止区域データが存在する', () => {
      expect(NO_FLY_ZONES.length).toBeGreaterThan(5);
    });

    it('皇居が含まれている', () => {
      const kokyo = NO_FLY_ZONES.find(z => z.name === '皇居');
      expect(kokyo).toBeDefined();
      expect(kokyo.type).toBe('prohibited');
    });

    it('国会議事堂が含まれている', () => {
      const kokkai = NO_FLY_ZONES.find(z => z.name === '国会議事堂');
      expect(kokkai).toBeDefined();
    });

    it('原発施設が含まれている', () => {
      const nukes = NO_FLY_ZONES.filter(z => z.name.includes('原発'));
      expect(nukes.length).toBeGreaterThan(0);
    });

    it('すべての禁止区域に必要なプロパティがある', () => {
      NO_FLY_ZONES.forEach(zone => {
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('lat');
        expect(zone).toHaveProperty('lng');
        expect(zone).toHaveProperty('radius');
        expect(zone).toHaveProperty('type');
        expect(zone.type).toBe('prohibited');
      });
    });
  });

  describe('checkAirspaceRestrictions', () => {
    it('羽田空港付近で制限を検出', () => {
      // 羽田空港の座標付近
      const restrictions = checkAirspaceRestrictions(35.5494, 139.7798);

      expect(restrictions.length).toBeGreaterThan(0);
      expect(restrictions[0].type).toBe('airport');
      expect(restrictions[0].name).toContain('羽田');
    });

    it('皇居付近で禁止区域を検出', () => {
      // 皇居の座標
      const restrictions = checkAirspaceRestrictions(35.6852, 139.7528);

      expect(restrictions.length).toBeGreaterThan(0);
      expect(restrictions.some(r => r.type === 'prohibited')).toBe(true);
      expect(restrictions.some(r => r.name === '皇居')).toBe(true);
    });

    it('安全なエリアで制限なし', () => {
      // 空港・禁止区域から離れた場所
      const restrictions = checkAirspaceRestrictions(35.3, 139.0);

      expect(restrictions.length).toBe(0);
    });

    it('返却される制限情報のフォーマットが正しい', () => {
      const restrictions = checkAirspaceRestrictions(35.5494, 139.7798);

      if (restrictions.length > 0) {
        const restriction = restrictions[0];
        expect(restriction).toHaveProperty('type');
        expect(restriction).toHaveProperty('name');
        expect(restriction).toHaveProperty('distance');
        expect(restriction).toHaveProperty('radius');
        expect(restriction).toHaveProperty('severity');
        expect(typeof restriction.distance).toBe('number');
      }
    });
  });

  describe('getAirportZonesGeoJSON', () => {
    it('GeoJSON FeatureCollectionを返す', () => {
      const geojson = getAirportZonesGeoJSON();

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toBeDefined();
      expect(Array.isArray(geojson.features)).toBe(true);
    });

    it('空港ごとにポリゴンFeatureを生成', () => {
      const geojson = getAirportZonesGeoJSON();

      expect(geojson.features.length).toBe(AIRPORT_ZONES.length);

      geojson.features.forEach(feature => {
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Polygon');
        expect(feature.properties.name).toBeDefined();
        expect(feature.properties.radius).toBeDefined();
      });
    });
  });

  describe('getNoFlyZonesGeoJSON', () => {
    it('GeoJSON FeatureCollectionを返す', () => {
      const geojson = getNoFlyZonesGeoJSON();

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBe(NO_FLY_ZONES.length);
    });

    it('禁止区域ごとにポリゴンFeatureを生成', () => {
      const geojson = getNoFlyZonesGeoJSON();

      geojson.features.forEach(feature => {
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Polygon');
        expect(feature.properties.type).toBe('prohibited');
      });
    });
  });

  describe('getExternalMapLinks', () => {
    it('外部サービスへのリンクを生成', () => {
      const links = getExternalMapLinks(35.6812, 139.7671);

      expect(links).toHaveProperty('dips');
      expect(links).toHaveProperty('sorapass');
      expect(links).toHaveProperty('geospatial');
    });

    it('SoraPassリンクに座標が含まれる', () => {
      const lat = 35.6812;
      const lng = 139.7671;
      const links = getExternalMapLinks(lat, lng);

      expect(links.sorapass).toContain(lat.toString());
      expect(links.sorapass).toContain(lng.toString());
    });

    it('国土地理院リンクに座標が含まれる', () => {
      const lat = 35.6812;
      const lng = 139.7671;
      const links = getExternalMapLinks(lat, lng);

      expect(links.geospatial).toContain(lat.toString());
      expect(links.geospatial).toContain(lng.toString());
    });
  });
});
