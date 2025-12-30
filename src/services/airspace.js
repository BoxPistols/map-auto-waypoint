/**
 * ドローン飛行制限区域データサービス
 *
 * 参考: 国土交通省 DIPS、国土地理院、航空法
 */

// 日本全国の空港・飛行場の制限区域
// 国際空港: 9km, 地方空港: 6km, 小規模空港: 3km, 飛行場: 2km
export const AIRPORT_ZONES = [
  // ========== 北海道 ==========
  { name: '新千歳空港', lat: 42.7752, lng: 141.6924, radius: 9000, type: 'airport' },
  { name: '丘珠空港', lat: 43.1176, lng: 141.3816, radius: 3000, type: 'airfield' },
  { name: '旭川空港', lat: 43.6708, lng: 142.4475, radius: 6000, type: 'airport' },
  { name: '函館空港', lat: 41.7700, lng: 140.8219, radius: 6000, type: 'airport' },
  { name: '帯広空港', lat: 42.7333, lng: 143.2172, radius: 6000, type: 'airport' },
  { name: '釧路空港', lat: 43.0411, lng: 144.1928, radius: 6000, type: 'airport' },
  { name: '女満別空港', lat: 43.8806, lng: 144.1644, radius: 6000, type: 'airport' },
  { name: '中標津空港', lat: 43.5775, lng: 144.9600, radius: 3000, type: 'airport' },
  { name: '紋別空港', lat: 44.3039, lng: 143.4044, radius: 3000, type: 'airport' },
  { name: '稚内空港', lat: 45.4042, lng: 141.8008, radius: 6000, type: 'airport' },
  { name: '利尻空港', lat: 45.2411, lng: 141.1864, radius: 3000, type: 'airport' },
  { name: '奥尻空港', lat: 42.0717, lng: 139.4328, radius: 2000, type: 'airfield' },
  { name: '札幌飛行場（丘珠）', lat: 43.1176, lng: 141.3816, radius: 3000, type: 'airfield' },
  { name: 'たきかわスカイパーク', lat: 43.5467, lng: 141.9097, radius: 2000, type: 'airfield' },
  { name: '美唄農道離着陸場', lat: 43.3333, lng: 141.8500, radius: 1500, type: 'airfield' },
  { name: '新篠津滑空場', lat: 43.2258, lng: 141.6478, radius: 1500, type: 'airfield' },

  // ========== 東北 ==========
  { name: '青森空港', lat: 40.7347, lng: 140.6908, radius: 6000, type: 'airport' },
  { name: '三沢空港', lat: 40.7033, lng: 141.3686, radius: 6000, type: 'airport' },
  { name: '花巻空港', lat: 39.4286, lng: 141.1353, radius: 6000, type: 'airport' },
  { name: '仙台空港', lat: 38.1397, lng: 140.9170, radius: 6000, type: 'airport' },
  { name: '秋田空港', lat: 39.6156, lng: 140.2186, radius: 6000, type: 'airport' },
  { name: '大館能代空港', lat: 40.1919, lng: 140.3714, radius: 3000, type: 'airport' },
  { name: '山形空港', lat: 38.4119, lng: 140.3714, radius: 6000, type: 'airport' },
  { name: '庄内空港', lat: 38.8122, lng: 139.7878, radius: 3000, type: 'airport' },
  { name: '福島空港', lat: 37.2275, lng: 140.4311, radius: 6000, type: 'airport' },

  // ========== 関東 ==========
  { name: '成田国際空港', lat: 35.7647, lng: 140.3864, radius: 9000, type: 'airport' },
  { name: '東京国際空港（羽田）', lat: 35.5494, lng: 139.7798, radius: 9000, type: 'airport' },
  { name: '調布飛行場', lat: 35.6717, lng: 139.5281, radius: 3000, type: 'airfield' },
  { name: '茨城空港（百里）', lat: 36.1811, lng: 140.4156, radius: 6000, type: 'airport' },
  { name: 'ホンダエアポート', lat: 35.9992, lng: 139.5347, radius: 2000, type: 'airfield' },
  { name: '大利根飛行場', lat: 36.0208, lng: 139.8736, radius: 1500, type: 'airfield' },
  { name: '阿見飛行場', lat: 36.0125, lng: 140.2267, radius: 1500, type: 'airfield' },
  { name: '龍ヶ崎飛行場', lat: 35.9403, lng: 140.1839, radius: 1500, type: 'airfield' },
  { name: '大島空港', lat: 34.7822, lng: 139.3603, radius: 3000, type: 'airport' },
  { name: '新島空港', lat: 34.3694, lng: 139.2689, radius: 2000, type: 'airfield' },
  { name: '神津島空港', lat: 34.2114, lng: 139.1353, radius: 2000, type: 'airfield' },
  { name: '三宅島空港', lat: 34.0736, lng: 139.5603, radius: 3000, type: 'airport' },
  { name: '八丈島空港', lat: 33.1153, lng: 139.7858, radius: 3000, type: 'airport' },

  // ========== 中部・北陸 ==========
  { name: '中部国際空港', lat: 34.8584, lng: 136.8124, radius: 9000, type: 'airport' },
  { name: '名古屋飛行場（小牧）', lat: 35.2551, lng: 136.9244, radius: 6000, type: 'airport' },
  { name: '新潟空港', lat: 37.9559, lng: 139.1068, radius: 6000, type: 'airport' },
  { name: '富山空港', lat: 36.6483, lng: 137.1875, radius: 6000, type: 'airport' },
  { name: '小松空港', lat: 36.3946, lng: 136.4065, radius: 6000, type: 'airport' },
  { name: '能登空港', lat: 37.2931, lng: 136.9619, radius: 3000, type: 'airport' },
  { name: '静岡空港', lat: 34.7961, lng: 138.1894, radius: 6000, type: 'airport' },
  { name: '松本空港', lat: 36.1669, lng: 137.9228, radius: 3000, type: 'airport' },
  { name: '福井空港', lat: 36.1428, lng: 136.2236, radius: 2000, type: 'airfield' },
  { name: '佐渡空港', lat: 38.0603, lng: 138.4142, radius: 2000, type: 'airfield' },

  // ========== 近畿 ==========
  { name: '関西国際空港', lat: 34.4347, lng: 135.2441, radius: 9000, type: 'airport' },
  { name: '大阪国際空港（伊丹）', lat: 34.7855, lng: 135.4380, radius: 9000, type: 'airport' },
  { name: '神戸空港', lat: 34.6328, lng: 135.2239, radius: 6000, type: 'airport' },
  { name: '南紀白浜空港', lat: 33.6622, lng: 135.3644, radius: 3000, type: 'airport' },
  { name: '但馬空港', lat: 35.5128, lng: 134.7869, radius: 2000, type: 'airfield' },
  { name: '八尾空港', lat: 34.5967, lng: 135.6019, radius: 3000, type: 'airfield' },

  // ========== 中国 ==========
  { name: '広島空港', lat: 34.4361, lng: 132.9194, radius: 6000, type: 'airport' },
  { name: '岡山空港', lat: 34.7569, lng: 133.8553, radius: 6000, type: 'airport' },
  { name: '山口宇部空港', lat: 33.9300, lng: 131.2789, radius: 6000, type: 'airport' },
  { name: '岩国空港', lat: 34.1456, lng: 132.2361, radius: 6000, type: 'airport' },
  { name: '出雲空港', lat: 35.4136, lng: 132.8897, radius: 6000, type: 'airport' },
  { name: '石見空港', lat: 34.6764, lng: 131.7906, radius: 3000, type: 'airport' },
  { name: '米子空港', lat: 35.4922, lng: 133.2364, radius: 6000, type: 'airport' },
  { name: '鳥取空港', lat: 35.5303, lng: 134.1667, radius: 6000, type: 'airport' },
  { name: '広島西飛行場跡地', lat: 34.3672, lng: 132.4147, radius: 2000, type: 'airfield' },

  // ========== 四国 ==========
  { name: '高松空港', lat: 34.2142, lng: 134.0156, radius: 6000, type: 'airport' },
  { name: '松山空港', lat: 33.8272, lng: 132.6997, radius: 6000, type: 'airport' },
  { name: '高知空港', lat: 33.5461, lng: 133.6694, radius: 6000, type: 'airport' },
  { name: '徳島空港', lat: 34.1328, lng: 134.6067, radius: 6000, type: 'airport' },

  // ========== 九州（本土） ==========
  { name: '福岡空港', lat: 33.5859, lng: 130.4510, radius: 9000, type: 'airport' },
  { name: '北九州空港', lat: 33.8459, lng: 131.0349, radius: 6000, type: 'airport' },
  { name: '佐賀空港', lat: 33.1497, lng: 130.3022, radius: 3000, type: 'airport' },
  { name: '長崎空港', lat: 32.9169, lng: 129.9136, radius: 6000, type: 'airport' },
  { name: '熊本空港', lat: 32.8373, lng: 130.8551, radius: 6000, type: 'airport' },
  { name: '大分空港', lat: 33.4794, lng: 131.7372, radius: 6000, type: 'airport' },
  { name: '宮崎空港', lat: 31.8772, lng: 131.4486, radius: 6000, type: 'airport' },
  { name: '鹿児島空港', lat: 31.8034, lng: 130.7195, radius: 6000, type: 'airport' },

  // ========== 九州（離島） ==========
  { name: '対馬空港', lat: 34.2850, lng: 129.3306, radius: 3000, type: 'airport' },
  { name: '壱岐空港', lat: 33.7489, lng: 129.7853, radius: 2000, type: 'airfield' },
  { name: '福江空港', lat: 32.6664, lng: 128.8328, radius: 3000, type: 'airport' },
  { name: '上五島空港', lat: 33.0142, lng: 129.0569, radius: 2000, type: 'airfield' },
  { name: '小値賀空港', lat: 33.1900, lng: 129.0564, radius: 1500, type: 'airfield' },
  { name: '天草飛行場', lat: 32.4828, lng: 130.1589, radius: 2000, type: 'airfield' },
  { name: '種子島空港', lat: 30.6056, lng: 130.9917, radius: 3000, type: 'airport' },
  { name: '屋久島空港', lat: 30.3856, lng: 130.6589, radius: 3000, type: 'airport' },
  { name: '奄美空港', lat: 28.4306, lng: 129.7125, radius: 6000, type: 'airport' },
  { name: '喜界空港', lat: 28.3214, lng: 129.9281, radius: 2000, type: 'airfield' },
  { name: '徳之島空港', lat: 27.8364, lng: 128.8817, radius: 3000, type: 'airport' },
  { name: '沖永良部空港', lat: 27.4256, lng: 128.7011, radius: 2000, type: 'airfield' },
  { name: '与論空港', lat: 27.0439, lng: 128.4014, radius: 2000, type: 'airfield' },

  // ========== 沖縄 ==========
  { name: '那覇空港', lat: 26.1958, lng: 127.6459, radius: 9000, type: 'airport' },
  { name: '新石垣空港', lat: 24.3964, lng: 124.2450, radius: 6000, type: 'airport' },
  { name: '宮古空港', lat: 24.7828, lng: 125.2950, radius: 6000, type: 'airport' },
  { name: '下地島空港', lat: 24.8267, lng: 125.1447, radius: 6000, type: 'airport' },
  { name: '久米島空港', lat: 26.3636, lng: 126.7139, radius: 3000, type: 'airport' },
  { name: '多良間空港', lat: 24.6539, lng: 124.6750, radius: 2000, type: 'airfield' },
  { name: '与那国空港', lat: 24.4669, lng: 122.9789, radius: 3000, type: 'airport' },
  { name: '南大東空港', lat: 25.8464, lng: 131.2631, radius: 2000, type: 'airfield' },
  { name: '北大東空港', lat: 25.9447, lng: 131.3269, radius: 2000, type: 'airfield' },
  { name: '粟国空港', lat: 26.5917, lng: 127.2406, radius: 1500, type: 'airfield' },
  { name: '慶良間空港', lat: 26.1681, lng: 127.2931, radius: 1500, type: 'airfield' },
  { name: '伊江島空港', lat: 26.7219, lng: 127.7856, radius: 2000, type: 'airfield' },
  { name: '波照間空港', lat: 24.0586, lng: 123.8050, radius: 1500, type: 'airfield' },

  // ========== 自衛隊・米軍基地（飛行制限区域） ==========
  { name: '嘉手納飛行場', lat: 26.3516, lng: 127.7675, radius: 6000, type: 'military' },
  { name: '普天間飛行場', lat: 26.2742, lng: 127.7558, radius: 4000, type: 'military' },
  { name: '横田飛行場', lat: 35.7486, lng: 139.3486, radius: 6000, type: 'military' },
  { name: '厚木飛行場', lat: 35.4547, lng: 139.4500, radius: 6000, type: 'military' },
  { name: '岩国飛行場', lat: 34.1456, lng: 132.2361, radius: 6000, type: 'military' },
  { name: '三沢飛行場', lat: 40.7033, lng: 141.3686, radius: 6000, type: 'military' },
  { name: '小松飛行場', lat: 36.3946, lng: 136.4065, radius: 6000, type: 'military' },
  { name: '百里飛行場', lat: 36.1811, lng: 140.4156, radius: 6000, type: 'military' },
  { name: '築城飛行場', lat: 33.6850, lng: 131.0400, radius: 4000, type: 'military' },
  { name: '新田原飛行場', lat: 32.0833, lng: 131.4500, radius: 4000, type: 'military' },
  { name: '那覇飛行場（自衛隊）', lat: 26.1958, lng: 127.6459, radius: 6000, type: 'military' },
  { name: '入間飛行場', lat: 35.8419, lng: 139.4108, radius: 4000, type: 'military' },
  { name: '浜松飛行場', lat: 34.7503, lng: 137.7033, radius: 4000, type: 'military' },
  { name: '千歳飛行場（自衛隊）', lat: 42.7944, lng: 141.6667, radius: 6000, type: 'military' },
]

