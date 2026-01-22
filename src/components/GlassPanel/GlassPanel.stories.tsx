import type { Meta, StoryObj } from '@storybook/react-vite'
import { GlassPanel } from './GlassPanel'
import { Settings, RefreshCw } from 'lucide-react'

/**
 * GlassPanelはアプリケーション全体で使用される
 * グラスモーフィズムスタイルのパネルコンポーネントです。
 *
 * 飛行要件パネル、天気予報パネル、エクスポートパネルなどの
 * ベースUIとして使用されています。
 */
const meta: Meta<typeof GlassPanel> = {
  title: 'UI/GlassPanel',
  component: GlassPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'グラスモーフィズムスタイルのパネルコンポーネント。様々なUI要素のベースとして使用。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'text',
      description: 'パネルの幅',
    },
    maxHeight: {
      control: 'text',
      description: '最大高さ',
    },
    bottom: {
      control: 'number',
      description: '下からの位置',
    },
    right: {
      control: 'number',
      description: '右からの位置',
    },
    left: {
      control: 'number',
      description: '左からの位置',
    },
    top: {
      control: 'number',
      description: '上からの位置',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: '500px', minHeight: '400px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: '基本パネル',
    children: (
      <div style={{ padding: '16px' }}>
        <p>パネルのコンテンツがここに表示されます。</p>
        <p>ESCキーで閉じることができます。</p>
      </div>
    ),
    width: 320,
    bottom: 20,
    right: 20,
    onClose: () => alert('閉じるボタンがクリックされました'),
  },
}

export const WithFooter: Story = {
  args: {
    title: 'フッター付きパネル',
    children: (
      <div style={{ padding: '16px' }}>
        <p>メインコンテンツ領域</p>
      </div>
    ),
    footer: (
      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
        最終更新: 2時間前
      </div>
    ),
    width: 320,
    bottom: 20,
    right: 20,
    onClose: () => {},
  },
}

export const WithHeaderActions: Story = {
  args: {
    title: 'ヘッダーアクション付き',
    children: (
      <div style={{ padding: '16px' }}>
        <p>ヘッダーにカスタムアクションボタンを追加できます。</p>
      </div>
    ),
    headerActions: (
      <>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text)',
          }}
          title="設定"
        >
          <Settings size={16} />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text)',
          }}
          title="更新"
        >
          <RefreshCw size={16} />
        </button>
      </>
    ),
    width: 320,
    bottom: 20,
    right: 20,
    onClose: () => {},
  },
}

export const FlightRequirementsExample: Story = {
  args: {
    title: '飛行要件チェック',
    children: (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>航空法関連</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}>
            <span>✓</span>
            <span>空港等周辺: 該当なし</span>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>小型無人機禁止法</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <span>!</span>
            <span>重要施設: 要確認</span>
          </div>
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>土地管理者ルール</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
            <span>i</span>
            <span>私有地上空の可能性あり</span>
          </div>
        </div>
      </div>
    ),
    footer: <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>DIPS 2.0で許可申請</div>,
    width: 360,
    bottom: 20,
    right: 20,
    onClose: () => {},
  },
}

export const TopLeftPosition: Story = {
  args: {
    title: '左上配置',
    children: (
      <div style={{ padding: '16px' }}>
        <p>左上に配置されたパネル</p>
      </div>
    ),
    width: 280,
    top: 20,
    left: 20,
    bottom: undefined,
    right: undefined,
    onClose: () => {},
  },
}
