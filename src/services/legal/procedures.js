/**
 * 法的要件チェック結果から必要な手続きを自動リストアップ
 */

/**
 * チェック結果から必要な手続きを自動リストアップ
 *
 * @param {Object} results - 各カテゴリのチェック結果
 * @returns {Array} 必要な手続きリスト
 */
export const generateRequiredProcedures = (results) => {
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
