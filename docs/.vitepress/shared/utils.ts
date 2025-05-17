const VERSION_CHECK_URL = 'https://api.carbonmod.gg/version/?id=docs'
const VERSION_CACHE_KEY = 'carbon_data_version'

export async function checkDataVersion(): Promise<boolean> {
  try {
    // Get cached version
    const cachedVersion = localStorage.getItem(VERSION_CACHE_KEY)

    // Fetch current version
    const response = await fetch(VERSION_CHECK_URL)
    if (!response.ok) throw new Error('Failed to fetch version')
    const currentVersion = await response.text()
    
    // If no cached version or versions don't match, update cache
    if (!cachedVersion || cachedVersion !== currentVersion) {
      localStorage.setItem(VERSION_CACHE_KEY, currentVersion)
      return true // Force update needed
    }

    return false // No update needed
  } catch (error) {
    console.error('Version check failed:', error)
    return false // On error, don't force update
  }
}

export function clearDataCache(cacheKey: string) {
  localStorage.removeItem(cacheKey)
  console.log(`Cleared cache for ${cacheKey}`)
}

export async function getCachedData<T>(cacheKey: string, fetchFn: () => Promise<T[]>): Promise<T[]> {
  try {
    // Check if we need to force update
    const needsUpdate = await checkDataVersion()

    // Get cached data
    const cached = localStorage.getItem(cacheKey)
    if (cached && !needsUpdate) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp <= 24 * 60 * 60 * 1000) { // 24 hours
        return data
      }
    }

    // Fetch fresh data
    const data = await fetchFn()
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))

    return data
  } catch (error) {
    console.error(`Failed to get cached data for ${cacheKey}:`, error)
    return []
  }
}
