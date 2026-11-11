import { IStorageAsync } from '../shared/i-storage'
import { SimpleIndexDB } from '../shared/simple-index-db'
import { isClientSide } from '../shared/utils'
import { CACHE_TIME_VERSION_FETCH_DELAY, URL_VERSION_DOCS } from './constants'

interface CacheItem<T> {
  versionId: string
  timestampCreated: number
  data: T
}

class DummyStorage implements IStorageAsync {
  async setItem(): Promise<void> {
    return
  }

  async setItemsBatched(): Promise<void> {
    return
  }

  async getItem<T>(): Promise<T | null> {
    return null
  }

  async removeItem(): Promise<void> {
    return
  }
}

class VersionManager {
  private versions = new Map<string, { versionId: string; timestamp: number }>()
  private pendingFetches = new Map<string, Promise<string>>()

  public async getVersion(url: string | undefined): Promise<string> {
    if (!url) {
      return 'no-url'
    }

    if (!isClientSide()) {
      return 'ssr'
    }

    const cached = this.versions.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_TIME_VERSION_FETCH_DELAY) {
      return cached.versionId
    }

    const pending = this.pendingFetches.get(url)
    if (pending) {
      return pending
    }

    const fetchPromise = (async () => {
      try {
        let abortController: AbortController | null = null
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        // Use AbortController where available to implement a 3-second timeout
        if (typeof AbortController !== 'undefined') {
          abortController = new AbortController()
          timeoutId = setTimeout(() => abortController?.abort(), 7_000)
        }

        const response = await fetch(url, {
          cache: 'no-cache',
          signal: abortController?.signal,
        })

        if (timeoutId) clearTimeout(timeoutId)
        if (!response.ok) {
          throw new Error(`Failed to fetch version: ${response.status} ${response.statusText}`)
        }
        const versionId = await response.text()
        this.versions.set(url, { versionId, timestamp: Date.now() })
        return versionId
      } catch (error) {
        console.warn(`Error fetching version from ${url}:`, error)
        if (cached) {
          return cached.versionId // Return stale version on error
        }
        throw error // Rethrow if no cached version is available
      } finally {
        this.pendingFetches.delete(url)
      }
    })()

    this.pendingFetches.set(url, fetchPromise)
    return fetchPromise
  }
}

export interface CacheOptions {
  versionUrl?: string
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  versionUrl: URL_VERSION_DOCS,
}

class Cache {
  private cacheMap = new Map<string, CacheItem<unknown>>()
  private storage: IStorageAsync
  private versionManager: VersionManager
  private pendingStorageWrites = new Map<string, CacheItem<unknown>>()
  private storageWriteTimeout: ReturnType<typeof setTimeout> | null = null
  private isDoneCleaningUpOldEntries = false

  constructor(storage: IStorageAsync, versionManager: VersionManager) {
    this.storage = storage
    this.versionManager = versionManager
    this.cleanUpOldEntries()

    // Ensure we don't lose writes if the user navigates away before the debounce timer fires
    if (isClientSide()) {
      // pagehide is preferred over beforeunload because it also fires on bfcache
      window.addEventListener('pagehide', () => {
        if (this.pendingStorageWrites.size > 0) {
          // Fire-and-forget – we cannot await during page unload
          this.flushStorageWrites()
        }
      })
    }
  }

  private scheduleStorageWrite(): void {
    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout)
    }
    this.storageWriteTimeout = setTimeout(() => this.flushStorageWrites(), 230)
  }

  private async flushStorageWrites(): Promise<void> {
    if (this.pendingStorageWrites.size === 0) {
      this.storageWriteTimeout = null
      return
    }

    const batch = this.pendingStorageWrites
    this.pendingStorageWrites = new Map()
    this.storageWriteTimeout = null

    try {
      await this.storage.setItemsBatched(Array.from(batch.entries()))
    } catch (err) {
      console.warn('Failed to write cache batch, will retry later', err)
      batch.forEach((value, key) => this.pendingStorageWrites.set(key, value))
    }
  }

  private isCacheItemValid<T>(item: CacheItem<T>, itemTtl: number, currentVersionId: string): boolean {
    return item.versionId === currentVersionId && Date.now() - item.timestampCreated <= itemTtl
  }

  private validateCacheItem<T>(item: unknown): item is CacheItem<T> {
    const isObject = typeof item === 'object' && item !== null
    if (!isObject) {
      return false
    }

    return (
      'versionId' in item &&
      'timestampCreated' in item &&
      'data' in item &&
      typeof (item as CacheItem<T>).versionId === 'string' &&
      typeof (item as CacheItem<T>).timestampCreated === 'number'
    )
  }

  private cleanUpOldEntries(): void {
    if (this.isDoneCleaningUpOldEntries || !isClientSide()) {
      return
    }
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('CST2_') || key.startsWith('carbon_docs_cache_'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Error cleaning up old cache entries:', error)
    } finally {
      this.isDoneCleaningUpOldEntries = true
    }
  }

  public async saveToCache<T>(id: string, data: T, options: CacheOptions = {}): Promise<void> {
    const mergedOptions = { ...DEFAULT_CACHE_OPTIONS, ...options }
    const { versionUrl } = mergedOptions
    const versionId = await this.versionManager.getVersion(versionUrl)

    const cacheItem: CacheItem<T> = {
      data,
      timestampCreated: Date.now(),
      versionId,
    }

    this.cacheMap.set(id, cacheItem)
    this.pendingStorageWrites.set(id, cacheItem)
    this.scheduleStorageWrite()
  }

  public async getFromCache<T>(id: string, itemTtl: number, options: CacheOptions = {}): Promise<T | null> {
    const mergedOptions = { ...DEFAULT_CACHE_OPTIONS, ...options }
    const { versionUrl } = mergedOptions
    const currentVersionId = await this.versionManager.getVersion(versionUrl)

    const itemFromMemory = this.cacheMap.get(id) as CacheItem<T> | undefined
    if (itemFromMemory && this.isCacheItemValid(itemFromMemory, itemTtl, currentVersionId)) {
      return itemFromMemory.data
    }

    const itemFromStorage = await this.storage.getItem<CacheItem<T>>(id)
    if (itemFromStorage) {
      if (!this.validateCacheItem(itemFromStorage)) {
        console.warn('Invalid item in storage:', itemFromStorage)
        await this.storage.removeItem(id)
        return null
      }

      this.cacheMap.set(id, itemFromStorage)
      if (this.isCacheItemValid(itemFromStorage, itemTtl, currentVersionId)) {
        return itemFromStorage.data
      }
    }

    this.cacheMap.delete(id)
    this.storage.removeItem(id).catch((err) => console.warn(`Failed to remove item ${id}`, err))
    return null
  }
}

let storage: IStorageAsync
if (isClientSide() && typeof indexedDB !== 'undefined') {
  try {
    storage = new SimpleIndexDB('docsCache', 1)
  } catch (err) {
    console.warn('Failed to initialize IndexedDB, falling back to in-memory storage', err)
    storage = new DummyStorage()
  }
} else {
  storage = new DummyStorage()
}

const versionManager = new VersionManager()
export const cache = new Cache(storage, versionManager)
