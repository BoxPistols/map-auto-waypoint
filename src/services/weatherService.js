/**
 * 天候サービス
 *
 * Open-Meteo API（無料・APIキー不要）を使用したドローン飛行用天候情報取得
 * モックモードも備えており、デモやオフライン時に使用可能
 *
 * @see https://open-meteo.com/
 */

// ===== 定数 =====

/**
 * Open-Meteo APIのベースURL
 */
const OPEN_METEO_API_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * 天気コードの説明（WMO Weather interpretation codes）
 * @see https://open-meteo.com/en/docs
 */
const WEATHER_CODES = {
  0: { description: '快晴', icon: '☀️', flightImpact: 'good' },
  1: { description: 'おおむね晴れ', icon: '🌤️', flightImpact: 'good' },
  2: { description: '一部曇り', icon: '⛅', flightImpact: 'good' },
  3: { description: '曇り', icon: '☁️', flightImpact: 'fair' },
  45: { description: '霧', icon: '🌫️', flightImpact: 'poor' },
  48: { description: '着氷性の霧', icon: '🌫️', flightImpact: 'dangerous' },
  51: { description: '弱い霧雨', icon: '🌧️', flightImpact: 'poor' },
  53: { description: '霧雨', icon: '🌧️', flightImpact: 'poor' },
  55: { description: '強い霧雨', icon: '🌧️', flightImpact: 'dangerous' },
  56: { description: '着氷性の弱い霧雨', icon: '🌧️', flightImpact: 'dangerous' },
  57: { description: '着氷性の霧雨', icon: '🌧️', flightImpact: 'dangerous' },
  61: { description: '弱い雨', icon: '🌧️', flightImpact: 'poor' },
  63: { description: '雨', icon: '🌧️', flightImpact: 'dangerous' },
  65: { description: '強い雨', icon: '🌧️', flightImpact: 'dangerous' },
  66: { description: '着氷性の弱い雨', icon: '🌧️', flightImpact: 'dangerous' },
  67: { description: '着氷性の雨', icon: '🌧️', flightImpact: 'dangerous' },
  71: { description: '弱い雪', icon: '🌨️', flightImpact: 'dangerous' },
  73: { description: '雪', icon: '🌨️', flightImpact: 'dangerous' },
  75: { description: '強い雪', icon: '🌨️', flightImpact: 'dangerous' },
  77: { description: '霧雪', icon: '🌨️', flightImpact: 'dangerous' },
  80: { description: '弱いにわか雨', icon: '🌦️', flightImpact: 'poor' },
  81: { description: 'にわか雨', icon: '🌦️', flightImpact: 'dangerous' },
  82: { description: '激しいにわか雨', icon: '🌦️', flightImpact: 'dangerous' },
  85: { description: '弱いにわか雪', icon: '🌨️', flightImpact: 'dangerous' },
  86: { description: '強いにわか雪', icon: '🌨️', flightImpact: 'dangerous' },
  95: { description: '雷雨', icon: '⛈️', flightImpact: 'dangerous' },
  96: { description: '弱い雹を伴う雷雨', icon: '⛈️', flightImpact: 'dangerous' },
  99: { description: '強い雹を伴う雷雨', icon: '⛈️', flightImpact: 'dangerous' }
};

/**
 * ドローン飛行条件の閾値
 */
const FLIGHT_THRESHOLDS = {
  // 風速 (m/s) - 10m高度
  wind: {
    good: 5,      // 5m/s以下: 良好
    fair: 8,      // 8m/s以下: 注意
    poor: 10,     // 10m/s以下: 困難
    dangerous: 15 // 15m/s以上: 飛行禁止
  },
  // 突風 (m/s)
  gusts: {
    good: 8,
    fair: 12,
    poor: 15,
    dangerous: 20
  },
  // 降水量 (mm/h)
  precipitation: {
    good: 0,
    fair: 0.5,
    poor: 1,
    dangerous: 2
  },
  // 視程 (m)
  visibility: {
    good: 5000,
    fair: 3000,
    poor: 1500,
    dangerous: 500
  },
  // 気温 (°C) - 低温限界
  tempLow: {
    good: 5,
    fair: 0,
    poor: -5,
    dangerous: -10
  },
  // 気温 (°C) - 高温限界
  tempHigh: {
    good: 35,
    fair: 38,
    poor: 40,
    dangerous: 45
  }
};

