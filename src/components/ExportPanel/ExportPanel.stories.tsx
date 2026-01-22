import type { Meta, StoryObj } from '@storybook/react-vite'
import ExportPanel from './ExportPanel'

const samplePolygons = [
  {
    id: 'poly-1',
    name: '調査エリアA',
    color: '#22c55e',
    createdAt: new Date().toISOString(),
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

const sampleWaypoints = [
  {
    id: 'wp-1',
    index: 1,
    lat: 35.6812,
    lng: 139.7671,
    type: 'vertex',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
    elevation: 42.5,
  },
  {
    id: 'wp-2',
    index: 2,
    lat: 35.6822,
    lng: 139.7681,
    type: 'vertex',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
    elevation: 41.8,
  },
  {
    id: 'wp-3',
    index: 3,
    lat: 35.6808,
    lng: 139.7693,
    type: 'grid',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
  },
  {
    id: 'wp-4',
    index: 4,
    lat: 35.6794,
    lng: 139.7713,
    type: 'vertex',
    polygonId: 'poly-2',
    polygonName: '調査エリアB',
    elevation: 35.2,
  },
  {
    id: 'wp-5',
    index: 5,
    lat: 35.6802,
    lng: 139.7723,
    type: 'grid',
    polygonId: 'poly-2',
    polygonName: '調査エリアB',
  },
]

const meta: Meta<typeof ExportPanel> = {
  title: 'Components/ExportPanel',
  component: ExportPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ウェイポイント/ポリゴンの各種エクスポート形式を選択するパネル。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    waypoints: sampleWaypoints,
    polygons: samplePolygons,
    onClose: () => console.log('閉じる'),
  },
}

export const NOTAMFormat: Story = {
  args: {
    waypoints: sampleWaypoints,
    polygons: samplePolygons,
    onClose: () => console.log('閉じる'),
  },
  parameters: {
    docs: {
      description: {
        story: '「DMSテキスト」からNOTAM向けの度分秒書式を確認できます。',
      },
    },
  },
}
