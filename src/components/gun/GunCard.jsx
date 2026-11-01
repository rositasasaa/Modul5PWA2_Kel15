import { useState } from 'react'
import { Share2, ShoppingCart, Check } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate } from '../../utils/helpers'

/**
 * Product card used in the catalog grid.
 * 
 * Fitur Baru:
 * - Challenge 2: Button Share link dengan tautan unik
 * - Challenge 8: Button Masukkan ke Keranjang
 */
export default function GunCard({ gun, onSelect, onEdit, onDelete, onAddToCart }) {
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  const [copied, setCopied] = useState(false)
  const [addedAnim, setAddedAnim] = useState(false)

  // Challenge 2: Share Link Tautan Unik
  const handleShare = async (e) => {
    e.stopPropagation() // Agar card tidak ikut ter-klik

    // Membuat tautan unik ke produk ini
    const shareUrl = `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(
      gun.id || gun.name
    )}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel - ${gun.name}`,
          text: `Cek spesifikasi dan harga ${gun.name} (${caliber}) di Bore & Barrel!`,
          url: shareUrl,
        })
        return
      } catch {
        /* fallback to copy */
      }
    }

    // Salin ke clipboard jika Web Share tidak tersedia
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(`Tautan produk: ${shareUrl}`)
    }
  }

  // Challenge 8: Masukkan ke Keranjang
  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (onAddToCart) {
      onAddToCart(gun)
      setAddedAnim(true)
      setTimeout(() => setAddedAnim(false), 1500)
    }
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <img
          className="card-img"
          src={imgSrc}
          alt={gun.name}
          width="240"
          height="180"
          loading="lazy"
        />

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        {/* Challenge 8: Tombol Add to Cart */}
        {onAddToCart && (
          <button
            type="button"
            className={`card-act-btn ${addedAnim ? 'card-act-btn--success' : ''}`}
            onClick={handleAddToCart}
            aria-label={`Tambah ${gun.name} ke keranjang`}
            title="Tambah ke Keranjang"
          >
            {addedAnim ? <Check size={14} color="#27ae60" /> : <ShoppingCart size={15} />}
          </button>
        )}

        {/* Challenge 2: Tombol Share Link Unik */}
        <button
          type="button"
          className="card-act-btn"
          onClick={handleShare}
          aria-label={`Share link ${gun.name}`}
          title="Bagi Tautan Unik"
        >
          {copied ? <Check size={14} color="var(--brass)" /> : <Share2 size={15} />}
        </button>

        {/* Tombol Favorit */}
        <FavoriteButton gunId={gun.id || gun.name} />

        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(gun)
            }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(gun)
            }}
            aria-label={`Delete ${gun.name}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}
