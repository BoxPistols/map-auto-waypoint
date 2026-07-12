/**
 * 航空法関連の飛行制限チェック
 * - DID（人口集中地区）
 * - 空港等周辺
 * - 150m以上の高度
 * - ヘリポート近接
 */

import { getDistanceMeters, AIRPORT_ZONES, HELIPORTS } from '../../lib';
import { checkDIDArea } from '../flightAnalyzer';

/**
 * 航空法に基づく飛行制限をチェック
 *
 * @param {Object} context - チェック対象の情報
 * @returns {Object} 航空法チェック結果
 */
export const checkAviationLaw = async (context) => {
  const { lat, lng, altitude = 50 } = context;
  const results = {
    category: 'aviation_law',
    categoryName: '航空法',
    categoryIcon: 'plane',
    items: [],
    requiresPermission: false,
    permissionType: 'DIPS', // DIPS 2.0での申請
  };

  // 1. DIDチェック
  const didResult = await checkDIDArea(lat, lng);
  if (didResult.isDID) {
    results.items.push({
      id: 'did',
      name: 'DID（人口集中地区）',
      status: 'warning',
      statusText: 'DID区域内',
      description: didResult.description,
      area: didResult.area,
      action: '特定飛行に該当 - DIPS通報または許可申請',
      link: 'https://www.ossportal.dips.mlit.go.jp/portal/top/',
      linkText: 'DIPS 2.0',
    });
    results.requiresPermission = true;
  } else {
    results.items.push({
      id: 'did',
      name: 'DID（人口集中地区）',
      status: 'ok',
      statusText: 'DID区域外',
      description: didResult.description,
      action: null,
    });
  }

  // 2. 空港周辺チェック
  let nearestAirport = null;
  let minAirportDistance = Infinity;

  for (const airport of AIRPORT_ZONES) {
    const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng);
    if (distance < minAirportDistance) {
      minAirportDistance = distance;
      nearestAirport = { ...airport, distance };
    }
  }

  if (nearestAirport) {
    const isInZone = minAirportDistance < nearestAirport.radius;
    const isNearZone = minAirportDistance < nearestAirport.radius * 1.5;

    if (isInZone) {
      results.items.push({
        id: 'airport',
        name: '空港等周辺',
        status: 'error',
        statusText: '制限区域内',
        description: `${nearestAirport.name}から${(minAirportDistance / 1000).toFixed(1)}km（制限半径${(nearestAirport.radius / 1000).toFixed(1)}km）`,
        action: '空港事務所への事前連絡 + 許可申請必須',
        link: null,
        airport: nearestAirport,
      });
      results.requiresPermission = true;
    } else if (isNearZone) {
      results.items.push({
        id: 'airport',
        name: '空港等周辺',
        status: 'warning',
        statusText: '要注意',
        description: `${nearestAirport.name}から${(minAirportDistance / 1000).toFixed(1)}km（制限半径${(nearestAirport.radius / 1000).toFixed(1)}km）`,
        action: '制限区域に近接 - 飛行経路に注意',
        airport: nearestAirport,
      });
    } else {
      results.items.push({
        id: 'airport',
        name: '空港等周辺',
        status: 'ok',
        statusText: '制限外',
        description: `最寄り: ${nearestAirport.name}（${(minAirportDistance / 1000).toFixed(1)}km）`,
        action: null,
        airport: nearestAirport,
      });
    }
  }

  // 3. 高度チェック
  if (altitude > 150) {
    results.items.push({
      id: 'altitude',
      name: '飛行高度',
      status: 'error',
      statusText: '150m超過',
      description: `設定高度: ${altitude}m（上限150m）`,
      action: '航空局への許可申請必須',
    });
    results.requiresPermission = true;
  } else if (altitude > 100) {
    results.items.push({
      id: 'altitude',
      name: '飛行高度',
      status: 'warning',
      statusText: `${altitude}m`,
      description: '150m未満だが高高度飛行',
      action: '周辺の建物・障害物に注意',
    });
  } else {
    results.items.push({
      id: 'altitude',
      name: '飛行高度',
      status: 'ok',
      statusText: `${altitude}m`,
      description: '150m未満（標準飛行高度）',
      action: null,
    });
  }

  // 4. ヘリポート確認
  let nearestHeliport = null;
  let minHeliportDistance = Infinity;

  for (const heliport of HELIPORTS) {
    const distance = getDistanceMeters(lat, lng, heliport.lat, heliport.lng);
    if (distance < minHeliportDistance) {
      minHeliportDistance = distance;
      nearestHeliport = { ...heliport, distance };
    }
  }

  if (nearestHeliport && minHeliportDistance < nearestHeliport.radius) {
    results.items.push({
      id: 'heliport',
      name: 'ヘリポート',
      status: 'warning',
      statusText: '近接',
      description: `${nearestHeliport.name}から${Math.round(minHeliportDistance)}m`,
      action: 'ドクターヘリ等の離発着に注意',
    });
  }

  return results;
};
