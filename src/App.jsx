import { useEffect } from 'react'
import { DroneDataProvider } from './contexts/DroneDataContext'
import MainLayout from './components/MainLayout/MainLayout'
import './App.scss'

function App() {
  // ツールチップの遅延制御
  useEffect(() => {
    let timeoutId
    let isTooltipActive = false

    const handleMouseEnter = () => {
      if (!isTooltipActive) {
        isTooltipActive = true
        document.documentElement.style.setProperty('--tooltip-delay', '0s')
      }
      clearTimeout(timeoutId)
    }

    const handleMouseLeave = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        isTooltipActive = false
        document.documentElement.style.setProperty('--tooltip-delay', '2s')
      }, 2000) // 2秒間ホバーがなければリセット
    }

    // イベントリスナーを動的に追加（MutationObserver使用）
    const observer = new MutationObserver(() => {
      const tooltipElements = document.querySelectorAll('[data-tooltip]')
      tooltipElements.forEach(el => {
        if (!el.dataset.tooltipListenerAdded) {
          el.dataset.tooltipListenerAdded = 'true'
          el.addEventListener('mouseenter', handleMouseEnter)
          el.addEventListener('mouseleave', handleMouseLeave)
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 初期化
    const tooltipElements = document.querySelectorAll('[data-tooltip]')
    tooltipElements.forEach(el => {
      el.dataset.tooltipListenerAdded = 'true'
      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mouseleave', handleMouseLeave)
    })

    return () => {
      observer.disconnect()
      clearTimeout(timeoutId)
      const tooltipElements = document.querySelectorAll('[data-tooltip]')
      tooltipElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
        delete el.dataset.tooltipListenerAdded
      })
    }
  }, [])

  return (
    <DroneDataProvider>
      <MainLayout />
    </DroneDataProvider>
  )
}

export default App