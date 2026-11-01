import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Trash2,
  Check,
  X,
  Share2,
  ShoppingCart,
  MessageCircle,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { useReviews } from '../../hooks/useReviews'
import { getUserProfile } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import { DEFAULT_WHATSAPP_NUMBER } from '../../hooks/useCart'

/**
 * Full-screen product detail view.
 * 
 * Fitur:
 * - Challenge 2: Button Share link dengan tautan unik
 * - Challenge 7: Review CRUD & Thumbs Up/Down
 * - Challenge 8: Tombol Tambah ke Keranjang & Checkout / Chat WA
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete, onAddToCart }) {
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Challenge 7: Hook Reviews
  const {
    reviews,
    loading: reviewsLoading,
    addReview,
    editReview,
    removeReview,
    voteReview,
    currentUserId,
  } = useReviews(gun.id)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // State untuk edit review
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  // State untuk share button
  const [copied, setCopied] = useState(false)
  const [cartSuccess, setCartSuccess] = useState(false)

  const profile = getUserProfile()
  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = reviews.length

  // Challenge 2: Share link unik
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(
      gun.id || gun.name
    )}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel - ${gun.name}`,
          text: `Spesifikasi ${gun.name} (${category} ${caliber}) - ${formatPrice(price)}`,
          url: shareUrl,
        })
        return
      } catch {
        /* fallback to copy */
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert(`Tautan produk: ${shareUrl}`)
    }
  }

  // Challenge 8: Chat WA Langsung untuk produk ini
  const handleDirectWhatsApp = () => {
    const phone = gun.seller_phone || DEFAULT_WHATSAPP_NUMBER
    const message = `Hi aku mau pesan:\n• ${gun.name} (${category} · ${caliber}) - ${formatPrice(
      price
    )}\n\nApakah barang ini masih tersedia?`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // Challenge 8: Add to Cart
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(gun)
      setCartSuccess(true)
      setTimeout(() => setCartSuccess(false), 2000)
    }
  }

  // Handler Kirim Review Baru (CREATE)
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating harus bernilai antara 1 dan 5 bintang.')
      return
    }

    try {
      setSubmitting(true)
      const res = await addReview({
        user_identifier: profile.username || 'Shooter',
        username: profile.username || 'Shooter',
        rating,
        comment: comment.trim(),
      })

      if (res.success) {
        setReviewSuccess('Review berhasil dikirim!')
        setComment('')
        setRating(5)
        setTimeout(() => setReviewSuccess(''), 4000)
      } else {
        setReviewError('Gagal mengirim review.')
      }
    } catch {
      setReviewError('Terjadi kesalahan saat mengirim review.')
    } finally {
      setSubmitting(false)
    }
  }

  // Mulai mode edit review (UPDATE)
  const handleStartEdit = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating)
    setEditComment(rev.comment || '')
  }

  // Simpan perubahan review (UPDATE)
  const handleSaveEdit = async (reviewId) => {
    try {
      await editReview(reviewId, {
        rating: editRating,
        comment: editComment.trim(),
      })
      setEditingReviewId(null)
      setReviewSuccess('Review berhasil diperbarui!')
      setTimeout(() => setReviewSuccess(''), 3000)
    } catch {
      setReviewError('Gagal memperbarui review.')
    }
  }

  // Hapus review (DELETE)
  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus review ini?')) {
      await removeReview(reviewId)
      setReviewSuccess('Review telah dihapus.')
      setTimeout(() => setReviewSuccess(''), 3000)
    }
  }

  return (
    <div className="detail">
      {/* Tombol Kembali */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Kembali ke Katalog
      </button>

      {/* Hero Produk */}
      <div className="detail-hero">
        <img className="detail-img" src={imgSrc} alt={gun.name} />
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          {/* Action Buttons */}
          <div className="detail-actions">
            {/* Challenge 8: Masukkan ke Keranjang */}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAddToCart}
            >
              <ShoppingCart size={16} />
              {cartSuccess ? 'Ditambahkan! ✓' : 'Tambah ke Keranjang'}
            </button>

            {/* Challenge 8: Hubungi Penjual Langsung via WA */}
            <button
              type="button"
              className="btn btn--whatsapp"
              onClick={handleDirectWhatsApp}
              title="Pesan langsung lewat WhatsApp"
            >
              <MessageCircle size={16} /> Pesan via WA
            </button>

            {/* Challenge 2: Share Link */}
            <button
              type="button"
              className="btn btn--outline"
              onClick={handleShare}
              title="Bagikan tautan unik ke produk ini"
            >
              {copied ? <Check size={16} color="var(--brass)" /> : <Share2 size={16} />}
              {copied ? 'Tersalin!' : 'Share'}
            </button>

            <FavoriteButton gunId={gun.id || gun.name} />

            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deskripsi */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'Tidak ada deskripsi tersedia.'}</p>
      </section>

      {/* Spesifikasi */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Spesifikasi</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Maintenance / Langkah Perakitan */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Protokol Perawatan / Perakitan</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>{step.instruction || step}</li>
            ))}
          </ol>
        </section>
      )}

      {/* Challenge 7: Section Reviews dengan CRUD & Thumbs Up / Down */}
      <section className="detail-section">
        <h2>Ulasan &amp; Rating ({reviewCount})</h2>

        {/* Form Tambah Review (CREATE) */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <h4>Tulis Ulasan Anda</h4>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Tulis ulasan Anda mengenai hardware ini…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            required
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader size={16} className="spin" /> Mengirim…
              </>
            ) : (
              <>
                <Send size={16} /> Kirim Review
              </>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
        </form>

        {/* Daftar Ulasan yang Ada (READ, UPDATE, DELETE, THUMBS) */}
        {reviewsLoading ? (
          <p className="detail-loading">Memuat ulasan…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isOwner =
                rev.user_id === currentUserId ||
                rev.user_identifier === profile.username ||
                String(rev.id).startsWith('local-rev-')

              const isEditing = editingReviewId === rev.id

              return (
                <li key={rev.id} className="review-item">
                  {/* Mode Edit Inline (UPDATE) */}
                  {isEditing ? (
                    <div className="review-edit-box">
                      <div className="review-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                          >
                            <Star
                              size={18}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="review-input"
                        rows="2"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                      />
                      <div className="review-edit-actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEdit(rev.id)}
                        >
                          <Check size={14} /> Simpan
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                        >
                          <X size={14} /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Header Review */}
                      <div className="review-head">
                        <div>
                          <span className="review-user">
                            {rev.user_identifier || 'Operator'}
                          </span>
                          <span className="review-date">
                            {' '}· {new Date(rev.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="review-stars-display">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < rev.rating ? 'var(--brass)' : 'none'}
                              stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Isi Komentar */}
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}

                      {/* Footer Review: Thumbs Up / Down & Tombol Edit/Delete */}
                      <div className="review-footer-row">
                        {/* Challenge 7: Thumbs Up & Thumbs Down Buttons */}
                        <div className="review-thumbs">
                          <button
                            type="button"
                            className="thumb-btn"
                            onClick={() => voteReview(rev.id, 'up')}
                            title="Suka review ini"
                          >
                            <ThumbsUp size={14} />
                            <span>{rev.thumbs_up || 0}</span>
                          </button>
                          <button
                            type="button"
                            className="thumb-btn"
                            onClick={() => voteReview(rev.id, 'down')}
                            title="Tidak suka review ini"
                          >
                            <ThumbsDown size={14} />
                            <span>{rev.thumbs_down || 0}</span>
                          </button>
                        </div>

                        {/* Challenge 7: Edit & Delete Review oleh pembuat */}
                        {isOwner && (
                          <div className="review-owner-actions">
                            <button
                              type="button"
                              className="review-act-btn"
                              onClick={() => handleStartEdit(rev)}
                              title="Edit review Anda"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="review-act-btn review-act-btn--danger"
                              onClick={() => handleDeleteReview(rev.id)}
                              title="Hapus review Anda"
                            >
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">Belum ada review. Jadilah yang pertama memberikan ulasan!</p>
        )}
      </section>
    </div>
  )
}
