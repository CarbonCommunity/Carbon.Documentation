import { IStorageAsync } from './i-storage'

export class SimpleIndexDB implements IStorageAsync {
  private dbPromise: Promise<IDBDatabase>
  private objStoreName: string = 'cache'

  constructor(dbName: string, version: number) {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.objStoreName)) {
          db.createObjectStore(this.objStoreName)
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          console.warn('Database is outdated, please reload the page.')
        }
        resolve(db)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.objStoreName, 'readwrite')
      tx.objectStore(this.objStoreName).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async setItemsBatched<T>(items: [key: string, value: T][]): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.objStoreName, 'readwrite')
      const store = tx.objectStore(this.objStoreName)
      items.forEach(([key, value]) => {
        store.put(value, key)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getItem<T>(key: string): Promise<T | null> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.objStoreName)
      const request = tx.objectStore(this.objStoreName).get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.objStoreName, 'readwrite')
      tx.objectStore(this.objStoreName).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
