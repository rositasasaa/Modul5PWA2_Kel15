// ---------------------------------------------------------------------------
// queryCache.js — Simple in-memory query cache with TTL (Time To Live).
//
// Challenge 4: Query Caching
// Cache API responses agar tidak perlu fetch ulang data yang sama berulang kali.
// Setiap entry punya TTL (default 5 menit) setelah itu akan expired otomatis.
// ---------------------------------------------------------------------------

class QueryCache {
  constructor(defaultTTL = 5 * 60 * 1000) {
    // Map untuk menyimpan cache: key -> { data, timestamp, ttl }
    this.cache = new Map()
    // Default TTL 5 menit (dalam milidetik)
    this.defaultTTL = defaultTTL
  }

  /**
   * Membuat cache key dari endpoint dan params
   * @param {string} key - identifier unik untuk query
   * @param {Object} params - parameter tambahan untuk membedakan query
   * @returns {string} - cache key yang sudah di-serialize
   */
  _makeKey(key, params = {}) {
    return `${key}::${JSON.stringify(params)}`
  }

  /**
   * Mengambil data dari cache jika masih valid (belum expired)
   * @param {string} key - identifier query
   * @param {Object} params - parameter query
   * @returns {any|null} - data dari cache atau null jika expired/tidak ada
   */
  get(key, params = {}) {
    const cacheKey = this._makeKey(key, params)
    const entry = this.cache.get(cacheKey)

    if (!entry) return null

    // Cek apakah cache sudah expired berdasarkan TTL
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, hapus entry
      this.cache.delete(cacheKey)
      return null
    }

    return entry.data
  }

  /**
   * Menyimpan data ke cache dengan TTL
   * @param {string} key - identifier query
   * @param {Object} params - parameter query
   * @param {any} data - data yang akan di-cache
   * @param {number} ttl - Time To Live dalam milidetik (opsional)
   */
  set(key, params = {}, data, ttl) {
    const cacheKey = this._makeKey(key, params)
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  /**
   * Menghapus cache tertentu
   * @param {string} key - identifier query
   * @param {Object} params - parameter query
   */
  invalidate(key, params = {}) {
    const cacheKey = this._makeKey(key, params)
    this.cache.delete(cacheKey)
  }

  /**
   * Menghapus semua cache yang key-nya dimulai dengan prefix tertentu.
   * Berguna saat data berubah (create/update/delete) untuk invalidasi semua
   * query yang berhubungan.
   * @param {string} prefix - awalan key yang akan di-invalidasi
   */
  invalidateByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Membersihkan seluruh cache
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Mendapatkan jumlah entry yang ada di cache
   */
  get size() {
    return this.cache.size
  }
}

// Singleton instance — digunakan di seluruh aplikasi
const queryCache = new QueryCache()

export default queryCache
