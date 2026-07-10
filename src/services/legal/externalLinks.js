/**
 * 法的要件チェック結果に基づく外部リンク生成
 */

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
