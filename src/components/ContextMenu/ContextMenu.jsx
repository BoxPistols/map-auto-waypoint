/**
 * Context Menu Component
 * Google Maps-style right-click context menu
 * Adapted from DIDinJapan2026
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './ContextMenu.module.scss'

/**
 * Calculate menu position with viewport boundary detection
 */
const calculatePosition = (clickX, clickY, menuWidth, menuHeight) => {
  const MARGIN = 8
  const maxX = window.innerWidth - MARGIN
  const maxY = window.innerHeight - MARGIN

  let left = clickX
  let top = clickY

  if (left + menuWidth > maxX) {
    left = maxX - menuWidth
  }

  if (top + menuHeight > maxY) {
    top = maxY - menuHeight
  }

  return {
    left: Math.max(MARGIN, left),
    top: Math.max(MARGIN, top)
  }
}

const MENU_CLOSE_DELAY = 2000

/**
 * Context Menu Item Component
 */
const MenuItem = ({ item, onAction }) => {
  if (item.divider) {
    return <div className={styles.divider} />
  }

  if (item.type === 'header') {
    return <div className={styles.header}>{item.label}</div>
  }

  if (item.type === 'info') {
    return (
      <div className={styles.infoSection}>
        {item.label && <div className={styles.infoLabel}>{item.label}</div>}
        {item.content && (
          typeof item.content === 'string' 
            ? <pre>{item.content}</pre>
            : item.content
        )}
      </div>
    )
  }

  return (
    <div
      className={`${styles.item} ${item.disabled ? styles.disabled : ''} ${item.danger ? styles.danger : ''}`}
      onClick={() => {
        if (!item.disabled && item.action) {
          onAction(item.action, item.data)
        }
      }}
    >
      <div className={styles.itemContent}>
        {item.icon && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.label}>{item.label}</span>
        {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
      </div>
    </div>
  )
}

/**
 * Context Menu Component
 */
export const ContextMenu = ({
  isOpen,
  position,
  menuItems,
  onClose,
  onAction,
  title
}) => {
  const menuRef = useRef(null)
  const [calculatedPos, setCalculatedPos] = useState({ left: 0, top: 0 })
  const menuCloseTimerRef = useRef(null)

  const clearMenuCloseTimer = useCallback(() => {
    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current)
      menuCloseTimerRef.current = null
    }
  }, [])

  const handleMenuMouseEnter = useCallback(() => {
    clearMenuCloseTimer()
  }, [clearMenuCloseTimer])

  const handleMenuMouseLeave = useCallback(() => {
    clearMenuCloseTimer()
    menuCloseTimerRef.current = setTimeout(() => {
      onClose()
      menuCloseTimerRef.current = null
    }, MENU_CLOSE_DELAY)
  }, [clearMenuCloseTimer, onClose])

  useEffect(() => {
    return () => {
      clearMenuCloseTimer()
    }
  }, [clearMenuCloseTimer])

  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const raf = requestAnimationFrame(() => {
      const rect = menuRef.current?.getBoundingClientRect()
      if (rect) {
        const newPos = calculatePosition(
          position.x,
          position.y,
          rect.width,
          rect.height
        )
        setCalculatedPos(newPos)
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [isOpen, position])

  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        clearMenuCloseTimer()
        onClose()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick, true)
    return () => document.removeEventListener('mousedown', handleOutsideClick, true)
  }, [isOpen, onClose, clearMenuCloseTimer])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        clearMenuCloseTimer()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, clearMenuCloseTimer])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className={styles.container}
      style={{
        position: 'fixed',
        left: `${calculatedPos.left}px`,
        top: `${calculatedPos.top}px`,
        zIndex: 10000
      }}
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
    >
      <div className={styles.menu}>
        {title && <div className={styles.menuTitle}>{title}</div>}
        {menuItems.map((item, index) => (
          <MenuItem
            key={item.id || index}
            item={item}
            onAction={(action, data) => {
              clearMenuCloseTimer()
              onAction(action, data)
              onClose()
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default ContextMenu