// 飛行禁止区域（重要施設周辺）- 小型無人機等飛行禁止法
// レッドゾーン: 施設上空 完全禁止
// イエローゾーン: 周辺300m 事前通報・許可が必要
export const NO_FLY_ZONES = [
  // ===== 国の重要施設（東京） =====
  { name: '皇居', lat: 35.6852, lng: 139.7528, radius: 300, type: 'red', category: 'imperial' },
  { name: '国会議事堂', lat: 35.6760, lng: 139.7450, radius: 300, type: 'red', category: 'government' },
  { name: '首相官邸', lat: 35.6736, lng: 139.7500, radius: 300, type: 'red', category: 'government' },
  { name: '最高裁判所', lat: 35.6797, lng: 139.7414, radius: 300, type: 'red', category: 'government' },
  { name: '迎賓館', lat: 35.6803, lng: 139.7267, radius: 300, type: 'red', category: 'government' },
  { name: '警視庁本部', lat: 35.6762, lng: 139.7534, radius: 300, type: 'red', category: 'government' },
  { name: '外務省', lat: 35.6739, lng: 139.7503, radius: 300, type: 'red', category: 'government' },
  { name: '防衛省', lat: 35.6936, lng: 139.7294, radius: 300, type: 'red', category: 'defense' },

  // ===== 在日米軍施設 =====
  { name: '横田基地', lat: 35.7483, lng: 139.3486, radius: 300, type: 'red', category: 'us_military' },
  { name: '厚木基地', lat: 35.4547, lng: 139.4500, radius: 300, type: 'red', category: 'us_military' },
  { name: '横須賀基地', lat: 35.2833, lng: 139.6667, radius: 300, type: 'red', category: 'us_military' },
  { name: '座間キャンプ', lat: 35.4833, lng: 139.4000, radius: 300, type: 'red', category: 'us_military' },
  { name: '嘉手納基地', lat: 26.3517, lng: 127.7683, radius: 300, type: 'red', category: 'us_military' },
  { name: '普天間基地', lat: 26.2744, lng: 127.7558, radius: 300, type: 'red', category: 'us_military' },
  { name: '三沢基地', lat: 40.7033, lng: 141.3686, radius: 300, type: 'red', category: 'us_military' },
  { name: '岩国基地', lat: 34.1456, lng: 132.2361, radius: 300, type: 'red', category: 'us_military' },
  { name: '佐世保基地', lat: 33.1500, lng: 129.7167, radius: 300, type: 'red', category: 'us_military' },

  // ===== 原子力発電所 =====
  { name: '泊原発', lat: 43.0339, lng: 140.5136, radius: 300, type: 'red', category: 'nuclear' },
  { name: '東通原発', lat: 41.1861, lng: 141.3861, radius: 300, type: 'red', category: 'nuclear' },
  { name: '女川原発', lat: 38.4019, lng: 141.5003, radius: 300, type: 'red', category: 'nuclear' },
  { name: '福島第一原発', lat: 37.4211, lng: 141.0328, radius: 300, type: 'red', category: 'nuclear' },
  { name: '福島第二原発', lat: 37.3167, lng: 141.0250, radius: 300, type: 'red', category: 'nuclear' },
  { name: '東海第二原発', lat: 36.4664, lng: 140.6072, radius: 300, type: 'red', category: 'nuclear' },
  { name: '柏崎刈羽原発', lat: 37.4286, lng: 138.5978, radius: 300, type: 'red', category: 'nuclear' },
  { name: '浜岡原発', lat: 34.6219, lng: 138.1428, radius: 300, type: 'red', category: 'nuclear' },
  { name: '志賀原発', lat: 37.0600, lng: 136.7289, radius: 300, type: 'red', category: 'nuclear' },
  { name: '敦賀原発', lat: 35.7514, lng: 136.0186, radius: 300, type: 'red', category: 'nuclear' },
  { name: '美浜原発', lat: 35.7017, lng: 135.9581, radius: 300, type: 'red', category: 'nuclear' },
  { name: '大飯原発', lat: 35.5422, lng: 135.6561, radius: 300, type: 'red', category: 'nuclear' },
  { name: '高浜原発', lat: 35.5203, lng: 135.5050, radius: 300, type: 'red', category: 'nuclear' },
  { name: '島根原発', lat: 35.5386, lng: 132.9992, radius: 300, type: 'red', category: 'nuclear' },
  { name: '伊方原発', lat: 33.4903, lng: 132.3094, radius: 300, type: 'red', category: 'nuclear' },
  { name: '玄海原発', lat: 33.5153, lng: 129.8369, radius: 300, type: 'red', category: 'nuclear' },
  { name: '川内原発', lat: 31.8339, lng: 130.1894, radius: 300, type: 'red', category: 'nuclear' },

  // ===== 政党本部 =====
  { name: '自民党本部', lat: 35.6781, lng: 139.7394, radius: 300, type: 'yellow', category: 'political' },

  // ===== 外国公館（主要） =====
  { name: 'アメリカ大使館', lat: 35.6669, lng: 139.7483, radius: 300, type: 'yellow', category: 'embassy' },
  { name: '中国大使館', lat: 35.6644, lng: 139.7297, radius: 300, type: 'yellow', category: 'embassy' },
  { name: '韓国大使館', lat: 35.6606, lng: 139.7386, radius: 300, type: 'yellow', category: 'embassy' },
  { name: 'ロシア大使館', lat: 35.6672, lng: 139.7361, radius: 300, type: 'yellow', category: 'embassy' },
]

