import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentType } from 'react'
import Map from './Map.jsx'

type PolygonData = {
  id: string
  name: string
  color: string
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

type WaypointData = {
  id: string
  index: number
  lat: number
  lng: number
  type: 'vertex' | 'grid' | 'manual' | 'perimeter'
  polygonName?: string
  polygonId?: string
}

type WaypointIssueFlags = {
  hasDID?: boolean
  hasAirport?: boolean
  hasProhibited?: boolean
}

type DangerSegment = {
  fromWaypoint: WaypointData
  toWaypoint: WaypointData
  segmentType: 'DID' | 'AIRPORT' | 'PROHIBITED'
  segmentColor: string
}

type CollisionPolygonFeature = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

type CollisionMapProps = {
  center: { lat: number; lng: number }
  zoom: number
  polygons: PolygonData[]
  waypoints: WaypointData[]
  didHighlightedWaypointIndices: Set<number>
  waypointIssueFlagsById: Record<string, WaypointIssueFlags>
  pathCollisionResult: {
    isColliding: boolean
    dangerSegments: DangerSegment[]
    intersectionPoints: unknown[]
    affectedSegments: unknown[]
  } | null
  polygonCollisionResult: {
    hasCollisions: boolean
    intersectionPolygons: CollisionPolygonFeature[]
  } | null
  selectedPolygonId?: string | null
  drawMode?: boolean
}

const MapComponent = Map as ComponentType<CollisionMapProps>

const samplePolygons: PolygonData[] = [
  {
    id: 'poly-1',
    name: '調査エリアA',
    color: '#22c55e',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [139.7665, 35.681],
          [139.7695, 35.681],
          [139.7695, 35.684],
          [139.7665, 35.684],
          [139.7665, 35.681],
        ],
      ],
    },
  },
]

const sampleWaypoints: WaypointData[] = [
  {
    id: 'wp-1',
    index: 1,
    lat: 35.6816,
    lng: 139.767,
    type: 'vertex',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
  },
  {
    id: 'wp-2',
    index: 2,
    lat: 35.6824,
    lng: 139.768,
    type: 'grid',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
  },
  {
    id: 'wp-3',
    index: 3,
    lat: 35.6832,
    lng: 139.769,
    type: 'grid',
    polygonId: 'poly-1',
    polygonName: '調査エリアA',
  },
]

const meta: Meta<typeof MapComponent> = {
  title: 'Components/Map/CollisionFeedback',
  component: MapComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '衝突検出（危険セグメント・禁止区域重複）の視覚フィードバック例。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '600px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const CollisionFeedback: Story = {
  render: () => (
    <MapComponent
      center={{ lat: 35.682, lng: 139.7678 }}
      zoom={13.5}
      polygons={samplePolygons}
      waypoints={sampleWaypoints}
      didHighlightedWaypointIndices={new Set([2])}
      waypointIssueFlagsById={{
        'wp-2': { hasProhibited: true },
        'wp-3': { hasDID: true },
      }}
      pathCollisionResult={{
        isColliding: true,
        dangerSegments: [
          {
            fromWaypoint: sampleWaypoints[0],
            toWaypoint: sampleWaypoints[1],
            segmentType: 'PROHIBITED',
            segmentColor: '#dc2626',
          },
          {
            fromWaypoint: sampleWaypoints[1],
            toWaypoint: sampleWaypoints[2],
            segmentType: 'DID',
            segmentColor: '#dc2626',
          },
        ],
        intersectionPoints: [],
        affectedSegments: [],
      }}
      polygonCollisionResult={{
        hasCollisions: true,
        intersectionPolygons: [
          {
            type: 'Feature',
            properties: {
              polygonId: 'poly-1',
              severity: 'high',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.7672, 35.6816],
                  [139.7686, 35.6816],
                  [139.7686, 35.683],
                  [139.7672, 35.683],
                  [139.7672, 35.6816],
                ],
              ],
            },
          },
        ],
      }}
      selectedPolygonId="poly-1"
      drawMode={false}
    />
  ),
}
