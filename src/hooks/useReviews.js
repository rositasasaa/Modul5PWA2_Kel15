import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// localStorage fallback untuk reviews ketika backend offline
// Key format: bore_barrel_reviews_<gunId>
// ---------------------------------------------------------------------------
const getLocalReviewsKey = (gunId) => `bore_barrel_reviews_${gunId}`

const readLocalReviews = (gunId) => {
  try {
    const raw = localStorage.getItem(getLocalReviewsKey(gunId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalReviews = (gunId, reviews) => {
  try {
    localStorage.setItem(getLocalReviewsKey(gunId), JSON.stringify(reviews))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// useReviews — fetch, create, update, delete, dan voting thumbs untuk review
// Challenge 4: Query Caching (ditangani di reviewService)
// Challenge 7: Review CRUD + Thumbs Up / Down
// ---------------------------------------------------------------------------
export function useReviews(gunId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUserId = getUserIdentifier()

  // Ambil daftar review
  const fetchReviews = useCallback(async () => {
    if (!gunId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await reviewService.getReviews(gunId)
      if (response.success) {
        // Gabungkan data server dengan local jika perlu
        const serverList = response.data || []
        const localList = readLocalReviews(gunId)
        
        // Buat map agar tidak duplikat
        const mergedMap = new Map()
        localList.forEach((r) => mergedMap.set(String(r.id), r))
        serverList.forEach((r) => mergedMap.set(String(r.id), r))
        
        setReviews(Array.from(mergedMap.values()))
      } else {
        throw new Error(response.message || 'Failed to fetch reviews')
      }
    } catch (err) {
      // Fallback ke localStorage jika server gagal/offline
      const fallback = readLocalReviews(gunId)
      setReviews(fallback)
    } finally {
      setLoading(false)
    }
  }, [gunId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Challenge 7: CREATE Review
  const addReview = async (reviewData) => {
    try {
      const response = await reviewService.createReview(gunId, reviewData)
      if (response && (response.success || response.data)) {
        await fetchReviews()
        return { success: true }
      }
      throw new Error('Gagal mengirim review ke server')
    } catch {
      // Fallback buat secara lokal di localStorage
      const newLocalReview = {
        id: `local-rev-${Date.now()}`,
        product_id: gunId,
        user_identifier: reviewData.username || `Operator ${currentUserId.substring(0, 6)}`,
        user_id: currentUserId,
        rating: Number(reviewData.rating),
        comment: reviewData.comment || '',
        created_at: new Date().toISOString(),
        thumbs_up: 0,
        thumbs_down: 0,
      }
      const existing = readLocalReviews(gunId)
      const updated = [newLocalReview, ...existing]
      writeLocalReviews(gunId, updated)
      setReviews(updated)
      return { success: true, local: true }
    }
  }

  // Challenge 7: UPDATE Review (Edit)
  const editReview = async (reviewId, updatedData) => {
    try {
      if (!String(reviewId).startsWith('local-')) {
        await reviewService.updateReview(reviewId, updatedData)
      }
      // Update local storage jika ada
      const existing = readLocalReviews(gunId)
      const updated = existing.map((r) =>
        String(r.id) === String(reviewId)
          ? { ...r, rating: Number(updatedData.rating), comment: updatedData.comment, updated_at: new Date().toISOString() }
          : r
      )
      writeLocalReviews(gunId, updated)
      await fetchReviews()
      return { success: true }
    } catch {
      // Jika server gagal, update state lokal
      setReviews((prev) =>
        prev.map((r) =>
          String(r.id) === String(reviewId)
            ? { ...r, rating: Number(updatedData.rating), comment: updatedData.comment, updated_at: new Date().toISOString() }
            : r
        )
      )
      return { success: true, local: true }
    }
  }

  // Challenge 7: DELETE Review
  const removeReview = async (reviewId) => {
    try {
      if (!String(reviewId).startsWith('local-')) {
        await reviewService.deleteReview(reviewId)
      }
      const existing = readLocalReviews(gunId)
      const filtered = existing.filter((r) => String(r.id) !== String(reviewId))
      writeLocalReviews(gunId, filtered)
      await fetchReviews()
      return { success: true }
    } catch {
      // Fallback hapus dari state lokal
      setReviews((prev) => prev.filter((r) => String(r.id) !== String(reviewId)))
      return { success: true, local: true }
    }
  }

  // Challenge 7: Thumbs Up / Thumbs Down Voting
  const voteReview = async (reviewId, type) => {
    // type: 'up' | 'down'
    setReviews((prev) =>
      prev.map((r) => {
        if (String(r.id) === String(reviewId)) {
          const up = type === 'up' ? (r.thumbs_up || 0) + 1 : r.thumbs_up || 0
          const down = type === 'down' ? (r.thumbs_down || 0) + 1 : r.thumbs_down || 0
          return { ...r, thumbs_up: up, thumbs_down: down }
        }
        return r
      })
    )

    try {
      const target = reviews.find((r) => String(r.id) === String(reviewId))
      if (!String(reviewId).startsWith('local-') && target) {
        if (type === 'up') {
          await reviewService.thumbsUpReview(reviewId, target.thumbs_up || 0)
        } else {
          await reviewService.thumbsDownReview(reviewId, target.thumbs_down || 0)
        }
      } else {
        // Update di local storage jika local
        const existing = readLocalReviews(gunId)
        const updated = existing.map((r) => {
          if (String(r.id) === String(reviewId)) {
            const up = type === 'up' ? (r.thumbs_up || 0) + 1 : r.thumbs_up || 0
            const down = type === 'down' ? (r.thumbs_down || 0) + 1 : r.thumbs_down || 0
            return { ...r, thumbs_up: up, thumbs_down: down }
          }
          return r
        })
        writeLocalReviews(gunId, updated)
      }
    } catch {
      /* ignore server vote error */
    }
  }

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews,
    addReview,
    editReview,
    removeReview,
    voteReview,
    currentUserId,
  }
}
