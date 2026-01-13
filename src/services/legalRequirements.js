/**
 * ドローン飛行に関する法的要件チェックサービス
 *
 * 3つのカテゴリで飛行要件を判定:
 * 1. 航空法関連（DID、空港周辺、150m以上）
 * 2. 小型無人機等飛行禁止法（重要施設、原発、米軍基地等）
 * 3. 土地・施設管理者ルール（公園、私有地等）
 *
 * 参考: https://naka4.com/drone/flightflow/
 */

import { getDistanceMeters, AIRPORT_ZONES, NO_FLY_ZONES, HELIPORTS } from '../lib';
import { checkDIDArea } from './flightAnalyzer';

const NO_FLY_ZONE_BUFFER_METERS = 500;

// ===== 1. 航空法関連チェック =====

/**
 * 航空法に基づく飛行制限をチェック
 * - DID（人口集中地区）
 * - 空港等周辺
 * - 150m以上の高度
 * - 夜間飛行
 * - 目視外飛行
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

// ===== 2. 小型無人機等飛行禁止法チェック =====

/**
 * 小型無人機等飛行禁止法に基づくチェック
 * - 国の重要施設（皇居、国会、官邸等）
 * - 原子力事業所
 * - 在日米軍施設
 * - 外国公館
 * - 政党本部
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

// ===== 3. 土地・施設管理者ルールチェック =====

/**
 * 土地・施設管理者のルールをチェック
 * - 公園（国立公園、都市公園等）
 * - 河川敷
 * - 道路上空
 * - 私有地
 * - イベント会場
 *
 * 注: 完全な判定は困難なため、注意喚起と確認推奨を中心に
 *
 * @param {Object} context - チェック対象の情報
 * @returns {Object} 管理者ルールチェック結果
 */
export const checkLandManagerRules = (context) => {
  const { searchResult = null } = context;
  const results = {
    category: 'land_manager',
    categoryName: '土地・施設管理者',
    categoryIcon: 'map-pin',
    items: [],
    requiresPermission: false,
    permissionType: 'MANAGER', // 各管理者への確認
  };

  // 検索結果から場所タイプを推定
  const placeType = searchResult?.type || searchResult?.class || '';
  const placeName = searchResult?.displayName || '';

  // 公園チェック (より堅牢な判定)
  const isPark =
    placeType.includes('park') ||
    placeType.includes('recreation_ground') ||
    /公園$|緑地$|庭園$|植物園$/.test(placeName) ||
    placeName.includes('国定公園') ||
    placeName.includes('国立公園');

  if (isPark) {
    results.items.push({
      id: 'park',
      name: '公園・緑地',
      status: 'warning',
      statusText: '確認必要',
      description: '公園内でのドローン飛行は多くの場合禁止または許可制',
      action: '公園管理者への事前確認・許可申請',
      notes: [
        '国立公園: 環境省への申請',
        '都市公園: 自治体条例を確認',
        '一部の公園はドローン飛行全面禁止',
      ],
    });
    results.requiresPermission = true;
  }

  // 河川敷チェック
  if (
    placeType.includes('river') ||
    placeName.includes('河川') ||
    placeName.includes('川')
  ) {
    results.items.push({
      id: 'river',
      name: '河川敷',
      status: 'warning',
      statusText: '確認必要',
      description: '河川敷は国または自治体の管理下',
      action: '河川事務所への確認推奨',
      notes: [
        '国管理河川: 国土交通省河川事務所',
        '県管理河川: 各都道府県',
      ],
    });
    results.requiresPermission = true;
  }

  // 道路上空チェック
  if (
    placeType.includes('road') ||
    placeType.includes('highway')
  ) {
    results.items.push({
      id: 'road',
      name: '道路上空',
      status: 'warning',
      statusText: '確認必要',
      description: '道路上空での飛行は道路管理者の許可が必要な場合あり',
      action: '道路管理者への確認（国道/県道/市道）',
    });
    results.requiresPermission = true;
  }

  // 私有地の注意喚起（常に表示）
  results.items.push({
    id: 'private_land',
    name: '私有地',
    status: 'info',
    statusText: '確認推奨',
    description: '離発着地点・飛行経路下の土地所有者への確認を推奨',
    action: '土地所有者・管理者への事前連絡',
    notes: [
      '離発着: 土地所有者の許可が必要',
      '上空通過: 法的義務はないが事前連絡推奨',
    ],
  });

  // 鉄道近接チェック
  if (
    placeName.includes('駅') ||
    placeName.includes('鉄道') ||
    placeType.includes('railway')
  ) {
    results.items.push({
      id: 'railway',
      name: '鉄道施設',
      status: 'warning',
      statusText: '確認必要',
      description: '鉄道施設・線路上空の飛行は原則禁止',
      action: '鉄道事業者への事前確認必須',
    });
    results.requiresPermission = true;
  }

  // 港湾チェック
  if (
    placeName.includes('港') ||
    placeType.includes('harbour') ||
    placeType.includes('port')
  ) {
    results.items.push({
      id: 'port',
      name: '港湾施設',
      status: 'warning',
      statusText: '確認必要',
      description: '港湾区域内の飛行は港湾管理者の許可が必要',
      action: '港湾管理者への確認',
    });
    results.requiresPermission = true;
  }

  return results;
};