// ===== モックデータ =====

/**
 * モックデータパターン - デモやオフライン時に使用
 */
const MOCK_PATTERNS = {
  // 理想的な飛行条件
  ideal: {
    name: '理想的な飛行条件',
    current: {
      temperature: 22,
      humidity: 45,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 180,
      precipitation: 0,
      visibility: 10000,
      weatherCode: 1,
      cloudCover: 20
    },
    hourly: generateMockHourly('ideal')
  },
  // 風が強い
  windy: {
    name: '強風注意',
    current: {
      temperature: 18,
      humidity: 55,
      windSpeed: 12,
      windGusts: 18,
      windDirection: 270,
      precipitation: 0,
      visibility: 8000,
      weatherCode: 2,
      cloudCover: 40
    },
    hourly: generateMockHourly('windy')
  },
  // 雨天
  rainy: {
    name: '雨天・飛行困難',
    current: {
      temperature: 15,
      humidity: 85,
      windSpeed: 6,
      windGusts: 10,
      windDirection: 90,
      precipitation: 3.5,
      visibility: 3000,
      weatherCode: 63,
      cloudCover: 95
    },
    hourly: generateMockHourly('rainy')
  },
  // 霧
  foggy: {
    name: '霧・視程不良',
    current: {
      temperature: 12,
      humidity: 98,
      windSpeed: 1,
      windGusts: 2,
      windDirection: 0,
      precipitation: 0,
      visibility: 800,
      weatherCode: 45,
      cloudCover: 100
    },
    hourly: generateMockHourly('foggy')
  },
  // 雷雨
  storm: {
    name: '雷雨・飛行禁止',
    current: {
      temperature: 25,
      humidity: 90,
      windSpeed: 15,
      windGusts: 25,
      windDirection: 225,
      precipitation: 12,
      visibility: 2000,
      weatherCode: 95,
      cloudCover: 100
    },
    hourly: generateMockHourly('storm')
  },
  // 曇り（軽微な注意）
  cloudy: {
    name: '曇り・条件良好',
    current: {
      temperature: 20,
      humidity: 65,
      windSpeed: 4,
      windGusts: 7,
      windDirection: 135,
      precipitation: 0,
      visibility: 7000,
      weatherCode: 3,
      cloudCover: 80
    },
    hourly: generateMockHourly('cloudy')
  }
};

/**
 * モック用の時間別データを生成
 */
