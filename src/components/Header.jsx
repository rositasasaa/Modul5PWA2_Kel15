import { Plus, ShoppingCart } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Catalog' },
  { id: 'Favorites', label: 'Favorites', hasBadge: true },
  { id: 'Profile', label: 'Profile' },
  { id: 'About', label: 'About' },
  { id: 'Contact', label: 'Contact' },
]

/**
 * Header navigasi dengan Favorite Badge & Cart Button (Challenge 8)
 */
function Header({ tab, onTab, onNavigateCreate, cartCount = 0, onOpenCart }) {
  const { favorites } = useFavorites()
  const favCount = favorites ? favorites.length : 0

  return (
    <header className="header">
      <div
        className="header-brand-wrap"
        onClick={() => onTab('Catalog')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div className="header-logo-badge">
          <img src="/logo.png" alt="Bore & Barrel" />
        </div>
        <span className="brand display">Bore &amp; Barrel</span>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'nav-link active' : 'nav-link'}
            onClick={() => onTab(item.id)}
          >
            {item.label}
            {item.hasBadge && favCount > 0 && (
              <span className="nav-badge">{favCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="header-right-actions">
        {/* Challenge 8: Tombol Keranjang Belanja */}
        {onOpenCart && (
          <button
            type="button"
            className="cart-toggle-btn"
            onClick={onOpenCart}
            aria-label="Buka Keranjang Belanja"
            title="Keranjang Belanja"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        )}

        {onNavigateCreate && (
          <button
            type="button"
            className="btn btn--primary btn--sm header-cta"
            onClick={onNavigateCreate}
            title="Register new hardware"
          >
            <Plus size={15} /> Add Hardware
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
