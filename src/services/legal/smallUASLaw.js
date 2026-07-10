/**
 * 小型無人機等飛行禁止法チェック
 * - 国の重要施設（皇居、国会、官邸等）
 * - 原子力事業所
 * - 在日米軍施設
 * - 外国公館
 * - 政党本部
 */

import { getDistanceMeters, NO_FLY_ZONES } from '../../lib';

const NO_FLY_ZONE_BUFFER_METERS = 500;

/**
 * 小型無人機等飛行禁止法に基づくチェック
 *
 * @param {Object} context - チェック対象の情報
 * @returns {Object} 禁止法チェック結果
 */
export const checkSmallUASProhibitionLaw = (context) => {
  const { lat, lng } = context;
  const results = {
    category: 'small_uas_prohibition',
    categoryName: '小型無人機等飛行禁止法',
    categoryIcon: 'shield',
    items: [],
    requiresPermission: false,
    permissionType: 'POLICE', // 警察・関係機関への申請
  };

  // カテゴリ別にゾーンを分類
  const categories = {
    imperial: { name: '皇居・御所', zones: [] },
    government: { name: '国の重要施設', zones: [] },
    nuclear: { name: '原子力事業所', zones: [] },
    us_military: { name: '在日米軍施設', zones: [] },
    defense: { name: '防衛関係施設', zones: [] },
    embassy: { name: '外国公館', zones: [] },
    political: { name: '政党本部', zones: [] },
  };

  // 各ゾーンとの距離をチェック
  const nearbyZones = [];
  const inZones = [];

  for (const zone of NO_FLY_ZONES) {
    const distance = getDistanceMeters(lat, lng, zone.lat, zone.lng);
    const isInZone = distance < zone.radius;
    const isNearZone = distance < zone.radius + NO_FLY_ZONE_BUFFER_METERS; // 500m追加バッファ

    if (isInZone || isNearZone) {
      const zoneInfo = { ...zone, distance, isInZone };
      if (isInZone) {
        inZones.push(zoneInfo);
      } else {
        nearbyZones.push(zoneInfo);
      }
      if (zone.category && categories[zone.category]) {
        categories[zone.category].zones.push(zoneInfo);
      }
    }
  }

  // レッドゾーン（完全禁止）チェック
  const redZonesIn = inZones.filter(z => z.type === 'red');
  if (redZonesIn.length > 0) {
    results.items.push({
      id: 'red_zone',
      name: 'レッドゾーン（飛行禁止）',
      status: 'error',
      statusText: '禁止区域内',
      description: redZonesIn.map(z => `${z.name}（${Math.round(z.distance)}m）`).join('、'),
      action: '原則飛行禁止 - 管理者・警察への事前申請必須',
      link: 'https://www.npa.go.jp/bureau/security/kogatamujinki/',
      linkText: '警察庁（小型無人機）',
      zones: redZonesIn,
    });
    results.requiresPermission = true;
  }

  // イエローゾーン（事前通報）チェック
  const yellowZonesIn = inZones.filter(z => z.type === 'yellow');
  if (yellowZonesIn.length > 0) {
    results.items.push({
      id: 'yellow_zone',
      name: 'イエローゾーン（要通報）',
      status: 'warning',
      statusText: '通報区域内',
      description: yellowZonesIn.map(z => `${z.name}（${Math.round(z.distance)}m）`).join('、'),
      action: '飛行48時間前までに関係機関へ通報',
      zones: yellowZonesIn,
    });
    results.requiresPermission = true;
  }

  // 近接ゾーン（警告）
  if (nearbyZones.length > 0 && redZonesIn.length === 0 && yellowZonesIn.length === 0) {
    results.items.push({
      id: 'near_zone',
      name: '禁止区域近接',
      status: 'warning',
      statusText: '要注意',
      description: `${nearbyZones[0].name}まで${Math.round(nearbyZones[0].distance)}m`,
      action: '飛行経路が禁止区域に入らないよう注意',
      zones: nearbyZones,
    });
  }

  // 問題なしの場合
  if (results.items.length === 0) {
    results.items.push({
      id: 'prohibition_clear',
      name: '禁止区域',
      status: 'ok',
      statusText: '対象施設なし',
      description: '小型無人機等飛行禁止法の対象施設は周辺にありません',
      action: null,
    });
  }

  return results;
};
