/**
 * 土地・施設管理者ルールチェック
 * - 公園（国立公園、都市公園等）
 * - 河川敷
 * - 道路上空
 * - 私有地
 * - 鉄道・港湾施設
 *
 * 注: 完全な判定は困難なため、注意喚起と確認推奨を中心に
 */

/**
 * 土地・施設管理者のルールをチェック
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