function generateMockHourly(pattern) {
  const hours = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    let data;

    switch (pattern) {
      case 'ideal':
        data = {
          time: time.toISOString(),
          temperature: 20 + Math.sin(i / 24 * Math.PI * 2) * 5,
          windSpeed: 2 + Math.random() * 3,
          windGusts: 4 + Math.random() * 4,
          precipitation: 0,
          visibility: 10000,
          weatherCode: i < 18 ? 1 : 0
        };
        break;
      case 'windy':
        data = {
          time: time.toISOString(),
          temperature: 16 + Math.sin(i / 24 * Math.PI * 2) * 3,
          windSpeed: 10 + Math.random() * 5,
          windGusts: 15 + Math.random() * 8,
          precipitation: 0,
          visibility: 8000,
          weatherCode: 2
        };
        break;
      case 'rainy':
        data = {
          time: time.toISOString(),
          temperature: 14 + Math.random() * 2,
          windSpeed: 5 + Math.random() * 3,
          windGusts: 8 + Math.random() * 5,
          precipitation: 2 + Math.random() * 5,
          visibility: 2000 + Math.random() * 2000,
          weatherCode: i % 3 === 0 ? 65 : 63
        };
        break;
      case 'foggy':
        data = {
          time: time.toISOString(),
          temperature: 10 + Math.random() * 3,
          windSpeed: 0.5 + Math.random() * 1.5,
          windGusts: 1 + Math.random() * 2,
          precipitation: 0,
          visibility: 300 + Math.random() * 700,
          weatherCode: 45
        };
        break;
      case 'storm':
        data = {
          time: time.toISOString(),
          temperature: 22 + Math.random() * 5,
          windSpeed: 12 + Math.random() * 8,
          windGusts: 20 + Math.random() * 10,
          precipitation: 8 + Math.random() * 10,
          visibility: 1000 + Math.random() * 2000,
          weatherCode: i % 4 === 0 ? 99 : 95
        };
        break;
      case 'cloudy':
      default:
        data = {
          time: time.toISOString(),
          temperature: 18 + Math.sin(i / 24 * Math.PI * 2) * 4,
          windSpeed: 3 + Math.random() * 2,
          windGusts: 5 + Math.random() * 3,
          precipitation: 0,
          visibility: 6000 + Math.random() * 2000,
          weatherCode: 3
        };
    }

    hours.push(data);
  }

  return hours;
}

// ===== ローカルストレージ設定 =====

const STORAGE_KEY = 'weather_settings';

/**
 * 天候設定を取得
 */
export const getWeatherSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[Weather] Failed to load settings:', e);
  }
  return {
    useMockData: false,
    mockPattern: 'ideal',
    cacheMinutes: 30
  };
};

/**
 * 天候設定を保存
 */
export const setWeatherSettings = (settings) => {
  try {
    const current = getWeatherSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('[Weather] Failed to save settings:', e);
    return getWeatherSettings();
  }
};

/**
 * モックモードの有効/無効を切り替え
 */
export const setMockMode = (enabled, pattern = 'ideal') => {
  return setWeatherSettings({ useMockData: enabled, mockPattern: pattern });
};

/**
 * モックモードかどうか
 */
export const isMockMode = () => {
  return getWeatherSettings().useMockData;
};

/**
 * 利用可能なモックパターン一覧を取得
 */
export const getMockPatterns = () => {
  return Object.entries(MOCK_PATTERNS).map(([key, value]) => ({
    id: key,
    name: value.name
  }));
};

// ===== キャッシュ =====

const weatherCache = new Map();

/**
 * キャッシュキーを生成
 */
const getCacheKey = (lat, lng) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

/**
 * キャッシュからデータを取得
 */
const getFromCache = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  const cached = weatherCache.get(key);

  if (cached) {
    const settings = getWeatherSettings();
    const maxAge = settings.cacheMinutes * 60 * 1000;
    if (Date.now() - cached.timestamp < maxAge) {
      console.log('[Weather] Cache hit:', key);
      return cached.data;
    }
    weatherCache.delete(key);
  }
  return null;
};

/**
 * キャッシュにデータを保存
 */
