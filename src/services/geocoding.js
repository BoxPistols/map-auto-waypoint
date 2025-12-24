const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

// Search for addresses (forward geocoding)
export const searchAddress = async (query, options = {}) => {
  if (!query || query.trim().length < 2) {
    return []
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: 1,
    limit: options.limit || 5,
    'accept-language': 'ja',
    countrycodes: options.country || 'jp'
  })

  try {
    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'DroneWaypointApp/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`)
    }

    const results = await response.json()

    return results.map(r => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
      importance: r.importance,
      address: r.address,
      boundingBox: r.boundingbox?.map(Number)
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

// Reverse geocode (coordinates to address)
export const reverseGeocode = async (lat, lng) => {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: 1,
    'accept-language': 'ja'
  })

  try {
    const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'DroneWaypointApp/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`)
    }

    const result = await response.json()

    if (result.error) {
      return null
    }

    return {
      displayName: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.address
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

// Debounce helper
export const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Format address for display
export const formatAddress = (address) => {
  if (!address) return ''

  const parts = []

  // Japanese address format: prefecture > city > town > detail
  if (address.state) parts.push(address.state)
  if (address.city) parts.push(address.city)
  if (address.town) parts.push(address.town)
  if (address.suburb) parts.push(address.suburb)
  if (address.road) parts.push(address.road)
  if (address.house_number) parts.push(address.house_number)

  return parts.join(' ')
}