// 主要ヘリポート（有人機離発着エリア）
export const HELIPORTS = [
  // ===== 東京都 =====
  { name: '東京ヘリポート', lat: 35.6403, lng: 139.8372, radius: 500, type: 'heliport' },
  { name: '虎ノ門ヒルズヘリポート', lat: 35.6667, lng: 139.7500, radius: 200, type: 'heliport' },
  { name: '六本木ヒルズヘリポート', lat: 35.6603, lng: 139.7292, radius: 200, type: 'heliport' },
  { name: '晴海ヘリポート', lat: 35.6478, lng: 139.7833, radius: 300, type: 'heliport' },

  // ===== 大阪府 =====
  { name: '八尾ヘリポート', lat: 34.5967, lng: 135.6019, radius: 500, type: 'heliport' },
  { name: '舞洲ヘリポート', lat: 34.6592, lng: 135.3931, radius: 500, type: 'heliport' },

  // ===== 神奈川県 =====
  { name: '横浜ヘリポート', lat: 35.4667, lng: 139.6333, radius: 500, type: 'heliport' },

  // ===== 愛知県 =====
  { name: '名古屋ヘリポート', lat: 35.1833, lng: 136.9000, radius: 500, type: 'heliport' },

  // ===== 福岡県 =====
  { name: '福岡ヘリポート', lat: 33.5903, lng: 130.4017, radius: 500, type: 'heliport' },

  // ===== 病院ヘリポート（ドクターヘリ） =====
  { name: '聖路加国際病院', lat: 35.6714, lng: 139.7731, radius: 200, type: 'hospital_heliport' },
  { name: '日本医科大学付属病院', lat: 35.7028, lng: 139.7683, radius: 200, type: 'hospital_heliport' },
]

