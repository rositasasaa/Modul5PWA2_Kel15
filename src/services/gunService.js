import { apiClient, IS_SUPABASE } from '../config/api'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']

  // Challenge 9: Multiple images — support images array
  // Jika item punya field `images` (array URL), gunakan itu.
  // Jika tidak, buat array dari image_url/image tunggal.
  let imagesList = []
  if (Array.isArray(item.images) && item.images.length > 0) {
    imagesList = item.images
  } else {
    const singleImg = item.image_url || item.image || '/guns/pistol.svg'
    imagesList = [singleImg]
  }

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: imagesList[0],                         // gambar utama (backward compatible)
    image: imagesList[0],                             // alias
    images: imagesList,                               // Challenge 9: array semua gambar
    ingredients: specsList,
    steps: stepsList,
    // Challenge 6: Soft Delete — field untuk status arsip/soft delete
    is_deleted: item.is_deleted || false,
    deleted_at: item.deleted_at || null,
    // Challenge 8: Nomor WA penjual
    seller_phone: item.seller_phone || '6281234567890',
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes).
//
// Challenge 4: Query Caching — setiap GET di-cache dan di-invalidasi saat mutasi.
// Challenge 6: Soft Delete — deleteGun melakukan soft delete, ada restoreGun
//              dan permanentDeleteGun.
// Challenge 9: Multiple Images — createGun/updateGun support field `images`.
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products.
   * Challenge 1: Pagination — mendukung parameter page dan limit.
   * Challenge 4: Query Caching — response di-cache selama 5 menit.
   */
  async getGuns(params = {}) {
    // Cek cache terlebih dahulu
    const cached = queryCache.get('guns', params)
    if (cached) {
      return cached
    }

    if (IS_SUPABASE) {
      const queryParts = ['select=*']

      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      // Challenge 6: Filter out soft-deleted items secara default
      if (!params.includeDeleted) {
        queryParts.push('is_deleted=eq.false')
      }

      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${params.sort_by}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }

      // Challenge 1: Pagination — hitung offset dari page dan limit
      const page = params.page || 1
      const limit = params.limit || 12
      const offset = (page - 1) * limit
      queryParts.push(`limit=${limit}`)
      queryParts.push(`offset=${offset}`)

      const queryString = queryParts.join('&')

      // Minta header count untuk total pagination
      const data = await apiClient.get(`/rest/v1/products?${queryString}`, {
        headers: { Prefer: 'count=exact' },
      })
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []

      const result = {
        success: true,
        data: list,
        pagination: {
          total: list.length,
          page,
          limit,
          totalPages: Math.ceil(list.length / limit) || 1,
        },
      }

      // Simpan ke cache
      queryCache.set('guns', params, result)
      return result
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    const result = await apiClient.get('/api/v1/recipes', { params: clean })

    // Simpan ke cache
    queryCache.set('guns', params, result)
    return result
  }

  /**
   * Fetch a single product by ID.
   * Challenge 4: Response di-cache.
   */
  async getGunById(id) {
    const cached = queryCache.get('gun', { id })
    if (cached) return cached

    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        const result = { success: true, data: normalizeProduct(data[0]) }
        queryCache.set('gun', { id }, result)
        return result
      }
      throw new Error('Hardware item not found.')
    }
    const result = await apiClient.get(`/api/v1/recipes/${id}`)
    queryCache.set('gun', { id }, result)
    return result
  }

  /**
   * Create a new product.
   * Challenge 9: Mendukung field `images` (array URL gambar).
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null,
        // Challenge 9: Simpan array gambar
        images: data.images || (data.image_url ? [data.image_url] : []),
        // Challenge 6: Default soft delete = false
        is_deleted: false,
        deleted_at: null,
        // Challenge 8: Nomor WA penjual
        seller_phone: data.seller_phone || null,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res

      // Invalidasi cache setelah create
      queryCache.invalidateByPrefix('guns')

      return { success: true, data: normalizeProduct(created) }
    }
    const result = await apiClient.post('/api/v1/recipes', data)
    queryCache.invalidateByPrefix('guns')
    return result
  }

  /**
   * Update existing product.
   * Challenge 9: Support update multiple images.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_url !== undefined) payload.image_url = data.image_url
      // Challenge 9: Update array gambar
      if (data.images !== undefined) payload.images = data.images
      // Challenge 8: Update nomor penjual
      if (data.seller_phone !== undefined) payload.seller_phone = data.seller_phone

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res

      // Invalidasi cache setelah update
      queryCache.invalidateByPrefix('guns')
      queryCache.invalidate('gun', { id })

      return { success: true, data: normalizeProduct(updated) }
    }
    const result = await apiClient.put(`/api/v1/recipes/${id}`, data)
    queryCache.invalidateByPrefix('guns')
    queryCache.invalidate('gun', { id })
    return result
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    const result = await apiClient.patch(`/api/v1/recipes/${id}`, data)
    queryCache.invalidateByPrefix('guns')
    return result
  }

  /**
   * Challenge 6: Soft Delete — Menandai produk sebagai terhapus (arsip).
   * Data TIDAK benar-benar dihapus dari database, hanya ditandai is_deleted=true.
   * Produk bisa di-restore kembali.
   */
  async deleteGun(id) {
    if (IS_SUPABASE) {
      // Soft delete: update is_deleted = true dan catat waktu penghapusan
      await apiClient.patch(
        `/rest/v1/products?id=eq.${id}`,
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
        { headers: { Prefer: 'return=minimal' } },
      )
      queryCache.invalidateByPrefix('guns')
      queryCache.invalidate('gun', { id })
      return { success: true }
    }
    const result = await apiClient.delete(`/api/v1/recipes/${id}`)
    queryCache.invalidateByPrefix('guns')
    return result
  }

  /**
   * Challenge 6: Restore — Mengembalikan produk yang sudah di-soft-delete.
   * Mengubah is_deleted kembali menjadi false.
   */
  async restoreGun(id) {
    if (IS_SUPABASE) {
      await apiClient.patch(
        `/rest/v1/products?id=eq.${id}`,
        {
          is_deleted: false,
          deleted_at: null,
        },
        { headers: { Prefer: 'return=minimal' } },
      )
      queryCache.invalidateByPrefix('guns')
      queryCache.invalidate('gun', { id })
      return { success: true }
    }
    // Untuk non-Supabase, coba PATCH
    const result = await apiClient.patch(`/api/v1/recipes/${id}`, {
      is_deleted: false,
      deleted_at: null,
    })
    queryCache.invalidateByPrefix('guns')
    return result
  }

  /**
   * Challenge 6: Permanent Delete — Menghapus produk secara permanen.
   * Data benar-benar dihapus dari database dan TIDAK bisa di-restore.
   */
  async permanentDeleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      queryCache.invalidateByPrefix('guns')
      queryCache.invalidate('gun', { id })
      return { success: true }
    }
    const result = await apiClient.delete(`/api/v1/recipes/${id}`)
    queryCache.invalidateByPrefix('guns')
    return result
  }

  /**
   * Challenge 6: Get Archived — Ambil daftar produk yang sudah di-soft-delete.
   */
  async getArchivedGuns() {
    const cached = queryCache.get('guns_archived', {})
    if (cached) return cached

    if (IS_SUPABASE) {
      const data = await apiClient.get(
        '/rest/v1/products?is_deleted=eq.true&select=*&order=deleted_at.desc',
      )
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []
      const result = { success: true, data: list }
      queryCache.set('guns_archived', {}, result, 2 * 60 * 1000) // cache 2 menit
      return result
    }

    return { success: true, data: [] }
  }
}

export default new GunService()
