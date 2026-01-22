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

export const Default: Story = {
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

const waypointMenuItems = [
  {
    id: 'header',
    type: 'header',
    label: 'ウェイポイント #3',
  },
  {
    id: 'edit',
    label: '座標を編集',
    icon: <Edit size={14} />,
    action: 'editWaypoint',
  },
  {
    id: 'copy',
    label: '複製',
    icon: <Copy size={14} />,
    action: 'duplicateWaypoint',
  },
  { divider: true },
  {
    id: 'delete',
    label: '削除',
    icon: <Trash2 size={14} />,
    action: 'deleteWaypoint',
    danger: true,
    shortcut: 'Del',
  },
]

export const WaypointMenu: Story = {
  args: {
    isOpen: true,
    position: { x: 200, y: 150 },
    menuItems: waypointMenuItems,
    onClose: () => console.log('Menu closed'),
    onAction: (action) => console.log('Action:', action),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: '400px', minHeight: '300px', position: 'relative', background: '#f5f5f5' }}>
        <p style={{ padding: '16px', color: '#666' }}>ウェイポイント右クリックメニュー</p>
        <Story />
      </div>
    ),
  ],
}

const polygonMenuItems = [
  {
    id: 'header',
    type: 'header',
    label: 'ポリゴン: 調査エリアA',
  },
  {
    id: 'generate',
    label: 'グリッドWPを生成',
    icon: <Plus size={14} />,
    action: 'generateGrid',
  },
  {
    id: 'export',
    label: 'エクスポート',
    icon: <Download size={14} />,
    action: 'export',
  },
  { divider: true },
  {
    id: 'edit',
    label: '編集',
    icon: <Edit size={14} />,
    action: 'editPolygon',
  },
  {
    id: 'delete',
    label: '削除',
    icon: <Trash2 size={14} />,
    action: 'deletePolygon',
    danger: true,
  },
]

export const PolygonMenu: Story = {
  args: {
    isOpen: true,
    position: { x: 200, y: 150 },
    menuItems: polygonMenuItems,
    onClose: () => console.log('Menu closed'),
    onAction: (action) => console.log('Action:', action),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: '400px', minHeight: '350px', position: 'relative', background: '#f5f5f5' }}>
        <p style={{ padding: '16px', color: '#666' }}>ポリゴン右クリックメニュー</p>
        <Story />
      </div>
    ),
  ],
}

const disabledMenuItems = [
  {
    id: 'add',
    label: 'ウェイポイントを追加',
    icon: <MapPin size={14} />,
    action: 'addWaypoint',
  },
  {
    id: 'navigate-disabled',
    label: 'ナビゲート (選択なし)',
    icon: <Navigation size={14} />,
    action: 'navigate',
    disabled: true,
  },
  { divider: true },
  {
    id: 'export-disabled',
    label: 'エクスポート (データなし)',
    icon: <Download size={14} />,
    action: 'export',
    disabled: true,
  },
]

export const WithDisabledItems: Story = {
  args: {
    isOpen: true,
    position: { x: 200, y: 150 },
    menuItems: disabledMenuItems,
    onClose: () => console.log('Menu closed'),
    onAction: (action) => console.log('Action:', action),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: '400px', minHeight: '300px', position: 'relative', background: '#f5f5f5' }}>
        <p style={{ padding: '16px', color: '#666' }}>無効化されたアイテムを含むメニュー</p>
        <Story />
      </div>
    ),
  ],
}

const InteractiveDemo = () => {
  const [menuState, setMenuState] = useState({ isOpen: false, x: 0, y: 0 })
  const [lastAction, setLastAction] = useState<string | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuState({ isOpen: true, x: e.clientX, y: e.clientY })
  }

  return (
    <div
      style={{
        minWidth: '500px',
        minHeight: '300px',
        background: '#e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
      onContextMenu={handleContextMenu}
    >
      <p style={{ color: '#666' }}>この領域で右クリックしてメニューを表示</p>
      {lastAction && (
        <p style={{ color: '#10b981', fontWeight: 'bold' }}>
          実行されたアクション: {lastAction}
        </p>
      )}
      <ContextMenu
        isOpen={menuState.isOpen}
        position={{ x: menuState.x, y: menuState.y }}
        menuItems={basicMenuItems}
        onClose={() => setMenuState(prev => ({ ...prev, isOpen: false }))}
        onAction={(action) => {
          setLastAction(action)
          setMenuState(prev => ({ ...prev, isOpen: false }))
        }}
      />
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  parameters: {
    docs: {
      description: {
        story: '実際に右クリックでメニューを表示できるインタラクティブなデモです。',
      },
    },
  },
}