// 国土地理院 DID (人口集中地区) タイルレイヤー
// 参照: https://www.gsi.go.jp/chizujoho/h27did.html
export const DID_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/did2015/{z}/{x}/{y}.geojson'

// DID区域の情報
export const DID_INFO = {
  description: '人口集中地区（DID）は国勢調査に基づく人口密度4,000人/km²以上の地域',
  source: '総務省統計局 平成27年国勢調査',
  tileUrl: DID_TILE_URL,
  attribution: '国土地理院',
  externalLinks: {
    gsi: 'https://www.gsi.go.jp/chizujoho/h27did.html',
    kokudo: 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-v2_3.html',
    dips: 'https://www.ossportal.dips-reg.mlit.go.jp/portal/top'
  }
}

// DIDタイルソース設定（MapLibre用）
export const getDIDSourceConfig = () => ({
  type: 'vector',
  tiles: ['https://cyberjapandata.gsi.go.jp/xyz/did2015/{z}/{x}/{y}.pbf'],
  minzoom: 8,
  maxzoom: 16
})

// 空港制限区域をGeoJSON Feature Collectionに変換
export const getAirportZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: AIRPORT_ZONES.map(zone => createCircleFeature(zone, 64))
  }
}

// 飛行禁止区域をGeoJSON Feature Collectionに変換
export const getNoFlyZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES.map(zone => createCircleFeature(zone, 32))
  }
}

