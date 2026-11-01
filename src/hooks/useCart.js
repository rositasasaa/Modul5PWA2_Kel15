import { useState, useEffect } from 'react'
import { formatPrice } from '../utils/helpers'

// ---------------------------------------------------------------------------
// useCart.js — State management untuk keranjang belanja (Cart) & Checkout WA
// Challenge 8: Masukin ke keranjang -> Checkout direct ke WA
// Data keranjang disimpan di localStorage agar persisten.
// ---------------------------------------------------------------------------

const CART_KEY = 'bore_barrel_cart'
// Nomor WhatsApp Admin / Toko (Bisa diganti dengan nomor pribadi kamu, format internasional: 628xxx)
export const DEFAULT_WHATSAPP_NUMBER = '6281234567890'

export function useCart() {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Simpan ke localStorage setiap ada perubahan pada keranjang
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart])

  /**
   * Menambahkan item ke keranjang
   */
  const addToCart = (gun, quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => String(item.id) === String(gun.id || gun.name)
      )
      if (existingIndex > -1) {
        // Jika sudah ada, tambahkan quantity
        const updated = [...prev]
        updated[existingIndex].quantity += quantity
        return updated
      }
      // Jika belum ada, masukkan sebagai item baru
      return [
        ...prev,
        {
          id: gun.id || gun.name,
          name: gun.name,
          price: Number(gun.price ?? gun.cook_time ?? 0),
          image: gun.image_url || gun.image || '/guns/pistol.svg',
          caliber: gun.caliber || '',
          type: gun.type || gun.category || '',
          quantity,
        },
      ]
    })
  }

  /**
   * Mengubah jumlah item di keranjang
   */
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId) ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  /**
   * Menghapus item dari keranjang
   */
  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(itemId)))
  }

  /**
   * Mengosongkan keranjang
   */
  const clearCart = () => {
    setCart([])
  }

  /**
   * Total harga barang di keranjang
   */
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  /**
   * Total item (kuantitas keseluruhan)
   */
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  /**
   * Challenge 8: Fungsi Checkout Direct ke WhatsApp
   * Membuat pesan otomatis:
   * "Hi aku mau pesan:
   *  - Glock 17 (1x) - $599
   *  Total: $599"
   */
  const checkoutToWhatsApp = (phoneNumber = DEFAULT_WHATSAPP_NUMBER) => {
    if (cart.length === 0) return

    // Susun daftar pesanan
    const itemsList = cart
      .map(
        (item) =>
          `• ${item.name} (${item.quantity}x) - ${formatPrice(
            item.price * item.quantity
          )}`
      )
      .join('\n')

    const message = `Hi aku mau pesan:\n\n${itemsList}\n\n*Total Tagihan: ${formatPrice(
      totalPrice
    )}*\n\nMohon informasi ketersediaan stok & proses pengirimannya ya. Terima kasih!`

    const encodedMsg = encodeURIComponent(message)
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodedMsg}`

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank')
  }

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalPrice,
    totalItemsCount,
    checkoutToWhatsApp,
  }
}
