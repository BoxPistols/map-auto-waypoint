import type { Meta, StoryObj } from '@storybook/react-vite'
import FacilityPopup from './FacilityPopup'

/**
 * FacilityPopupは禁止区域施設の詳細情報を表示するポップアップコンポーネントです。
 * Issue #29で実装された以下の機能を提供します：
 * - 施設の基本情報（名前、種類、座標、半径）
 * - 原子力施設の稼働状況の色分け表示
 * - レスポンシブ対応
 */
const meta: Meta<typeof FacilityPopup> = {
  title: 'Map/FacilityPopup',
  component: FacilityPopup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '禁止区域施設の詳細情報ポップアップ。原発稼働状況の視覚化機能を搭載。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px', height: '400px', position: 'relative', background: '#e5e7eb' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * 政府機関の例
 */
export const GovernmentFacility: Story = {
  args: {
    facility: {
      name: '国会議事堂',
      nameEn: 'National Diet Building',
      type: 'government',
      coordinates: [139.745, 35.6759],
      radiusKm: 0.2,
      zone: 'red',
      description: '国の最高立法機関'
    },
    screenX: 150,
    screenY: 100,
    onClose: () => alert('閉じる'),
  },
}

/**
 * 原子力施設 - 運転中
 */
export const NuclearOperational: Story = {
  args: {
    facility: {
      name: '高浜発電所',
      nameEn: 'Takahama Nuclear Power Plant',
      type: 'nuclear',
      coordinates: [135.5025, 35.5219],
      radiusKm: 9.6,
      zone: 'red',
      operationalStatus: 'operational',
      reactorCount: 4,
      capacity: '3,392MW',
      operator: '関西電力',
      description: '福井県大飯郡高浜町に立地する原子力発電所'
    },
    screenX: 200,
    screenY: 120,
    onClose: () => {},
  },
}

/**
 * 原子力施設 - 停止中
 */
export const NuclearStopped: Story = {
  args: {
    facility: {
      name: '柏崎刈羽原子力発電所',
      nameEn: 'Kashiwazaki-Kariwa Nuclear Power Plant',
      type: 'nuclear',
      coordinates: [138.5956, 37.4261],
      radiusKm: 9.6,
      zone: 'red',
      operationalStatus: 'stopped',
      reactorCount: 7,
      capacity: '8,212MW',
      operator: '東京電力ホールディングス',
      description: '世界最大級の出力を持つ原子力発電所'
    },
    screenX: 200,
    screenY: 120,
    onClose: () => {},
  },
}

/**
 * 原子力施設 - 廃炉作業中
 */
export const NuclearDecommissioning: Story = {
  args: {
    facility: {
      name: '福島第一原子力発電所',
      nameEn: 'Fukushima Daiichi Nuclear Power Plant',
      type: 'nuclear',
      coordinates: [141.0262, 37.4219],
      radiusKm: 9.6,
      zone: 'red',
      operationalStatus: 'decommissioning',
      reactorCount: 6,
      capacity: '4,696MW',
      operator: '東京電力ホールディングス',
      description: '2011年の事故により廃炉作業中'
    },
    screenX: 200,
    screenY: 120,
    onClose: () => {},
  },
}

/**
 * 原子力施設 - 廃炉完了
 */
export const NuclearDecommissioned: Story = {
  args: {
    facility: {
      name: '東海発電所',
      nameEn: 'Tokai Nuclear Power Plant',
      type: 'nuclear',
      coordinates: [140.6086, 36.4667],
      radiusKm: 9.6,
      zone: 'red',
      operationalStatus: 'decommissioned',
      reactorCount: 1,
      capacity: '166MW',
      operator: '日本原子力発電',
      description: '日本初の商用原子力発電所、廃炉完了'
    },
    screenX: 200,
    screenY: 120,
    onClose: () => {},
  },
}

/**
 * 皇室関連施設
 */
export const ImperialFacility: Story = {
  args: {
    facility: {
      name: '皇居',
      nameEn: 'Imperial Palace',
      type: 'imperial',
      coordinates: [139.7528, 35.6852],
      radiusKm: 0.2,
      zone: 'red',
      description: '天皇陛下の住まい'
    },
    screenX: 250,
    screenY: 150,
    onClose: () => {},
  },
}

/**
 * 外国公館（イエローゾーン）
 */
export const ForeignMission: Story = {
  args: {
    facility: {
      name: '駐日アメリカ合衆国大使館',
      nameEn: 'Embassy of the United States',
      type: 'foreign_mission',
      coordinates: [139.7386, 35.6694],
      radiusKm: 0.3,
      zone: 'yellow',
      description: '外国公館につき周辺300mは要通報'
    },
    screenX: 180,
    screenY: 100,
    onClose: () => {},
  },
}

/**
 * 都道府県庁
 */
export const PrefectureFacility: Story = {
  args: {
    facility: {
      name: '東京都庁',
      nameEn: 'Tokyo Metropolitan Government Building',
      type: 'prefecture',
      coordinates: [139.6917, 35.6895],
      radiusKm: 0.3,
      zone: 'yellow',
      category: '都道府県庁',
      description: '東京都の行政機関'
    },
    screenX: 220,
    screenY: 130,
    onClose: () => {},
  },
}

/**
 * 防衛施設
 */
export const DefenseFacility: Story = {
  args: {
    facility: {
      name: '市ヶ谷駐屯地',
      nameEn: 'Ichigaya Base',
      type: 'military_jsdf',
      coordinates: [139.7294, 35.6875],
      radiusKm: 0.3,
      zone: 'yellow',
      category: '自衛隊施設',
      description: '防衛省・自衛隊の中枢'
    },
    screenX: 200,
    screenY: 110,
    onClose: () => {},
  },
}

/**
 * 位置指定の例（右下）
 */
export const PositionBottomRight: Story = {
  args: {
    facility: {
      name: '首相官邸',
      nameEn: "Prime Minister's Official Residence",
      type: 'government',
      coordinates: [139.7412, 35.6731],
      radiusKm: 0.2,
      zone: 'red',
    },
    screenX: 450,
    screenY: 300,
    onClose: () => {},
  },
}

/**
 * 位置指定の例（左上）
 */
export const PositionTopLeft: Story = {
  args: {
    facility: {
      name: '最高裁判所',
      nameEn: 'Supreme Court of Japan',
      type: 'government',
      coordinates: [139.7424, 35.6795],
      radiusKm: 0.2,
      zone: 'red',
    },
    screenX: 50,
    screenY: 50,
    onClose: () => {},
  },
}
