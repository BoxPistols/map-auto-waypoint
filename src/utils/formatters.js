/**
 * Formatting utilities for coordinates, dates, and other data
 */

/**
 * Convert Unix timestamp to JST (Asia/Tokyo) formatted string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Formatted date string in JST
 */
export const formatDateToJST = (timestamp) => {
  if (!timestamp) return '日時未設定'
  
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.error('Date formatting error:', error)
    return '日時エラー'
  }
}

/**
 * Convert decimal degrees to DMS (Degrees Minutes Seconds)
 * @param {number} decimal - Decimal degrees
 * @param {boolean} isLat - true for latitude, false for longitude
 * @returns {string} - Formatted DMS string
 */
export const formatDMS = (decimal, isLat) => {
  const absolute = Math.abs(decimal)
  const degrees = Math.floor(absolute)
  const minutesDecimal = (absolute - degrees) * 60
  const minutes = Math.floor(minutesDecimal)
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2)
  
  const direction = isLat
    ? (decimal >= 0 ? '北緯' : '南緯')
    : (decimal >= 0 ? '東経' : '西経')
  
  return `${direction}${degrees}°${minutes}'${seconds}"`
}

/**
 * Format coordinate as decimal string
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} - Formatted coordinate string
 */
export const formatDecimalCoordinate = (lat, lng) => {
  return `${lng.toFixed(8)}, ${lat.toFixed(8)}`
}

/**
 * Format coordinate as DMS string
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} - Formatted DMS coordinate string
 */
export const formatDMSCoordinate = (lat, lng) => {
  return `${formatDMS(lat, true)} ${formatDMS(lng, false)}`
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Clipboard copy failed:', error)
    
    // Fallback method for older browsers
    // Note: execCommand is deprecated but may still work in some browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      // Try to copy using the deprecated method
      const successful = document.execCommand('copy')
      textArea.remove()
      
      if (successful) {
        return true
      }
      
      console.warn('Clipboard fallback failed')
      return false
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError)
      return false
    }
  }
}

/**
 * Format waypoint list for display
 * @param {Array} waypoints - Waypoint array
 * @param {string} format - 'decimal' or 'dms'
 * @param {string} polygonName - Optional polygon name to include at the top
 * @returns {string} - Formatted waypoint list
 */
export const formatWaypointList = (waypoints, format = 'decimal', polygonName = null) => {
  if (!waypoints || waypoints.length === 0) {
    return 'Waypointなし'
  }
  
  const waypointList = waypoints
    .map(wp => {
      const coord = format === 'dms'
        ? formatDMSCoordinate(wp.lat, wp.lng)
        : formatDecimalCoordinate(wp.lat, wp.lng)
      return `WP${wp.index}: ${coord}`
    })
    .join('\n')
  
  // Include polygon name at the top if provided
  if (polygonName) {
    return `【${polygonName}】\n${waypointList}`
  }
  
  return waypointList
}

/**
 * Format waypoint list as CSV for Excel
 * @param {Array} waypoints - Waypoint array
 * @param {string} format - 'decimal' or 'dms'
 * @param {string} polygonName - Polygon name to include in each row
 * @returns {string} - CSV formatted waypoint list
 */
export const formatWaypointListCSV = (waypoints, format = 'decimal', polygonName = '') => {
  if (!waypoints || waypoints.length === 0) {
    return 'Waypointなし'
  }
  
  return waypoints
    .map(wp => {
      if (format === 'dms') {
        const dms = formatDMSCoordinate(wp.lat, wp.lng)
        // Split "北緯35°52'37.43" 東経139°40'9.55"" into lat and lng
        const [lat, lng] = dms.split(' ')
        return `${polygonName},WP${wp.index},${lat},${lng}`
      } else {
        const decimal = formatDecimalCoordinate(wp.lat, wp.lng)
        // Split "35.877064, 139.669321" into lat and lng
        const [lat, lng] = decimal.split(', ')
        return `${polygonName},WP${wp.index},${lat},${lng}`
      }
    })
    .join('\n')
}
