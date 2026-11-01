import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Challenge 1: Komponen Pagination Navigasi Halaman
 * 
 * @param {Object} props
 * @param {number} props.currentPage  - Halaman aktif sekarang
 * @param {number} props.totalPages   - Total halaman yang tersedia
 * @param {Function} props.onPageChange - Handler saat berpindah halaman
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  // Membuat daftar halaman yang ditampilkan
  const getPageNumbers = () => {
    const pages = []
    const delta = 1 // Menampilkan 1 halaman di sebelah kiri & kanan halaman aktif

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <nav className="pagination" aria-label="Catalog pagination">
      {/* Tombol Sebelumnya */}
      <button
        type="button"
        className="pagination__btn pagination__btn--nav"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous Page"
      >
        <ChevronLeft size={16} /> Prev
      </button>

      {/* Nomor-nomor Halaman */}
      <div className="pagination__numbers">
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="pagination__dots">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination__btn pagination__num${
                p === currentPage ? ' pagination__num--active' : ''
              }`}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Tombol Selanjutnya */}
      <button
        type="button"
        className="pagination__btn pagination__btn--nav"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next Page"
      >
        Next <ChevronRight size={16} />
      </button>
    </nav>
  )
}
