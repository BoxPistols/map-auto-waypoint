import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentType } from 'react'
import { useEffect } from 'react'
import WeatherForecastPanel from './WeatherForecastPanel'

const mockRainViewerData = {
  version: '2.0',
  generated: 1737500000,
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: 1737498800, path: '/v2/radar/1737498800' },
      { time: 1737499100, path: '/v2/radar/1737499100' },
      { time: 1737499400, path: '/v2/radar/1737499400' },
      { time: 1737499700, path: '/v2/radar/1737499700' },
    ],
    nowcast: [
      { time: 1737500000, path: '/v2/radar/1737500000' },
      { time: 1737500300, path: '/v2/radar/1737500300' },
      { time: 1737500600, path: '/v2/radar/1737500600' },
    ],
  },
}

const withMockedRainViewer = (Story: ComponentType) => {
  useEffect(() => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockRainViewerData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    return () => {
      globalThis.fetch = originalFetch
    }
  }, [])

  return <Story />
}

const meta: Meta<typeof WeatherForecastPanel> = {
  title: 'Components/WeatherForecastPanel',
  component: WeatherForecastPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '雨雲レーダー時刻選択と気象サマリーを表示するパネル。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [withMockedRainViewer],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('閉じる'),
    onTimeChange: (payload) => console.log('時刻変更', payload),
    center: { lat: 35.681236, lng: 139.767125 },
    sidebarCollapsed: false,
  },
}

export const SidebarCollapsed: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('閉じる'),
    onTimeChange: (payload) => console.log('時刻変更', payload),
    center: { lat: 35.681236, lng: 139.767125 },
    sidebarCollapsed: true,
  },
}
