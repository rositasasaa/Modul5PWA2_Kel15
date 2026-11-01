import { X, Trash2, Plus, Minus, MessageCircle, ShoppingBag } from 'lucide-react'
import { formatPrice } from '../../utils/helpers'

/**
 * Challenge 8: Cart Modal / Drawer
 * Menampilkan item keranjang dan tombol checkout ke WhatsApp.
 */
export default function CartModal({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart,
  totalPrice,
  checkoutToWhatsApp,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box cart-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang Belanja"
      >
        {/* Header Modal */}
        <div className="cart-modal-head">
          <div className="cart-modal-title">
            <ShoppingBag size={22} stroke="var(--brass)" />
            <h3 className="display">Keranjang Belanja</h3>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Tutup keranjang"
          >
            <X size={18} />
          </button>
        </div>

        {/* Isi Keranjang */}
        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={48} stroke="var(--steel)" />
            <p>Keranjang Anda masih kosong.</p>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onClose}
            >
              Mulai Belanja
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-items-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-sub">
                      {item.type} {item.caliber ? `· ${item.caliber}` : ''}
                    </span>
                    <span className="cart-item-price">
                      {formatPrice(item.price)}
                    </span>
                  </div>

                  {/* Kuantitas Control */}
                  <div className="cart-item-controls">
                    <div className="cart-qty-pill">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        aria-label="Kurangi"
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        aria-label="Tambah"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => removeFromCart(item.id)}
                      title="Hapus dari keranjang"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total & Checkout Section */}
            <div className="cart-footer">
              <div className="cart-total-row">
                <span className="cart-total-label">Total Belanja:</span>
                <span className="cart-total-val">{formatPrice(totalPrice)}</span>
              </div>

              <div className="cart-actions-row">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={clearCart}
                >
                  Kosongkan
                </button>
                {/* Challenge 8: Tombol Checkout WA */}
                <button
                  type="button"
                  className="btn btn--whatsapp"
                  onClick={() => checkoutToWhatsApp()}
                >
                  <MessageCircle size={18} /> Checkout via WhatsApp
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
