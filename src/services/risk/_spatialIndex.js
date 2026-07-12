/**
 * 空間インデックス管理（内部ヘルパー）
 * 禁止区域の RBush 空間インデックスを遅延初期化して再利用する
 */

import {
  createSpatialIndex,
  generateAirportGeoJSON,
  generateAllNoFlyGeoJSON,
  generateYellowZoneGeoJSON
} from '../../lib';

// グローバル空間インデックス（初期化後に再利用）
let globalSpatialIndex = null;

/**
 * 全禁止区域のGeoJSONを結合して生成
 * イエローゾーン（周辺エリア）も含める
 */
export const generateAllProhibitedAreasGeoJSON = () => {
  const airportGeoJSON = generateAirportGeoJSON();
  const noFlyGeoJSON = generateAllNoFlyGeoJSON();
  const yellowZoneGeoJSON = generateYellowZoneGeoJSON();

  return {
    type: 'FeatureCollection',
    features: [
      ...airportGeoJSON.features,
      ...noFlyGeoJSON.features,
      ...yellowZoneGeoJSON.features
    ]
  };
};

/**
 * 空間インデックスを取得（遅延初期化）
 */
export const getSpatialIndex = () => {
  if (!globalSpatialIndex) {
    const prohibitedAreas = generateAllProhibitedAreasGeoJSON();
    globalSpatialIndex = createSpatialIndex(prohibitedAreas);
  }
  return globalSpatialIndex;
};

/**
 * 空間インデックスを強制リフレッシュ
 * カスタムレイヤー追加時などに使用
 */
export const refreshSpatialIndex = () => {
  const prohibitedAreas = generateAllProhibitedAreasGeoJSON();
  globalSpatialIndex = createSpatialIndex(prohibitedAreas);
  return globalSpatialIndex;
};

/**
 * 申請区分と費用データ
 */
export const APPLICATION_CATEGORIES = {
  DID: {
    name: 'DID上空飛行',
    baseDays: 10,
    documents: ['飛行計画書', '機体情報'],
    coordination: [{ stakeholder: '地権者', leadTime: 7 }]
  },
  AIRPORT: {
    name: '空港等周辺飛行',
    baseDays: 14,
    documents: ['飛行計画書', '空域図'],
    coordination: [{ stakeholder: '空港事務所', leadTime: 14, required: true }]
  },
  HIGH_ALTITUDE: {
    name: '150m以上の高高度飛行',
    baseDays: 14,
    documents: ['高度計画図'],
    coordination: [{ stakeholder: '航空局', leadTime: 14 }]
  },
  BVLOS: {
    name: '目視外飛行',
    baseDays: 10,
    documents: ['通信計画'],
    coordination: []
  }
};