// ===== 統合チェック関数 =====

/**
 * 3カテゴリすべての法的要件をチェック
 *
 * @param {Object} context - チェック対象の情報
 * @returns {Promise<Object>} 統合チェック結果
 */
export const checkAllLegalRequirements = async (context) => {
  const [aviationLaw, prohibitionLaw, landManager] = await Promise.all([
    checkAviationLaw(context),
    Promise.resolve(checkSmallUASProhibitionLaw(context)),
    Promise.resolve(checkLandManagerRules(context)),
  ]);

  // 全体のステータスを判定
  const allItems = [
    ...aviationLaw.items,
    ...prohibitionLaw.items,
    ...landManager.items,
  ];

  const hasError = allItems.some(item => item.status === 'error');
  const hasWarning = allItems.some(item => item.status === 'warning');

  let overallStatus = 'ok';
  let overallStatusText = '問題なし';

  if (hasError) {
    overallStatus = 'error';
    overallStatusText = '要対応';
  } else if (hasWarning) {
    overallStatus = 'warning';
    overallStatusText = '要確認';
  }

  // 必要な手続きをリストアップ
  const procedures = generateRequiredProcedures({
    aviationLaw,
    prohibitionLaw,
    landManager,
  });

  return {
    overallStatus,
    overallStatusText,
    categories: [aviationLaw, prohibitionLaw, landManager],
    procedures,
    checkedAt: new Date().toISOString(),
    context,
  };
};

// ===== 必要手続き生成 =====

/**
 * チェック結果から必要な手続きを自動リストアップ
 *
 * @param {Object} results - 各カテゴリのチェック結果
 * @returns {Array} 必要な手続きリスト
 */
