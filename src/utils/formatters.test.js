/**
 * formatters テスト
 *
 * 座標・日付フォーマッターのテスト
 */

import { describe, it, expect, vi } from 'vitest'
import {
  formatDateToJST,
  formatDMS,
  formatDecimalCoordinate,
  formatDMSCoordinate,
  formatWaypointList,
  copyToClipboard
} from './formatters'

describe('formatters', () => {

  describe('formatDateToJST', () => {
    it('Unix timestampをJST形式に変換する', () => {
      // 2024-01-01 00:00:00 UTC = 2024-01-01 09:00:00 JST
      const timestamp = 1704067200000
      const result = formatDateToJST(timestamp)
      expect(result).toContain('2024')
      expect(result).toContain('01')
      expect(result).toContain('09:00:00')
    })

    it('タイムスタンプがnullの場合は「日時未設定」を返す', () => {
      expect(formatDateToJST(null)).toBe('日時未設定')
    })

    it('タイムスタンプがundefinedの場合は「日時未設定」を返す', () => {
      expect(formatDateToJST(undefined)).toBe('日時未設定')
    })
  })

  describe('formatDMS', () => {
    it('緯度の10進数を度分秒に変換する', () => {
      const result = formatDMS(35.6585805, true)
      expect(result).toContain('北緯')
      expect(result).toContain('35')
      expect(result).toContain('39')
      expect(result).toMatch(/\d+°\d+'\d+\.\d+"/)
    })

    it('経度の10進数を度分秒に変換する', () => {
      const result = formatDMS(139.7454329, false)
      expect(result).toContain('東経')
      expect(result).toContain('139')
      expect(result).toContain('44')
      expect(result).toMatch(/\d+°\d+'\d+\.\d+"/)
    })

    it('負の緯度の場合は南緯を返す', () => {
      const result = formatDMS(-35.6585805, true)
      expect(result).toContain('南緯')
    })

    it('負の経度の場合は西経を返す', () => {
      const result = formatDMS(-139.7454329, false)
      expect(result).toContain('西経')
    })
  })

  describe('formatDecimalCoordinate', () => {
    it('座標を10進数形式でフォーマットする', () => {
      const result = formatDecimalCoordinate(35.6585805, 139.7454329)
      expect(result).toBe('139.74543290, 35.65858050')
    })
  })

  describe('formatDMSCoordinate', () => {
    it('座標をDMS形式でフォーマットする', () => {
      const result = formatDMSCoordinate(35.6585805, 139.7454329)
      expect(result).toContain('北緯')
      expect(result).toContain('東経')
      expect(result).toMatch(/\d+°\d+'\d+\.\d+"/)
    })
  })

  describe('formatWaypointList', () => {
    it('Waypointリストを10進数形式でフォーマットする', () => {
      const waypoints = [
        { index: 1, lat: 35.6585805, lng: 139.7454329 },
        { index: 2, lat: 35.6595805, lng: 139.7464329 }
      ]
      const result = formatWaypointList(waypoints, 'decimal')
      expect(result).toContain('WP1:')
      expect(result).toContain('WP2:')
      expect(result).toContain('139.7454329')
    })

    it('WaypointリストをDMS形式でフォーマットする', () => {
      const waypoints = [
        { index: 1, lat: 35.6585805, lng: 139.7454329 }
      ]
      const result = formatWaypointList(waypoints, 'dms')
      expect(result).toContain('WP1:')
      expect(result).toContain('北緯')
      expect(result).toContain('東経')
    })

    it('Waypointリストが空の場合は「Waypointなし」を返す', () => {
      expect(formatWaypointList([], 'decimal')).toBe('Waypointなし')
      expect(formatWaypointList(null, 'decimal')).toBe('Waypointなし')
    })
  })

  describe('copyToClipboard', () => {
    it('クリップボードにテキストをコピーする', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      })

      const result = await copyToClipboard('test text')
      expect(result).toBe(true)
      expect(writeTextMock).toHaveBeenCalledWith('test text')
    })

    it('クリップボードAPIが失敗した場合はフォールバックを使用する', async () => {
      // Mock clipboard API failure
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard API not available'))
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      })

      // Mock execCommand
      document.execCommand = vi.fn().mockReturnValue(true)

      const result = await copyToClipboard('test text')
      expect(result).toBe(true)
    })
  })
})
