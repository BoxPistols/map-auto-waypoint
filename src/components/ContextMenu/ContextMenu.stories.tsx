import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ContextMenu } from './ContextMenu'
import { MapPin, Trash2, Copy, Edit, Navigation, Download, Plus } from 'lucide-react'

/**
 * ContextMenuはGoogle Mapsスタイルの右クリックメニューです。
 * 地図上での操作やウェイポイント編集に使用されます。
 */
const meta: Meta<typeof ContextMenu> = {
  title: 'UI/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '右クリックで表示されるコンテキストメニュー。地図操作やウェイポイント編集に使用。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'メニューの表示状態',
    },
    position: {
      description: 'メニューの表示位置 {x, y}',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const basicMenuItems = [
  {
    id: 'add-waypoint',
    label: 'ウェイポイントを追加',
    icon: <MapPin size={14} />,
    action: 'addWaypoint',
    shortcut: 'Shift+Click',
  },
  {
    id: 'navigate',
    label: 'ここへナビゲート',
    icon: <Navigation size={14} />,
    action: 'navigate',
  },
  { divider: true },
  {
    id: 'copy-coords',
    label: '座標をコピー',
    icon: <Copy size={14} />,
    action: 'copyCoords',
    shortcut: 'Ctrl+C',
  },
]

/**
 * 基本的な使用例
 * コントロールパネルでmenuItemsを変更できます。
 */
export const Basic: Story = {
  args: {
    isOpen: true,
    position: { x: 200, y: 150 },
    menuItems: basicMenuItems,
    onClose: () => console.log('Menu closed'),
    onAction: (action, data) => console.log('Action:', action, data),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: '400px', minHeight: '300px', position: 'relative', background: '#f5f5f5' }}>
        <p style={{ padding: '16px', color: '#666' }}>右クリックメニューのデモ</p>
        <Story />
      </div>
    ),
  ],
}