// レッドゾーン（国の重要施設・原発・米軍基地）のみ取得
export const getRedZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES
      .filter(zone => zone.type === 'red')
      .map(zone => createCircleFeature(zone, 32))
  }
}

// イエローゾーン（外国公館・政党本部等）のみ取得
export const getYellowZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES
      .filter(zone => zone.type === 'yellow')
      .map(zone => createCircleFeature(zone, 32))
  }
}

// ヘリポートをGeoJSON Feature Collectionに変換
export const getHeliportsGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: HELIPORTS.map(hp => createCircleFeature(hp, 32))
  }
}

// 円形のGeoJSON Polygonを生成
const createCircleFeature = (zone, points = 64) => {
  const coords = []
  const { lat, lng, radius } = zone

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radius * Math.cos(angle)
    const dy = radius * Math.sin(angle)

    // メートルから度への変換（近似）
    const latOffset = dy / 111320
    const lngOffset = dx / (111320 * Math.cos(lat * Math.PI / 180))

    coords.push([lng + lngOffset, lat + latOffset])
  }

  return {
    type: 'Feature',
    properties: {
      name: zone.name,
      type: zone.type,
      radius: zone.radius
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

// Waypoint/ポリゴンが制限区域に入っているかチェック
export const checkAirspaceRestrictions = (lat, lng) => {
  const restrictions = []

  // 空港チェック
  for (const airport of AIRPORT_ZONES) {
    const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng)
    if (distance < airport.radius) {
      restrictions.push({
        type: 'airport',
        name: airport.name,
        distance: Math.round(distance),
        radius: airport.radius,
        severity: 'high'
      })
    }
  }

  // 飛行禁止区域チェック
  for (const zone of NO_FLY_ZONES) {
    const distance = getDistanceMeters(lat, lng, zone.lat, zone.lng)
    if (distance < zone.radius) {
      restrictions.push({
        type: 'prohibited',
        name: zone.name,
        distance: Math.round(distance),
        radius: zone.radius,
        severity: 'critical'
      })
    }
  }

  return restrictions
}

// 2点間の距離を計算（メートル）
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000 // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 外部サービスへのリンクを取得
export const getExternalMapLinks = (lat, lng) => {
  return {
    dips: `https://www.ossportal.dips-reg.mlit.go.jp/portal/top`,
    sorapass: `https://www.sorapass.com/map?lat=${lat}&lng=${lng}&zoom=14`,
    geospatial: `https://maps.gsi.go.jp/#15/${lat}/${lng}/`
  }
}
