import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API.
//
// Challenge 1: Pagination — mendukung navigasi halaman (page, limit, totalPages).
// Challenge 4: Query Caching — data di-cache otomatis di gunService.
//
// Returns { guns, loading, error, pagination, refetch, goToPage }.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)
  // Challenge 1: State halaman saat ini
  const [currentPage, setCurrentPage] = useState(params.page || 1)

  // Serialise params so the effect re-runs when they change.
  const paramKey = JSON.stringify({ ...params, page: currentPage })

  const fetchGuns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Challenge 1: Kirim parameter page ke service
      const response = await gunService.getGuns({ ...params, page: currentPage })

      if (response.success) {
        setGuns(response.data || [])
        // Challenge 1: Set pagination info dari response
        setPagination(response.pagination || {
          total: (response.data || []).length,
          page: currentPage,
          limit: params.limit || 12,
          totalPages: 1,
        })
      } else {
        setError(response.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      setGuns([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  /**
   * Challenge 1: Fungsi untuk navigasi ke halaman tertentu
   * @param {number} page - nomor halaman tujuan
   */
  const goToPage = (page) => {
    if (page >= 1) {
      setCurrentPage(page)
    }
  }

  return { guns, loading, error, pagination, refetch: fetchGuns, goToPage, currentPage }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID.
//
// Returns { gun, loading, error, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const [gun, setGun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const response = await gunService.getGunById(id)

      if (response.success) {
        setGun(response.data)
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: fetchGun }
}

// ---------------------------------------------------------------------------
// Challenge 6: useArchivedGuns — fetch soft-deleted products.
// Returns { archivedGuns, loading, error, refetch }.
// ---------------------------------------------------------------------------
export function useArchivedGuns() {
  const [archivedGuns, setArchivedGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchArchived = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await gunService.getArchivedGuns()
      if (response.success) {
        setArchivedGuns(response.data || [])
      } else {
        setError(response.message || 'Failed to fetch archived products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred.')
      setArchivedGuns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArchived()
  }, [fetchArchived])

  return { archivedGuns, loading, error, refetch: fetchArchived }
}