const generateRequiredProcedures = (results) => {
  const procedures = [];
  const { aviationLaw, prohibitionLaw, landManager } = results;

  // 1. DIPS申請（航空法関連）
  const didItem = aviationLaw.items.find(i => i.id === 'did');
  const airportItem = aviationLaw.items.find(i => i.id === 'airport');
  const altitudeItem = aviationLaw.items.find(i => i.id === 'altitude');

  if (didItem?.status === 'warning' || airportItem?.status === 'error' || altitudeItem?.status === 'error') {
    procedures.push({
      id: 'dips',
      name: 'DIPS 2.0 飛行許可申請',
      category: 'aviation_law',
      priority: 'high',
      estimatedDays: airportItem?.status === 'error' ? 14 : 10,
      description: '国土交通省への飛行許可・承認申請',
      steps: [
        'DIPS 2.0にログイン/新規登録',
        '機体情報・操縦者情報を登録',
        '飛行計画を作成・申請',
        '審査結果を待つ（10-14日）',
      ],
      documents: [
        '機体認証書または機体情報',
        '操縦者技能証明または経験実績',
        '保険証書',
        '飛行マニュアル',
      ],
      link: 'https://www.ossportal.dips.mlit.go.jp/portal/top/',
      linkText: 'DIPS 2.0',
      notes: didItem?.status === 'warning'
        ? '包括申請済みの場合は通報のみで可'
        : null,
    });
  }

  // 2. 空港事務所連絡
  if (airportItem?.status === 'error' || airportItem?.status === 'warning') {
    const airport = airportItem.airport;
    procedures.push({
      id: 'airport_coordination',
      name: '空港事務所への事前連絡',
      category: 'aviation_law',
      priority: airportItem.status === 'error' ? 'high' : 'medium',
      estimatedDays: 14,
      description: `${airport?.name || '最寄り空港'}の管制との調整`,
      steps: [
        '空港事務所に電話連絡',
        '飛行計画・エリアを説明',
        '調整結果をDIPS申請に反映',
      ],
      documents: [
        '飛行計画書',
        '飛行エリア図',
      ],
      link: null,
      notes: '空港制限区域内の飛行は空港事務所との事前調整が必須',
    });
  }

  // 3. 禁止区域申請（小型無人機等禁止法）
  const redZoneItem = prohibitionLaw.items.find(i => i.id === 'red_zone');
  const yellowZoneItem = prohibitionLaw.items.find(i => i.id === 'yellow_zone');

  if (redZoneItem?.status === 'error') {
    procedures.push({
      id: 'prohibition_permit',
      name: '飛行禁止区域の許可申請',
      category: 'small_uas_prohibition',
      priority: 'critical',
      estimatedDays: 30,
      description: '施設管理者・警察への事前申請',
      steps: [
        '対象施設の管理者を特定',
        '管理者へ申請書を提出',
        '所轄警察署への通報（48時間前）',
        '許可を得てから飛行',
      ],
      documents: [
        '飛行禁止区域飛行許可申請書',
        '飛行計画書',
        '機体情報',
        '操縦者情報',
      ],
      link: 'https://www.npa.go.jp/bureau/security/kogatamujinki/',
      linkText: '警察庁',
      notes: '原発・米軍基地等は許可が下りない場合が多い',
      zones: redZoneItem.zones,
    });
  }

  if (yellowZoneItem?.status === 'warning') {
    procedures.push({
      id: 'yellow_zone_notice',
      name: 'イエローゾーン事前通報',
      category: 'small_uas_prohibition',
      priority: 'medium',
      estimatedDays: 3,
      description: '関係機関への48時間前通報',
      steps: [
        '対象施設の管理者を特定',
        '飛行48時間前までに通報',
        '通報受理を確認',
      ],
      documents: [
        '通報書',
        '飛行計画書',
      ],
      link: null,
      notes: '許可ではなく通報のため、特段の回答がなければ飛行可能',
      zones: yellowZoneItem.zones,
    });
  }

  // 4. 土地管理者への確認
  const landItems = landManager.items.filter(i =>
    i.status === 'warning' && i.id !== 'private_land'
  );

  if (landItems.length > 0) {
    procedures.push({
      id: 'land_manager',
      name: '土地・施設管理者への確認',
      category: 'land_manager',
      priority: 'medium',
      estimatedDays: 7,
      description: '管理者への飛行許可確認',
      steps: [
        '該当施設の管理者を特定',
        '電話またはメールで問い合わせ',
        '許可条件を確認（時間帯、高度等）',
        '必要に応じて許可書を取得',
      ],
      documents: [
        '飛行計画書（任意様式）',
      ],
      link: null,
      notes: '自治体条例で飛行が禁止されている場合あり',
      items: landItems,
    });
  }

  // 優先度でソート
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  procedures.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return procedures;
};

// ===== 外部リンク生成 =====

/**
 * チェック結果に基づく外部リンクを生成
 *
 * @param {Object} results - チェック結果
 * @returns {Array} 外部リンク一覧
 */
export const generateExternalLinks = (results) => {
  const lat = results?.context?.lat || 35.681236;
  const lng = results?.context?.lng || 139.767125;
  const links = [
    {
      id: 'dips',
      name: 'DIPS 2.0',
      description: '飛行許可・承認申請',
      url: 'https://www.ossportal.dips.mlit.go.jp/portal/top/',
      category: 'official',
    },
    {
      id: 'fiss',
      name: 'FISS（飛行計画通報）',
      description: 'DIPS 2.0に統合済み',
      url: 'https://www.ossportal.dips.mlit.go.jp/portal/top/',
      category: 'official',
    },
    {
      id: 'gsi',
      name: '地理院地図',
      description: 'DID・航空法規制確認',
      url: `https://maps.gsi.go.jp/#15/${lat}/${lng}/`,
      category: 'map',
    },
  ];

  // 空港情報がある場合
  const airportItem = results?.categories?.[0]?.items?.find(i => i.id === 'airport');
  if (airportItem?.airport) {
    links.push({
      id: 'airport_info',
      name: '空港等周辺飛行ルール',
      description: `${airportItem.airport.name}周辺`,
      url: 'https://www.mlit.go.jp/koku/koku_tk10_000003.html',
      category: 'official',
    });
  }

  // 禁止区域がある場合
  if (results?.categories?.[1]?.requiresPermission) {
    links.push({
      id: 'police',
      name: '警察庁',
      description: '小型無人機等飛行禁止法',
      url: 'https://www.npa.go.jp/bureau/security/kogatamujinki/',
      category: 'official',
    });
  }

  return links;
};

export default {
  checkAviationLaw,
  checkSmallUASProhibitionLaw,
  checkLandManagerRules,
  checkAllLegalRequirements,
  generateExternalLinks,
};
