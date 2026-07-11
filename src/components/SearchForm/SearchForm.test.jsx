/**
 * SearchForm テスト
 *
 * 「エリアを生成」パネルの誤操作を招く構造の回帰テスト:
 * - 生成後にパネルが閉じること（連打による意図しない複数生成を防止）
 * - カスタムサイズとプリセットサイズが同時に有効な状態にならないこと
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SearchForm from './SearchForm'
import { searchAddress } from '../../services/geocoding'

vi.mock('../../services/geocoding', async () => {
  const actual = await vi.importActual('../../services/geocoding')
  return {
    ...actual,
    searchAddress: vi.fn(),
  }
})

const mockSuggestion = {
  displayName: '中川, 北葛飾郡, 埼玉県, 日本',
  lat: 36.05,
  lng: 139.75,
  boundingBox: [35.9, 36.2, 139.6, 139.9],
}

const selectSuggestion = async () => {
  searchAddress.mockResolvedValue([mockSuggestion])
  fireEvent.change(screen.getByPlaceholderText(/住所・建物名を検索/), {
    target: { value: '中川' },
  })
  await waitFor(() => expect(searchAddress).toHaveBeenCalled())
  const item = await screen.findByText('中川')
  fireEvent.click(item)
}

describe('SearchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('候補を選択すると「エリアを生成」パネルが開く', async () => {
    render(<SearchForm onGeneratePolygon={vi.fn()} />)
    await selectSuggestion()
    expect(screen.getByText('エリアを生成')).toBeInTheDocument()
  })

  it('「エリアを生成」を押すとパネルが閉じ、連打しても1回しか生成されない', async () => {
    const onGeneratePolygon = vi.fn()
    render(<SearchForm onGeneratePolygon={onGeneratePolygon} />)
    await selectSuggestion()

    const generateButton = screen.getByText('エリアを生成')
    fireEvent.click(generateButton)

    expect(onGeneratePolygon).toHaveBeenCalledTimes(1)
    // パネルが閉じている（「エリアを生成」ボタンが消えている）ため、
    // 同じ操作を繰り返しても新規呼び出しは発生しない
    expect(screen.queryByText('エリアを生成')).not.toBeInTheDocument()
  })

  it('生成オプションにサイズ選択(size)が渡される', async () => {
    const onGeneratePolygon = vi.fn()
    render(<SearchForm onGeneratePolygon={onGeneratePolygon} />)
    await selectSuggestion()
    fireEvent.click(screen.getByText('エリアを生成'))

    expect(onGeneratePolygon).toHaveBeenCalledWith(
      mockSuggestion,
      expect.objectContaining({ size: 'medium' })
    )
  })

  it('カスタムサイズを有効にするとプリセットサイズボタンが無効化される', async () => {
    render(<SearchForm onGeneratePolygon={vi.fn()} />)
    await selectSuggestion()

    fireEvent.click(screen.getByLabelText('カスタムサイズを使用'))

    const presetButton = screen.getByText('中 (100m)').closest('button')
    expect(presetButton).toBeDisabled()
  })

  it('カスタムサイズが無効な間は半径スライダーが無効化される', async () => {
    render(<SearchForm onGeneratePolygon={vi.fn()} />)
    await selectSuggestion()

    const radiusSlider = screen.getByRole('slider')
    expect(radiusSlider).toBeDisabled()

    fireEvent.click(screen.getByLabelText('カスタムサイズを使用'))
    expect(radiusSlider).not.toBeDisabled()
  })

  it('カスタムサイズ有効時は生成オプションにuseCustomSizeとcustomRadiusが渡る', async () => {
    const onGeneratePolygon = vi.fn()
    render(<SearchForm onGeneratePolygon={onGeneratePolygon} />)
    await selectSuggestion()

    fireEvent.click(screen.getByLabelText('カスタムサイズを使用'))
    fireEvent.click(screen.getByText('エリアを生成'))

    expect(onGeneratePolygon).toHaveBeenCalledWith(
      mockSuggestion,
      expect.objectContaining({ useCustomSize: true, customRadius: 100 })
    )
  })

  it('候補表示中にEnterで検索すると先頭候補が選ばれ「エリアを生成」パネルが開く', async () => {
    const onSelect = vi.fn()
    render(<SearchForm onGeneratePolygon={vi.fn()} onSelect={onSelect} onSearch={vi.fn()} />)

    searchAddress.mockResolvedValue([mockSuggestion])
    const input = screen.getByPlaceholderText(/住所・建物名を検索/)
    fireEvent.change(input, { target: { value: '中川' } })
    await waitFor(() => expect(screen.getByText('中川')).toBeInTheDocument())

    // 候補をクリックせずEnter（矢印選択もしていない状態）
    fireEvent.submit(input.closest('form'))

    await waitFor(() => expect(screen.getByText('エリアを生成')).toBeInTheDocument())
    expect(onSelect).toHaveBeenCalledWith(mockSuggestion)
  })

  it('候補未表示でEnter検索した場合も即時検索して先頭候補でパネルが開く', async () => {
    const onSelect = vi.fn()
    const onSearch = vi.fn()
    render(<SearchForm onGeneratePolygon={vi.fn()} onSelect={onSelect} onSearch={onSearch} />)

    // debounce前にEnterするケースを模し、候補が未表示の状態で直接submit
    searchAddress.mockResolvedValue([mockSuggestion])
    const input = screen.getByPlaceholderText(/住所・建物名を検索/)
    // 候補を表示させずにqueryだけ設定するため、changeで値を入れた直後にsubmitを呼ぶ
    fireEvent.change(input, { target: { value: '中川' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => expect(screen.getByText('エリアを生成')).toBeInTheDocument())
    expect(onSelect).toHaveBeenCalledWith(mockSuggestion)
  })

  it('検索結果が0件のEnter時はonSearchにフォールバックする', async () => {
    const onSearch = vi.fn()
    render(<SearchForm onGeneratePolygon={vi.fn()} onSearch={onSearch} />)

    searchAddress.mockResolvedValue([])
    const input = screen.getByPlaceholderText(/住所・建物名を検索/)
    fireEvent.change(input, { target: { value: '存在しない場所' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('存在しない場所'))
    expect(screen.queryByText('エリアを生成')).not.toBeInTheDocument()
  })
})
