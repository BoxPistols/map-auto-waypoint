import type { Meta, StoryObj } from '@storybook/react-vite'
import FlightRequirements from './FlightRequirements'

const samplePolygon = {
  id: 'poly-1',
  name: '調査エリアA',
  color: '#22c55e',
  createdAt: new Date().toISOString(),
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [139.7665, 35.6812],
        [139.769, 35.6812],
        [139.769, 35.6832],
        [139.7665, 35.6832],
        [139.7665, 35.6812],
      ],
    ],
  },
}

const meta: Meta<typeof FlightRequirements> = {
  title: 'Components/FlightRequirements',
  component: FlightRequirements,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '選択エリアに対する飛行要件の判定結果を表示するパネル。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '80vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    polygon: samplePolygon,
    altitude: 60,
    onClose: () => console.log('閉じる'),
    initialMinimized: false,
  },
}

export const WithSearchResult: Story = {
  args: {
    isOpen: true,
    searchResult: {
      lat: 35.681236,
      lng: 139.767125,
      displayName: '東京駅',
      boundingbox: ['35.680', '35.682', '139.766', '139.768'],
      type: 'poi',
    },
    altitude: 120,
    onClose: () => console.log('閉じる'),
    initialMinimized: false,
  },
}
