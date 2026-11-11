import { CacheOptions, cache } from './cache'

export async function fetchApiCaching<T, K = unknown>(
  url: string,
  itemTtl: number,
  callbackFormatDataFromRemote?: (data: K) => T,
  options?: CacheOptions
): Promise<{ data: T; isFromCache: boolean }> {
  const cached = (await cache.getFromCache(url, itemTtl, options)) as T | null
  if (cached) {
    return { data: cached, isFromCache: true }
  }
  try {
    const response = await fetch(url)
    let data = await response.json()
    if (callbackFormatDataFromRemote) {
      data = callbackFormatDataFromRemote(data)
    }
    cache.saveToCache(url, data, options)
    return { data, isFromCache: false }
  } catch (error) {
    console.error('Error fetching data from', url, error)
    throw error
  }
}
