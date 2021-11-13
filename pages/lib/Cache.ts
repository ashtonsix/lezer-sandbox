export type Key = [any, any?, any?, any?, any?, any?, any?, any?, ...any]

export class Cache<K extends Key, V = any> {
  maxSize = 256
  cache = [] as {key: K; hits: number; value: any}[]
  get(key: K): V {
    // this is O(NM), and could be made O(M) with a tree of maps
    let entry = this.cache.find((c) => c.key.every((k, i) => key[i] === k))
    if (!entry) return
    entry.hits++
    return entry.value
  }
  set(key: K, value: V) {
    this.delete(key)
    if (this.cache.length >= this.maxSize) this.halve()
    let entry = {key, hits: 0, value}
    this.cache.push(entry)
  }
  delete(key: K) {
    let entry = this.cache.findIndex((c) => c.key.every((k, i) => key[i] === k))
    if (entry !== -1) this.cache.splice(entry, 1)
  }
  halve() {
    this.cache.sort((a, b) => a.hits - b.hits)
    this.cache.splice(0, Math.floor(this.cache.length / 2))
    for (let i in this.cache) this.cache[i].hits = 0
  }
}

export class CacheWithGetter<K extends Key, V = any> {
  cache: Cache<K, Promise<{value: V; error: any}>>
  getter: (...key: K) => Promise<V>
  defaultValue: V
  constructor(getter: (...key: K) => Promise<V>, defaultValue: V = null) {
    this.cache = new Cache()
    this.getter = getter
    this.defaultValue = defaultValue
  }
  get(key: K) {
    let value = this.cache.get(key)
    if (!value) {
      value = this.getter(...key)
        .then((value) => ({value: value ?? this.defaultValue, error: null}))
        .catch((error) => {
          console.error(error)
          return {value: this.defaultValue, error}
        })
        .then((result) => ((value as any).result = result))
      this.cache.set(key, value)
    }
    return value
  }
}
