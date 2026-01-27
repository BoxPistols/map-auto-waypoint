/**
 * Date Formatting Utilities
 * Format dates to Tokyo timezone (JST UTC+9)
 */

/**
 * Format date to Tokyo time (JST UTC+9)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string (e.g., "2026-01-27 14:30:45 (JST)")
 */
export const formatTokyoTime = (date) => {
  if (!date) return '-'
  
  const d = new Date(date)
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '-'
  
  const options = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  
  const formatter = new Intl.DateTimeFormat('ja-JP', options)
  const parts = formatter.formatToParts(d)
  
  const year = parts.find(p => p.type === 'year')?.value || '0000'
  const month = parts.find(p => p.type === 'month')?.value || '00'
  const day = parts.find(p => p.type === 'day')?.value || '00'
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  const second = parts.find(p => p.type === 'second')?.value || '00'
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second} (JST)`
}