const saveToCache = (lat, lng, data) => {
  const key = getCacheKey(lat, lng);
  weatherCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * キャッシュをクリア
 */
export const clearWeatherCache = () => {
  weatherCache.clear();
  console.log('[Weather] Cache cleared');
};

// ===== API呼び出し =====

/**
 * Open-Meteo APIから天候データを取得
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<Object>} 天候データ
 */
export const fetchWeatherData = async (lat, lng) => {
  const settings = getWeatherSettings();

  // モックモードの場合
  if (settings.useMockData) {
    console.log('[Weather] Using mock data:', settings.mockPattern);
    const mockData = MOCK_PATTERNS[settings.mockPattern] || MOCK_PATTERNS.ideal;
    return {
      ...mockData,
      location: { lat, lng },
      source: 'mock',
      fetchedAt: new Date().toISOString()
    };
  }

  // キャッシュ確認
  const cached = getFromCache(lat, lng);
  if (cached) {
    return cached;
  }

  // APIパラメータ
  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lng.toFixed(6),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility'
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation',
      'weather_code',
      'visibility',
      'wind_speed_10m',
      'wind_gusts_10m'
    ].join(','),
    timezone: 'Asia/Tokyo',
    forecast_days: 2
  });

  const url = `${OPEN_METEO_API_BASE}?${params}`;

  try {
    console.log('[Weather] Fetching from Open-Meteo:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // データを整形
    const result = {
      location: { lat, lng },
      source: 'open-meteo',
      fetchedAt: new Date().toISOString(),
      current: {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windGusts: data.current.wind_gusts_10m,
        windDirection: data.current.wind_direction_10m,
        precipitation: data.current.precipitation,
        visibility: data.current.visibility,
        weatherCode: data.current.weather_code,
        cloudCover: data.current.cloud_cover
      },
      hourly: data.hourly.time.map((time, i) => ({
        time,
        temperature: data.hourly.temperature_2m[i],
        windSpeed: data.hourly.wind_speed_10m[i],
        windGusts: data.hourly.wind_gusts_10m[i],
        precipitation: data.hourly.precipitation[i],
        visibility: data.hourly.visibility[i],
        weatherCode: data.hourly.weather_code[i]
      }))
    };

    // キャッシュに保存
    saveToCache(lat, lng, result);

    return result;
  } catch (error) {
    console.error('[Weather] API error:', error);

    // エラー時はモックデータを返す
    console.log('[Weather] Falling back to mock data');
    const mockData = MOCK_PATTERNS.cloudy;
    return {
      ...mockData,
      location: { lat, lng },
      source: 'mock-fallback',
      fetchedAt: new Date().toISOString(),
      error: error.message
    };
  }
};

// ===== 飛行条件判定 =====

/**
 * 風速から飛行条件を評価
 */
const evaluateWind = (windSpeed, windGusts) => {
  const t = FLIGHT_THRESHOLDS.wind;
  const gt = FLIGHT_THRESHOLDS.gusts;

  let level = 'good';
  let message = '良好';

  if (windSpeed >= t.dangerous || windGusts >= gt.dangerous) {
    level = 'dangerous';
    message = `飛行禁止（風速${windSpeed.toFixed(1)}m/s、突風${windGusts.toFixed(1)}m/s）`;
  } else if (windSpeed >= t.poor || windGusts >= gt.poor) {
    level = 'poor';
    message = `飛行困難（風速${windSpeed.toFixed(1)}m/s）`;
  } else if (windSpeed >= t.fair || windGusts >= gt.fair) {
    level = 'fair';
    message = `注意が必要（風速${windSpeed.toFixed(1)}m/s）`;
  } else {
    message = `良好（風速${windSpeed.toFixed(1)}m/s）`;
  }

  return { level, message, value: windSpeed, gusts: windGusts };
};

/**
 * 降水量から飛行条件を評価
 */
const evaluatePrecipitation = (precipitation) => {
  const t = FLIGHT_THRESHOLDS.precipitation;

  let level = 'good';
  let message = '降水なし';

  if (precipitation >= t.dangerous) {
    level = 'dangerous';
    message = `飛行禁止（降水${precipitation.toFixed(1)}mm/h）`;
  } else if (precipitation >= t.poor) {
    level = 'poor';
    message = `飛行困難（降水${precipitation.toFixed(1)}mm/h）`;
  } else if (precipitation >= t.fair) {
    level = 'fair';
    message = `軽い降水（${precipitation.toFixed(1)}mm/h）`;
  }

  return { level, message, value: precipitation };
};

/**
 * 視程から飛行条件を評価
 */
const evaluateVisibility = (visibility) => {
  const t = FLIGHT_THRESHOLDS.visibility;

  let level = 'good';
  let message = '良好';

  if (visibility <= t.dangerous) {
    level = 'dangerous';
    message = `飛行禁止（視程${visibility}m）`;
  } else if (visibility <= t.poor) {
    level = 'poor';
    message = `視程不良（${visibility}m）`;
  } else if (visibility <= t.fair) {
    level = 'fair';
    message = `視程注意（${visibility}m）`;
  } else {
    message = `良好（${(visibility / 1000).toFixed(1)}km）`;
  }

  return { level, message, value: visibility };
};

