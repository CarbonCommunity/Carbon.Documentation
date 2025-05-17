import { CACHE_TIME_ITEM_TTL, CACHE_TIME_VERSION_FETCH_DELAY, URL_VERSION_DOCS } from '../api/constants'

interface CacheItem<T> {
  versionId: string
  timestampCreated: number
  data: T
}

class Cache {
  private cacheMap: Map<string, CacheItem<unknown>> = new Map()
  private lastTimeFetchedCache: number = 0
  private currentCacheVersion: string = ''
  private versionFetchPromise: Promise<void> | null = null
  private pendingStorageWrites: Map<string, string> = new Map()
  private storageWriteTimeout: NodeJS.Timeout | null = null

  private encodeUrl(url: string): string {
    return 'CST2_' + btoa(encodeURIComponent(url))
  }

  private scheduleStorageWrite(): void {
    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout)
    }

    this.storageWriteTimeout = setTimeout(() => {
      this.flushStorageWrites()
    }, 1000)
  }

  private flushStorageWrites(): void {
    this.pendingStorageWrites.forEach((value, key) => {
      try {
        localStorage.setItem(key, value)
      } catch (e) {
        console.warn('Error saving to localStorage:', e)
      }
    })
    this.pendingStorageWrites.clear()
    this.storageWriteTimeout = null
  }

  private async tryUpdateCacheVersion(): Promise<void> {
    if (Date.now() - this.lastTimeFetchedCache <= CACHE_TIME_VERSION_FETCH_DELAY) {
      return
    }

    if (this.versionFetchPromise) {
      return this.versionFetchPromise
    }

    this.versionFetchPromise = (async () => {
      try {
        const resp = await fetch(URL_VERSION_DOCS, {
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000),
        })

        if (!resp.ok) {
          throw new Error(`Failed to fetch version: ${resp.status} ${resp.statusText}`)
        }

        this.currentCacheVersion = await resp.text()
        this.lastTimeFetchedCache = Date.now()
      } catch (e) {
        console.warn(`Error fetching ${URL_VERSION_DOCS}:`, e)
      } finally {
        this.versionFetchPromise = null
      }
    })()

    return this.versionFetchPromise
  }

  private isCacheItemValid<T>(item: CacheItem<T>): boolean {
    return (
      item.versionId === this.currentCacheVersion && Date.now() - item.timestampCreated <= CACHE_TIME_ITEM_TTL
    )
  }

  private getFromMemOrStorage<T>(id: string): CacheItem<T> | null {
    const itemFromMemory = this.cacheMap.get(id) as CacheItem<T>
    if (itemFromMemory) {
      return itemFromMemory
    }

    const stringFromStorage = localStorage.getItem(id)
    if (stringFromStorage) {
      try {
        const parsed = JSON.parse(stringFromStorage) as CacheItem<T>
        if (this.validateCacheItem(parsed)) {
          this.cacheMap.set(id, parsed)
          return parsed
        }
      } catch (e) {
        console.warn('Error parsing item from storage:', e)
      }
      localStorage.removeItem(id)
    }

    return null
  }

  private validateCacheItem<T>(item: unknown): item is CacheItem<T> {
    return (
      typeof item === 'object' &&
      item !== null &&
      'versionId' in item &&
      'timestampCreated' in item &&
      'data' in item &&
      typeof (item as CacheItem<T>).versionId === 'string' &&
      typeof (item as CacheItem<T>).timestampCreated === 'number'
    )
  }

  public saveToCache<T>(url: string, data: T): void {
    const id = this.encodeUrl(url)
    const cacheItem: CacheItem<T> = {
      data,
      timestampCreated: Date.now(),
      versionId: this.currentCacheVersion,
    }

    this.cacheMap.set(id, cacheItem)

    this.pendingStorageWrites.set(id, JSON.stringify(cacheItem))
    this.scheduleStorageWrite()
  }

  public async getFromCache<T>(url: string): Promise<T | null> {
    await this.tryUpdateCacheVersion()

    const id = this.encodeUrl(url)
    const cacheItem = this.getFromMemOrStorage<T>(id)

    if (cacheItem && this.isCacheItemValid(cacheItem)) {
      return cacheItem.data
    }

    this.cacheMap.delete(id)
    localStorage.removeItem(id)
    return null
  }
}

export const cache = new Cache()
