/**
 * useMapSelection テスト
 *
 * Shift+ドラッグで選択ボックスを開始した後、マウスが canvas 外に出た
 * 状態でボタンを離すと isSelecting が固着し、dragPan（!isSelecting）が
 * 永久に無効化されるバグの回帰テスト。
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapSelection } from './useMapSelection'

const createMockMapRef = () => ({
  current: {
    getMap: () => ({
      project: () => ({ x: 0, y: 0 }),
    }),
  },
})

const createShiftMouseEvent = (clientX, clientY) => ({
  originalEvent: { shiftKey: true, clientX, clientY },
  target: {
    getCanvas: () => ({
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    }),
  },
})

describe('useMapSelection', () => {
  it('canvas内でonMouseUpを受け取ると選択状態を正しく終了する（正常系）', () => {
    const mapRef = createMockMapRef()
    const { result } = renderHook(() =>
      useMapSelection({ mapRef, waypoints: [], drawMode: false, editingPolygon: null })
    )

    act(() => {
      result.current.handlers.onMouseDown(createShiftMouseEvent(10, 10))
    })
    expect(result.current.isSelecting).toBe(true)

    act(() => {
      result.current.handlers.onMouseUp()
    })
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.selectionBox).toBeNull()
  })

  it('canvas外でマウスアップされ、canvasのonMouseUpが発火しなくても、windowのmouseupで選択状態が解除される（フェイルセーフ）', () => {
    const mapRef = createMockMapRef()
    const { result } = renderHook(() =>
      useMapSelection({ mapRef, waypoints: [], drawMode: false, editingPolygon: null })
    )

    act(() => {
      result.current.handlers.onMouseDown(createShiftMouseEvent(10, 10))
    })
    expect(result.current.isSelecting).toBe(true)

    // canvas上のonMouseUpは発火しない状態を模し、windowのnative mouseupだけを発火させる
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(result.current.isSelecting).toBe(false)
    expect(result.current.selectionBox).toBeNull()
  })

  it('選択中でない間はwindowのmouseupを購読しない（不要なリスナー登録を避ける）', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const mapRef = createMockMapRef()
    renderHook(() =>
      useMapSelection({ mapRef, waypoints: [], drawMode: false, editingPolygon: null })
    )

    const mouseupCalls = addSpy.mock.calls.filter(([type]) => type === 'mouseup')
    expect(mouseupCalls.length).toBe(0)
    addSpy.mockRestore()
  })
})
