import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import WaypointList from './WaypointList'

/**
 * WaypointListはウェイポイント一覧を表示・管理するコンポーネントです。
 * ポリゴンごとにグループ化され、座標の編集、標高取得、削除などの操作が可能です。
 */
const meta: Meta<typeof WaypointList> = {
  title: 'Components/WaypointList',
  component: WaypointList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ウェイポイント一覧表示・管理コンポーネント。座標編集、標高取得、ルート最適化などの機能を提供。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px', maxHeight: '500px', overflow: 'auto', background: 'var(--color-bg)', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

const sampleWaypoints = [
  {
    id: 'wp-1',
    index: 1,
    lat: 35.681236,
    lng: 139.767125,
    type: 'vertex',
    polygonName: '調査エリアA',
    elevation: 42.5,
  },
  {
    id: 'wp-2',
    index: 2,
    lat: 35.682145,
    lng: 139.768234,
    type: 'vertex',
    polygonName: '調査エリアA',
    elevation: 38.2,
  },
  {
    id: 'wp-3',
    index: 3,
    lat: 35.680987,
    lng: 139.769012,
    type: 'grid',
    polygonName: '調査エリアA',
    elevation: 40.1,
  },
  {
    id: 'wp-4',
    index: 4,
    lat: 35.683456,
    lng: 139.765678,
    type: 'grid',
    polygonName: '調査エリアA',
  },
  {
    id: 'wp-5',
    index: 5,
    lat: 35.690123,
    lng: 139.780456,
    type: 'vertex',
    polygonName: '調査エリアB',
    elevation: 15.8,
  },
  {
    id: 'wp-6',
    index: 6,
    lat: 35.691234,
    lng: 139.781567,
    type: 'manual',
    polygonName: '調査エリアB',
  },
]

export const Default: Story = {
  args: {
    waypoints: sampleWaypoints,
    onSelect: (wp) => console.log('Selected:', wp),
    onDelete: (id) => console.log('Delete:', id),
    onClear: () => console.log('Clear all'),
    onUpdate: (id, data) => console.log('Update:', id, data),
    onFetchElevation: () => console.log('Fetch elevation'),
    onOpenRouteOptimizer: () => console.log('Open route optimizer'),
    isLoadingElevation: false,
  },
}

export const Empty: Story = {
  args: {
    waypoints: [],
    onSelect: () => {},
    onDelete: () => {},
    onClear: () => {},
    onUpdate: () => {},
    onFetchElevation: () => {},
    onOpenRouteOptimizer: () => {},
  },
}

export const LoadingElevation: Story = {
  args: {
    waypoints: sampleWaypoints,
    onSelect: () => {},
    onDelete: () => {},
    onClear: () => {},
    onUpdate: () => {},
    onFetchElevation: () => {},
    onOpenRouteOptimizer: () => {},
    isLoadingElevation: true,
    elevationProgress: {
      current: 3,
      total: 6,
    },
  },
}

const singlePolygonWaypoints = [
  {
    id: 'wp-1',
    index: 1,
    lat: 35.681236,
    lng: 139.767125,
    type: 'vertex',
    polygonName: '太陽光発電所',
    elevation: 125.3,
  },
  {
    id: 'wp-2',
    index: 2,
    lat: 35.682145,
    lng: 139.768234,
    type: 'vertex',
    polygonName: '太陽光発電所',
    elevation: 124.8,
  },
  {
    id: 'wp-3',
    index: 3,
    lat: 35.680987,
    lng: 139.769012,
    type: 'perimeter',
    polygonName: '太陽光発電所',
    elevation: 126.1,
  },
  {
    id: 'wp-4',
    index: 4,
    lat: 35.683456,
    lng: 139.765678,
    type: 'perimeter',
    polygonName: '太陽光発電所',
    elevation: 123.5,
  },
]

export const SinglePolygon: Story = {
  args: {
    waypoints: singlePolygonWaypoints,
    onSelect: () => {},
    onDelete: () => {},
    onClear: () => {},
    onUpdate: () => {},
    onFetchElevation: () => {},
    onOpenRouteOptimizer: () => {},
  },
}

const gridWaypoints = Array.from({ length: 20 }, (_, i) => ({
  id: `grid-${i + 1}`,
  index: i + 1,
  lat: 35.68 + (i % 5) * 0.001,
  lng: 139.76 + Math.floor(i / 5) * 0.001,
  type: 'grid',
  polygonName: 'グリッド調査エリア',
  elevation: 30 + Math.random() * 10,
}))

export const LargeDataset: Story = {
  args: {
    waypoints: gridWaypoints,
    onSelect: () => {},
    onDelete: () => {},
    onClear: () => {},
    onUpdate: () => {},
    onFetchElevation: () => {},
    onOpenRouteOptimizer: () => {},
  },
}

const InteractiveDemo = () => {
  const [waypoints, setWaypoints] = useState(sampleWaypoints)

  const handleDelete = (id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id))
  }

  const handleClear = () => {
    setWaypoints([])
  }

  const handleUpdate = (id: string, data: Record<string, unknown>) => {
    setWaypoints(prev => prev.map(wp =>
      wp.id === id ? { ...wp, ...data } : wp
    ))
  }

  return (
    <WaypointList
      waypoints={waypoints}
      onSelect={(wp) => alert(`選択: ${wp.id}`)}
      onDelete={handleDelete}
      onClear={handleClear}
      onUpdate={handleUpdate}
      onFetchElevation={() => alert('標高取得機能')}
      onOpenRouteOptimizer={() => alert('ルート最適化')}
    />
  )
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  parameters: {
    docs: {
      description: {
        story: '実際に削除や編集操作ができるインタラクティブなデモです。',
      },
    },
  },
}
