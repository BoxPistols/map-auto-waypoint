/**
 * flightAnalyzer テスト
 *
 * ギャップ分析・安全位置計算・最適化プラン生成のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPolygonCenter,
  getPolygonArea,
  findNearestAirport,
  analyzeWaypointGaps,
  analyzePolygonGaps,
  generateOptimizationPlan,
  analyzeFlightPlanLocal,
  getDistanceMeters
} from './flightAnalyzer';

// テスト用のモックデータ
const createTestPolygon = (coords) => ({
  id: 'test-polygon-1',
  name: 'テストポリゴン',
  geometry: {
    type: 'Polygon',
    coordinates: [coords]
  }
});

const createTestWaypoint = (id, lat, lng, index = 1) => ({
  id,
  lat,
  lng,
  index,
  polygonId: 'test-polygon-1',
  type: 'vertex'
});

describe('flightAnalyzer', () => {

  describe('getPolygonCenter', () => {
    it('ポリゴンの中心座標を正しく計算する', () => {
      const polygon = createTestPolygon([
        [139.7, 35.6],
        [139.8, 35.6],
        [139.8, 35.7],
        [139.7, 35.7],
        [139.7, 35.6]
      ]);

      const center = getPolygonCenter(polygon);

      expect(center).toBeDefined();
      expect(center.lat).toBeCloseTo(35.65, 2);
      expect(center.lng).toBeCloseTo(139.75, 2);
    });

    it('無効なポリゴンでnullを返す', () => {
      expect(getPolygonCenter(null)).toBeNull();
      expect(getPolygonCenter({})).toBeNull();
      expect(getPolygonCenter({ geometry: {} })).toBeNull();
    });
  });

  describe('getDistanceMeters', () => {
    it('2点間の距離を正しく計算する（近距離）', () => {
      // 東京駅から皇居（約1km）
      const distance = getDistanceMeters(35.6812, 139.7671, 35.6852, 139.7528);
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(2000);
    });

    it('同じ座標で0を返す', () => {
      const distance = getDistanceMeters(35.6812, 139.7671, 35.6812, 139.7671);
      expect(distance).toBe(0);
    });

    it('長距離を正しく計算する（東京-大阪）', () => {
      // 東京から大阪（約400km）
      const distance = getDistanceMeters(35.6812, 139.7671, 34.6937, 135.5023);
      expect(distance).toBeGreaterThan(380000);
      expect(distance).toBeLessThan(420000);
    });
  });

  describe('findNearestAirport', () => {
    it('最寄りの空港を検索する', () => {
      // 羽田空港付近
      const nearest = findNearestAirport(35.5533, 139.7811);

      expect(nearest).toBeDefined();
      expect(nearest.name).toContain('羽田');
      expect(nearest.distance).toBeLessThan(5000); // 5km以内
    });

    it('大阪付近で伊丹・関西空港が見つかる', () => {
      // 大阪駅付近
      const nearest = findNearestAirport(34.7024, 135.4959);

      expect(nearest).toBeDefined();
      expect(nearest.name).toMatch(/伊丹|関西|大阪/);
    });
  });

  describe('analyzeWaypointGaps', () => {
    it('安全な位置のWaypointを検出', () => {
      // 空港・禁止区域から離れた安全な位置
      const waypoints = [
        createTestWaypoint('wp1', 35.3, 139.0, 1),
        createTestWaypoint('wp2', 35.31, 139.01, 2),
        createTestWaypoint('wp3', 35.32, 139.02, 3),
      ];

      const result = analyzeWaypointGaps(waypoints);

      expect(result.hasIssues).toBe(false);
      expect(result.totalGaps).toBe(0);
      expect(result.gaps).toHaveLength(0);
      expect(result.recommendedWaypoints).toHaveLength(3);
      result.recommendedWaypoints.forEach(wp => {
        expect(wp.modified).toBe(false);
      });
    });

    it('空港制限区域内のWaypointを検出', () => {
      // 羽田空港の近く
      const waypoints = [
        createTestWaypoint('wp1', 35.5533, 139.7811, 1), // 羽田空港近く
      ];

      const result = analyzeWaypointGaps(waypoints);

      expect(result.hasIssues).toBe(true);
      expect(result.totalGaps).toBe(1);
      expect(result.gaps[0].issues.length).toBeGreaterThan(0);
      expect(result.gaps[0].issues[0].type).toBe('airport');
    });

    it('推奨位置を計算して安全な位置に移動', () => {
      // 羽田空港の近く
      const waypoints = [
        createTestWaypoint('wp1', 35.5533, 139.7811, 1),
      ];

      const result = analyzeWaypointGaps(waypoints);

      expect(result.hasIssues).toBe(true);
      expect(result.recommendedWaypoints[0].modified).toBe(true);

      // 推奨位置が元の位置と異なることを確認
      const original = waypoints[0];
      const recommended = result.recommendedWaypoints[0];
      expect(recommended.lat).not.toBeCloseTo(original.lat, 3);
    });

    it('空のWaypoint配列を処理', () => {
      const result = analyzeWaypointGaps([]);

      expect(result.hasIssues).toBe(false);
      expect(result.totalGaps).toBe(0);
      expect(result.recommendedWaypoints).toHaveLength(0);
    });
  });

  describe('analyzePolygonGaps', () => {
    it('安全なエリアのポリゴンを検出', () => {
      // 空港から離れた安全なエリア
      const polygon = createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ]);

      const result = analyzePolygonGaps(polygon);

      expect(result.hasIssues).toBe(false);
      expect(result.totalGaps).toBe(0);
      expect(result.recommendedPolygon).toBeNull();
    });

    it('空港制限区域と重なるポリゴンを検出', () => {
      // 羽田空港付近のポリゴン
      const polygon = createTestPolygon([
        [139.78, 35.55],
        [139.79, 35.55],
        [139.79, 35.56],
        [139.78, 35.56],
        [139.78, 35.55]
      ]);

      const result = analyzePolygonGaps(polygon);

      expect(result.hasIssues).toBe(true);
      expect(result.totalGaps).toBeGreaterThan(0);
      expect(result.recommendedPolygon).toBeDefined();
    });

    it('無効なポリゴンを処理', () => {
      const result = analyzePolygonGaps(null);

      expect(result.hasIssues).toBe(false);
      expect(result.recommendedPolygon).toBeNull();
    });
  });

  describe('generateOptimizationPlan', () => {
    it('安全なプランに対して問題なしを返す', () => {
      const polygons = [createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ])];

      const waypoints = [
        createTestWaypoint('wp1', 35.3, 139.0, 1),
        createTestWaypoint('wp2', 35.31, 139.01, 2),
      ];

      const plan = generateOptimizationPlan(polygons, waypoints);

      expect(plan.hasIssues).toBe(false);
      expect(plan.actions).toHaveLength(0);
      expect(plan.summary).toContain('安全基準を満たしています');
    });

    it('危険なエリアに対して最適化提案を生成', () => {
      const polygons = [createTestPolygon([
        [139.78, 35.55],
        [139.79, 35.55],
        [139.79, 35.56],
        [139.78, 35.56],
        [139.78, 35.55]
      ])];

      const waypoints = [
        createTestWaypoint('wp1', 35.5533, 139.7811, 1), // 羽田空港近く
      ];

      const plan = generateOptimizationPlan(polygons, waypoints);

      expect(plan.hasIssues).toBe(true);
      expect(plan.actions.length).toBeGreaterThan(0);
      expect(plan.recommendedWaypoints).toBeDefined();
    });

    it('空のポリゴン配列を処理', () => {
      const plan = generateOptimizationPlan([], []);

      // 空配列の場合、hasIssuesはfalseまたはundefined
      expect(plan.hasIssues).toBeFalsy();
      expect(plan.waypointAnalysis).toBeDefined();
    });
  });

  describe('analyzeFlightPlanLocal', () => {
    it('安全なエリアで低リスク判定', () => {
      const polygons = [createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ])];

      const waypoints = [
        createTestWaypoint('wp1', 35.3, 139.0, 1),
      ];

      const result = analyzeFlightPlanLocal(polygons, waypoints);

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(20);
    });

    it('空港付近で高リスク判定', () => {
      const polygons = [createTestPolygon([
        [139.78, 35.55],
        [139.79, 35.55],
        [139.79, 35.56],
        [139.78, 35.56],
        [139.78, 35.55]
      ])];

      const waypoints = [
        createTestWaypoint('wp1', 35.5533, 139.7811, 1), // 羽田空港近く
      ];

      const result = analyzeFlightPlanLocal(polygons, waypoints);

      expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
      expect(result.riskScore).toBeGreaterThan(30);
    });

    it('150m超の高度で高リスク判定', () => {
      const polygons = [createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ])];

      const result = analyzeFlightPlanLocal(polygons, [], { altitude: 200 });

      expect(result.risks.some(r => r.type === 'high_altitude')).toBe(true);
    });

    it('推奨事項と安全チェックリストを含む', () => {
      const polygons = [createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ])];

      const result = analyzeFlightPlanLocal(polygons, []);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.safetyChecklist).toBeDefined();
      expect(result.safetyChecklist.length).toBeGreaterThan(0);
    });

    it('コンテキスト情報を含む', () => {
      const polygons = [createTestPolygon([
        [139.0, 35.3],
        [139.01, 35.3],
        [139.01, 35.31],
        [139.0, 35.31],
        [139.0, 35.3]
      ])];

      const result = analyzeFlightPlanLocal(polygons, []);

      expect(result.context).toBeDefined();
      expect(result.context.center).toBeDefined();
      expect(result.context.nearestAirport).toBeDefined();
    });
  });
});