/**
 * 気温から飛行条件を評価
 */
const evaluateTemperature = (temperature) => {
  const tLow = FLIGHT_THRESHOLDS.tempLow;
  const tHigh = FLIGHT_THRESHOLDS.tempHigh;

  let level = 'good';
  let message = `${temperature.toFixed(1)}°C`;

  if (temperature <= tLow.dangerous || temperature >= tHigh.dangerous) {
    level = 'dangerous';
    message = `飛行禁止（${temperature.toFixed(1)}°C）`;
  } else if (temperature <= tLow.poor || temperature >= tHigh.poor) {
    level = 'poor';
    message = `飛行困難（${temperature.toFixed(1)}°C）`;
  } else if (temperature <= tLow.fair || temperature >= tHigh.fair) {
    level = 'fair';
    message = `注意（${temperature.toFixed(1)}°C）`;
  }

  return { level, message, value: temperature };
};

/**
 * 天気コードから飛行への影響を評価
 */
const evaluateWeatherCode = (weatherCode) => {
  const info = WEATHER_CODES[weatherCode] || {
    description: '不明',
    icon: '❓',
    flightImpact: 'fair'
  };

  return {
    level: info.flightImpact,
    message: info.description,
    icon: info.icon,
    code: weatherCode
  };
};

/**
 * レベルの優先度（危険度順）
 */
const LEVEL_PRIORITY = {
  dangerous: 4,
  poor: 3,
  fair: 2,
  good: 1
};

/**
 * 総合的な飛行条件を評価
 *
 * @param {Object} weatherData - fetchWeatherDataの結果
 * @returns {Object} 飛行条件の評価結果
 */
