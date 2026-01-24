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
  argTypes: {
    facility: {
      description: '施設情報オブジェクト',
      control: 'object',
    },
    screenX: {
      control: { type: 'range', min: 0, max: 600, step: 10 },
      description: 'ポップアップのX座標',
    },
    screenY: {
      control: { type: 'range', min: 0, max: 400, step: 10 },
      description: 'ポップアップのY座標',
    },
  },
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
 * 基本的な使用例
 * コントロールパネルで施設情報、位置を変更できます。
 */
export const Basic: Story = {
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
    screenX: 200,
    screenY: 150,
    onClose: () => console.log('閉じる'),
  },
}
