import { useState, useMemo, useRef, useEffect } from 'react'
import { MapPin, Plane, X, Square, Circle, ChevronDown } from 'lucide-react'
import { searchAddress, debounce } from '../../services/geocoding'
import { POLYGON_SIZE_OPTIONS, POLYGON_SHAPE_OPTIONS } from '../../services/polygonGenerator'
import styles from './SearchForm.module.scss'

const SearchForm = ({ onSearch, onSelect, onGeneratePolygon }) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedSize, setSelectedSize] = useState('medium')
  const [selectedShape, setSelectedShape] = useState('rectangle')
  const [customRadius, setCustomRadius] = useState(100)
  const [useCustomSize, setUseCustomSize] = useState(false)
  const [waypointCount, setWaypointCount] = useState(8)
  const [lastSearchResult, setLastSearchResult] = useState(null)
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const debouncedSearch = useMemo(
    () =>
      debounce(async (value) => {
        if (value.length < 2) {
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        setIsLoading(true)
        const results = await searchAddress(value)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setSelectedIndex(-1)
        setIsLoading(false)
      }, 500),
    []
  )

  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    setLastSearchResult(null)
    debouncedSearch(value)
  }

  const handleSelect = (suggestion) => {
    setQuery(suggestion.displayName)
    setShowSuggestions(false)
    setSuggestions([])
    setLastSearchResult(suggestion)
    onSelect?.(suggestion)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isComposing) return

    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex])
    } else if (query.trim()) {
      onSearch?.(query.trim())
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setLastSearchResult(null)
    inputRef.current?.focus()
  }

  const handleGeneratePolygon = () => {
    if (lastSearchResult && onGeneratePolygon) {
      const options = useCustomSize
        ? { customRadius, shape: selectedShape, waypointCount }
        : { size: selectedSize, shape: selectedShape, waypointCount }
      onGeneratePolygon(lastSearchResult, options)
    }
  }

  const handleRadiusChange = (e) => {
    setCustomRadius(Number(e.target.value))
    setUseCustomSize(true)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={styles.searchForm}>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="住所・建物名を検索"
            className={styles.input}
            autoComplete="off"
          />
          {isLoading && <span className={styles.spinner} />}
          {query && !isLoading && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              aria-label="クリア"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul ref={suggestionsRef} className={styles.suggestions}>
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.lat}-${suggestion.lng}`}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.selected : ''
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className={styles.suggestionName}>
                {suggestion.displayName.split(',')[0]}
              </span>
              <span className={styles.suggestionAddress}>
                {suggestion.displayName}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Polygon generation panel */}
      {lastSearchResult && (
        <div
          className={`${styles.generatePanel} ${
            !isPanelExpanded ? styles.collapsed : ''
          }`}
        >
          <div
            className={styles.panelHeader}
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          >
            <div className={styles.selectedLocation}>
              <MapPin size={16} className={styles.locationIcon} />
              <span className={styles.locationName}>
                {lastSearchResult.displayName.split(',')[0]}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`${styles.chevron} ${
                isPanelExpanded ? styles.expanded : ''
              }`}
            />
          </div>

          {isPanelExpanded && (
            <div className={styles.panelContent}>
              <div className={styles.optionsRow}>
                <div className={styles.shapeSelector}>
                  <label>形状:</label>
                  <div className={styles.shapeButtons}>
                    {POLYGON_SHAPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.shapeButton} ${
                          selectedShape === option.value ? styles.active : ''
                        }`}
                        onClick={() => setSelectedShape(option.value)}
                      >
                        {option.value === 'rectangle' ? (
                          <Square size={14} />
                        ) : (
                          <Circle size={14} />
                        )}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.sizeSelector}>
                  <label>サイズ:</label>
                  <div className={styles.shapeButtons}>
                    {POLYGON_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.shapeButton} ${
                          !useCustomSize && selectedSize === option.value
                            ? styles.active
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedSize(option.value)
                          setUseCustomSize(false)
                        }}
                      >
                        <Plane size={14} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.customSizeControls}>
                <label className={styles.customSizeToggle}>
                  <input
                    type="checkbox"
                    checked={useCustomSize}
                    onChange={(e) => setUseCustomSize(e.target.checked)}
                  />
                  カスタムサイズを使用
                </label>
                <div className={styles.customSizeFields}>
                  <div className={styles.customRadius}>
                    <label>半径: {customRadius}m</label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      step="10"
                      value={customRadius}
                      onChange={handleRadiusChange}
                    />
                  </div>
                  <div className={styles.waypointCount}>
                    <label>Waypoint数</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={waypointCount}
                      onChange={(e) =>
                        setWaypointCount(Number(e.target.value) || 8)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.panelFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setLastSearchResult(null)}
                >
                  クリア
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleGeneratePolygon}
                >
                  エリアを生成
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchForm
