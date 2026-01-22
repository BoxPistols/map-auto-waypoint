import type { Meta, StoryObj } from '@storybook/react-vite'
import PolygonList from './PolygonList'

const samplePolygons = [
  {
    id: 'poly-1',
    name: '調査エリアA',
    color: '#22c55e',
    createdAt: new Date().toISOString(),
    waypointLinked: true,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [139.767, 35.681],
          [139.769, 35.681],
          [139.769, 35.683],
          [139.767, 35.683],
          [139.767, 35.681],
        ],
      ],
    },
  },
  {
    id: 'poly-2',
    name: '調査エリアB',
    color: '#3b82f6',
    createdAt: new Date().toISOString(),
    waypointLinked: false,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [139.771, 35.679],
          [139.773, 35.679],
          [139.773, 35.681],
          [139.771, 35.681],
          [139.771, 35.679],
        ],
      ],
    },
  },
]

const meta: Meta<typeof PolygonList> = {
  title: 'Components/PolygonList',
  component: PolygonList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ポリゴン一覧の管理UI。作成・編集・削除・Waypoint生成操作を行う。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          width: '340px',
          maxHeight: '520px',
          overflow: 'auto',
          background: 'var(--color-bg)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          padding: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    polygons: samplePolygons,
    selectedPolygonId: null,
    onSelect: (polygon) => console.log('選択', polygon),
    onDelete: (id) => console.log('削除', id),
    onRename: (id, name) => console.log('名称変更', id, name),
    onEditShape: (polygon) => console.log('形状編集', polygon),
    onToggleWaypointLink: (id) => console.log('リンク切替', id),
    onGenerateWaypoints: (polygon, options) => console.log('WP生成', polygon, options),
    onGenerateAllWaypoints: () => console.log('全て生成'),
  },
}

export const Selected: Story = {
  args: {
    polygons: samplePolygons,
    selectedPolygonId: 'poly-1',
    onSelect: (polygon) => console.log('選択', polygon),
    onDelete: (id) => console.log('削除', id),
    onRename: (id, name) => console.log('名称変更', id, name),
    onEditShape: (polygon) => console.log('形状編集', polygon),
    onToggleWaypointLink: (id) => console.log('リンク切替', id),
    onGenerateWaypoints: (polygon, options) => console.log('WP生成', polygon, options),
    onGenerateAllWaypoints: () => console.log('全て生成'),
  },
}

export const Empty: Story = {
  args: {
    polygons: [],
    onSelect: () => {},
    onDelete: () => {},
    onRename: () => {},
    onEditShape: () => {},
    onToggleWaypointLink: () => {},
    onGenerateWaypoints: () => {},
    onGenerateAllWaypoints: () => {},
  },
}
