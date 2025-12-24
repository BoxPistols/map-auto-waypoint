import { useState, useCallback, useRef, useEffect } from 'react'
import { searchAddress, debounce } from '../../services/geocoding'
import { POLYGON_SIZE_OPTIONS } from '../../services/polygonGenerator'
import styles from './SearchForm.module.scss'

const SearchForm = ({ onSearch, onSelect, onGeneratePolygon }) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedSize, setSelectedSize] = useState('medium')
  const [lastSearchResult, setLastSearchResult] = useState(null)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (value) => {
      if (value.length < 2) {
        setSuggestions([])
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

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    setLastSearchResult(null)
    debouncedSearch(value)
  }

  // Handle suggestion select
  const handleSelect = (suggestion) => {
    setQuery(suggestion.displayName)
    setShowSuggestions(false)
    setSuggestions([])
    setLastSearchResult(suggestion)
    onSelect?.(suggestion)
  }

  // Handle form submit
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

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Clear input
  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setLastSearchResult(null)
    inputRef.current?.focus()
  }

  // Generate polygon from last search result
  const handleGeneratePolygon = () => {
    if (lastSearchResult && onGeneratePolygon) {
      onGeneratePolygon(lastSearchResult, { size: selectedSize })
    }
  }

  // Keyboard shortcut (Cmd+K / Ctrl+K)
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

  // Close suggestions when clicking outside
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
            placeholder="住所・建物名を検索 (Ctrl+K)"
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
              ×
            </button>
          )}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul ref={suggestionsRef} className={styles.suggestions}>
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.lat}-${suggestion.lng}`}
              className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
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

      {/* Polygon generation panel - shown after selecting a location */}
      {lastSearchResult && (
        <div className={styles.generatePanel}>
          <div className={styles.selectedLocation}>
            <span className={styles.locationIcon}>📍</span>
            <span className={styles.locationName}>
              {lastSearchResult.displayName.split(',')[0]}
            </span>
          </div>

          <div className={styles.sizeSelector}>
            <label>エリアサイズ:</label>
            <div className={styles.sizeButtons}>
              {POLYGON_SIZE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.sizeButton} ${selectedSize === option.value ? styles.active : ''}`}
                  onClick={() => setSelectedSize(option.value)}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGeneratePolygon}
          >
            🛸 この周辺にエリア生成
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchForm
