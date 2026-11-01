import { apiClient, IS_SUPABASE } from '../config/api'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// ReviewService — product reviews & ratings.
// Supports both Supabase (public.reviews) and university API.
//
// Challenge 7: Full CRUD untuk reviews + thumbs up/down voting.
// Challenge 4: Query Caching untuk reviews.
// ---------------------------------------------------------------------------

class ReviewService {
  /**
   * Fetch all reviews for a given product.
   * Challenge 4: Response di-cache.
   * Challenge 7: Setiap review punya thumbs_up dan thumbs_down count.
   */
  async getReviews(gunId) {
    const cached = queryCache.get('reviews', { gunId })
    if (cached) return cached

    if (IS_SUPABASE) {
      const data = await apiClient.get(
        `/rest/v1/reviews?product_id=eq.${gunId}&select=*&order=created_at.desc`,
      )
      const list = Array.isArray(data)
        ? data.map((r) => ({
            id: r.id,
            product_id: r.product_id,
            user_identifier: r.user_id ? `Operator ${String(r.user_id).substring(0, 8)}` : 'Anonymous',
            user_id: r.user_id || null,
            rating: r.rating,
            comment: r.comment || '',
            created_at: r.created_at,
            updated_at: r.updated_at || null,
            // Challenge 7: Thumbs up/down counter
            thumbs_up: r.thumbs_up || 0,
            thumbs_down: r.thumbs_down || 0,
          }))
        : []

      const result = { success: true, data: list }
      queryCache.set('reviews', { gunId }, result, 3 * 60 * 1000) // cache 3 menit
      return result
    }

    const result = await apiClient.get(`/api/v1/recipes/${gunId}/reviews`)
    queryCache.set('reviews', { gunId }, result, 3 * 60 * 1000)
    return result
  }

  /**
   * Challenge 7: Submit a new review (CREATE).
   * @param {string|number} gunId
   * @param {Object} reviewData  { user_identifier, rating, comment }
   */
  async createReview(gunId, reviewData) {
    if (IS_SUPABASE) {
      const payload = {
        product_id: Number(gunId),
        user_id: reviewData.user_id || reviewData.user_identifier,
        rating: Number(reviewData.rating),
        comment: reviewData.comment || '',
        // Challenge 7: Inisialisasi thumbs counter
        thumbs_up: 0,
        thumbs_down: 0,
      }

      const res = await apiClient.post('/rest/v1/reviews', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res

      // Invalidasi cache reviews untuk produk ini
      queryCache.invalidate('reviews', { gunId })

      return { success: true, data: created }
    }

    const result = await apiClient.post(`/api/v1/recipes/${gunId}/reviews`, reviewData)
    queryCache.invalidate('reviews', { gunId })
    return result
  }

  /**
   * Challenge 7: Edit an existing review (UPDATE).
   * User bisa mengubah rating dan komentar review yang sudah dibuat.
   */
  async updateReview(reviewId, reviewData) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${reviewId}`,
        {
          rating: Number(reviewData.rating),
          comment: reviewData.comment,
          updated_at: new Date().toISOString(),
        },
        { headers: { Prefer: 'return=representation' } },
      )
      // Invalidasi semua cache reviews
      queryCache.invalidateByPrefix('reviews')
      return { success: true, data: Array.isArray(res) ? res[0] : res }
    }

    const result = await apiClient.put(`/api/v1/reviews/${reviewId}`, reviewData)
    queryCache.invalidateByPrefix('reviews')
    return result
  }

  /**
   * Challenge 7: Delete a review (DELETE).
   * User bisa menghapus review yang sudah dibuat.
   */
  async deleteReview(reviewId) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      queryCache.invalidateByPrefix('reviews')
      return { success: true }
    }

    const result = await apiClient.delete(`/api/v1/reviews/${reviewId}`)
    queryCache.invalidateByPrefix('reviews')
    return result
  }

  /**
   * Challenge 7: Thumbs Up — Menambah jumlah like pada review.
   * Menggunakan increment pada field thumbs_up.
   */
  async thumbsUpReview(reviewId, currentCount = 0) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${reviewId}`,
        { thumbs_up: currentCount + 1 },
        { headers: { Prefer: 'return=representation' } },
      )
      queryCache.invalidateByPrefix('reviews')
      return { success: true, data: Array.isArray(res) ? res[0] : res }
    }

    // Fallback: POST endpoint
    const result = await apiClient.post(`/api/v1/reviews/${reviewId}/thumbs-up`)
    queryCache.invalidateByPrefix('reviews')
    return result
  }

  /**
   * Challenge 7: Thumbs Down — Menambah jumlah dislike pada review.
   * Menggunakan increment pada field thumbs_down.
   */
  async thumbsDownReview(reviewId, currentCount = 0) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${reviewId}`,
        { thumbs_down: currentCount + 1 },
        { headers: { Prefer: 'return=representation' } },
      )
      queryCache.invalidateByPrefix('reviews')
      return { success: true, data: Array.isArray(res) ? res[0] : res }
    }

    const result = await apiClient.post(`/api/v1/reviews/${reviewId}/thumbs-down`)
    queryCache.invalidateByPrefix('reviews')
    return result
  }
}

export default new ReviewService()
