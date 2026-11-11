export interface IStorageAsync {
  setItem<T>(key: string, value: T): Promise<void>
  setItemsBatched<T>(items: [key: string, value: T][]): Promise<void>
  getItem<T>(key: string): Promise<T | null>
  removeItem(key: string): Promise<void>
}