export const evaluateFlightConditions = (weatherData) => {
  if (!weatherData || !weatherData.current) {
    return {
      overall: 'unknown',
      overallMessage: 'データ取得中...',
      canFly: false,
      factors: [],
      recommendations: ['天候データを取得してください']
    };
  }

  const current = weatherData.current;

  // 各要素を評価
  const factors = [
    { name: '風速', ...evaluateWind(current.windSpeed, current.windGusts) },
    { name: '降水', ...evaluatePrecipitation(current.precipitation) },
    { name: '視程', ...evaluateVisibility(current.visibility) },
    { name: '気温', ...evaluateTemperature(current.temperature) },
    { name: '天候', ...evaluateWeatherCode(current.weatherCode) }
  ];

  // 最も悪い評価を総合評価とする
  const worstLevel = factors.reduce((worst, factor) => {
    return LEVEL_PRIORITY[factor.level] > LEVEL_PRIORITY[worst]
      ? factor.level
      : worst;
  }, 'good');

  // 総合メッセージ
  const overallMessages = {
    good: '飛行に適した条件です',
    fair: '飛行可能ですが注意が必要です',
    poor: '飛行は困難です。延期を検討してください',
    dangerous: '飛行禁止条件です。飛行しないでください'
  };

  // 推奨事項
  const recommendations = [];

  factors.forEach(factor => {
    if (factor.level === 'dangerous') {
      recommendations.push(`【禁止】${factor.name}: ${factor.message}`);
    } else if (factor.level === 'poor') {
      recommendations.push(`【困難】${factor.name}: ${factor.message}`);
    } else if (factor.level === 'fair') {
      recommendations.push(`【注意】${factor.name}: ${factor.message}`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('全ての条件が良好です');
  }

  // 飛行可能時間帯の予測
  const flyableHours = weatherData.hourly
    ? findFlyableHours(weatherData.hourly)
    : [];

  return {
    overall: worstLevel,
    overallMessage: overallMessages[worstLevel],
    canFly: worstLevel === 'good' || worstLevel === 'fair',
    factors,
    recommendations,
    flyableHours,
    weatherInfo: WEATHER_CODES[current.weatherCode] || { description: '不明', icon: '❓' },
    source: weatherData.source,
    fetchedAt: weatherData.fetchedAt
  };
};

/**
 * 飛行可能な時間帯を見つける
 */
const findFlyableHours = (hourlyData) => {
  const flyable = [];

  hourlyData.slice(0, 24).forEach((hour, index) => {
    const wind = evaluateWind(hour.windSpeed, hour.windGusts);
    const precip = evaluatePrecipitation(hour.precipitation);
    const vis = evaluateVisibility(hour.visibility);
    const weather = evaluateWeatherCode(hour.weatherCode);

    const worst = [wind, precip, vis, weather].reduce((w, f) => {
      return LEVEL_PRIORITY[f.level] > LEVEL_PRIORITY[w] ? f.level : w;
    }, 'good');

    if (worst === 'good' || worst === 'fair') {
      flyable.push({
        hour: index,
        time: hour.time,
        level: worst,
        windSpeed: hour.windSpeed
      });
    }
  });

  // 連続する時間帯をグループ化
  const groups = [];
  let currentGroup = null;

  flyable.forEach((h, i) => {
    if (!currentGroup || h.hour !== flyable[i - 1]?.hour + 1) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { start: h.hour, end: h.hour, times: [h] };
    } else {
      currentGroup.end = h.hour;
      currentGroup.times.push(h);
    }
  });

  if (currentGroup) groups.push(currentGroup);

  return groups.map(g => ({
    startHour: g.start,
    endHour: g.end,
    duration: g.end - g.start + 1,
    description: `${g.start}:00 〜 ${g.end + 1}:00（${g.end - g.start + 1}時間）`
  }));
};

// ===== フライトシミュレーション用 =====

/**
 * フライトシミュレーション用のリアルタイム天候変化を生成
 *
 * @param {Object} baseWeather - 基準となる天候データ
 * @param {number} elapsedMinutes - 経過時間（分）
 * @returns {Object} 変化した天候データ
 */
export const simulateWeatherChange = (baseWeather, elapsedMinutes) => {
  if (!baseWeather || !baseWeather.current) return baseWeather;

  const current = { ...baseWeather.current };

  // 時間経過による微小な変化をシミュレート
  const variation = Math.sin(elapsedMinutes / 10) * 0.5;

  current.windSpeed = Math.max(0, current.windSpeed + variation);
  current.windGusts = Math.max(current.windSpeed, current.windGusts + variation * 1.5);
  current.temperature = current.temperature + Math.sin(elapsedMinutes / 30) * 0.2;

  // 突発的な天候変化（5%の確率）
  if (Math.random() < 0.05) {
    current.windGusts += Math.random() * 3;
  }

  return {
    ...baseWeather,
    current,
    simulatedAt: new Date().toISOString(),
    elapsedMinutes
  };
};

/**
 * 指定した時刻の予報を取得
 *
 * @param {Object} weatherData - 天候データ
 * @param {Date} targetTime - 対象時刻
 * @returns {Object|null} その時刻の予報
 */
export const getForecastForTime = (weatherData, targetTime) => {
  if (!weatherData?.hourly) return null;

  const targetHour = targetTime.getHours();
  const forecast = weatherData.hourly.find((h) => {
    const hourTime = new Date(h.time);
    return hourTime.getHours() === targetHour;
  });

  if (!forecast) return null;

  return {
    ...forecast,
    evaluation: {
      wind: evaluateWind(forecast.windSpeed, forecast.windGusts),
      precipitation: evaluatePrecipitation(forecast.precipitation),
      visibility: evaluateVisibility(forecast.visibility),
      weather: evaluateWeatherCode(forecast.weatherCode)
    }
  };
};

// ===== エクスポート =====

export {
  WEATHER_CODES,
  FLIGHT_THRESHOLDS,
  MOCK_PATTERNS
};
