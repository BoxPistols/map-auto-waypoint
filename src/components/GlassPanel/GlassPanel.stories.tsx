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

/**
 * 基本的な使用例
 * コントロールパネルでタイトル、位置、サイズ、フッターなどを変更できます。
 */
export const Basic: Story = {
  args: {
    title: '基本パネル',
    children: (
      <div style={{ padding: '16px' }}>
        <p>パネルのコンテンツがここに表示されます。</p>
        <p>ESCキーで閉じることができます。</p>
        <p>コントロールパネルで位置やサイズを変更できます。</p>
      </div>
    ),
    width: 320,
    bottom: 20,
    right: 20,
    onClose: () => console.log('閉じる'),
  },
}
