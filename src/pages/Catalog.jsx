import { useState, useMemo, useEffect } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useGuns, useArchivedGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const ITEMS_PER_PAGE = 6 // Jumlah item per halaman katalog

/**
 * Catalog page — product listing.
 * 
 * Challenge 1: Pagination untuk memecah daftar katalog per halaman.
 * Challenge 2: Deep-linking (?gun=<id>) agar tautan share unik langsung terbuka.
 * Challenge 6: Soft Delete, tab Arsip/Deleted, fitur Restore & Hapus Permanen.
 * Challenge 8: Dukungan menambahkan item ke keranjang belanja (onAddToCart).
 */
export default function Catalog({ onNavigate, onAddToCart }) {
  // ---- Challenge 6: Tab View ('active' atau 'archived') ----
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'archived'

  // ---- API Data Katalog Aktif ----
  const {
    guns: apiGuns,
    loading: gunsLoading,
    error: gunsError,
    refetch: refetchGuns,
  } = useGuns({ limit: 100 })

  // ---- Challenge 6: Data Katalog Terarsip / Terhapus ----
  const {
    archivedGuns,
    loading: archivedLoading,
    error: archivedError,
    refetch: refetchArchived,
  } = useArchivedGuns()

  const [useLocal, setUseLocal] = useState(false)

  // Menggabungkan data dengan fallback jika API offline
  const rawGuns = useMemo(() => {
    if (useLocal || (gunsError && apiGuns.length === 0)) {
      return GUNS_LOCAL.map((g, i) => ({
        ...g,
        id: g.id || `local-${i}`,
        is_deleted: false,
      }))
    }
    return apiGuns
  }, [apiGuns, gunsError, useLocal])

  // ---- Filter & Search ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // ---- Challenge 1: State Pagination ----
  const [currentPage, setCurrentPage] = useState(1)

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  // Daftar item setelah filter & sorting
  const filteredGuns = useMemo(() => {
    const sourceList = activeTab === 'active' ? rawGuns : archivedGuns
    const result = sourceList.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory)
    )
    return sortItems(result, sortKey, sortOrder)
  }, [activeTab, rawGuns, archivedGuns, search, activeCategory, sortKey, sortOrder])

  // Challenge 1: Hitung total halaman & slice data untuk halaman aktif
  const totalPages = Math.ceil(filteredGuns.length / ITEMS_PER_PAGE) || 1
  const paginatedGuns = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredGuns.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredGuns, currentPage])

  // Reset page ke 1 jika filter berubah
  const handleSearchChange = (val) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat)
    setCurrentPage(1)
  }

  // ---- Detail View ----
  const [selectedGun, setSelectedGun] = useState(null)

  // Challenge 2: Cek apakah ada query param ?gun=<id> saat pertama kali load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gunParam = params.get('gun')
    if (gunParam && rawGuns.length > 0) {
      const matched = rawGuns.find(
        (g) => String(g.id) === gunParam || g.name.toLowerCase() === gunParam.toLowerCase()
      )
      if (matched) {
        setSelectedGun(matched)
      }
    }
  }, [rawGuns])

  // ---- Challenge 6: Dialog Konfirmasi Soft Delete / Permanent Delete ----
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    target: null,
    isPermanent: false,
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Challenge 6: Eksekusi Soft Delete atau Permanent Delete
  const handleConfirmDelete = async () => {
    const { target, isPermanent } = deleteModal
    if (!target) return

    try {
      setActionLoading(true)
      if (isPermanent) {
        // Hapus Permanen dari database
        await gunService.permanentDeleteGun(target.id)
        setToastMessage(`"${target.name}" berhasil dihapus permanen.`)
      } else {
        // Soft Delete (Pindah ke arsip)
        await gunService.deleteGun(target.id)
        setToastMessage(`"${target.name}" dipindahkan ke arsip (soft delete).`)
      }
      setDeleteModal({ open: false, target: null, isPermanent: false })
      refetchGuns()
      refetchArchived()
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      alert(err.message || 'Gagal menghapus item.')
    } finally {
      setActionLoading(false)
    }
  }

  // Challenge 6: Restore Item dari Arsip
  const handleRestore = async (gun) => {
    try {
      setActionLoading(true)
      await gunService.restoreGun(gun.id)
      setToastMessage(`"${gun.name}" berhasil dipulihkan ke katalog aktif!`)
      refetchGuns()
      refetchArchived()
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      alert(err.message || 'Gagal memulihkan item.')
    } finally {
      setActionLoading(false)
    }
  }

  // ---- Jika sedang melihat detail barang ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => {
          setSelectedGun(null)
          // Bersihkan URL param ?gun jika ada
          const url = new URL(window.location)
          url.searchParams.delete('gun')
          window.history.replaceState({}, '', url)
        }}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => {
          setSelectedGun(null)
          setDeleteModal({ open: true, target: g, isPermanent: false })
        }}
        onAddToCart={onAddToCart}
      />
    )
  }

  const isLoading = activeTab === 'active' ? gunsLoading : archivedLoading
  const currentError = activeTab === 'active' ? gunsError : archivedError

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          Koleksi senjata dan perlengkapan taktis. Setiap item dirinci berdasarkan jenis, kaliber,
          dan harga aslinya.
        </p>
      </section>

      {/* Toast Notification */}
      {toastMessage && <div className="toast toast--success">{toastMessage}</div>}

      <section>
        {/* Navigation Tab: Katalog Aktif vs Arsip (Challenge 6) */}
        <div className="catalog-tabs-bar">
          <button
            type="button"
            className={`catalog-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('active')
              setCurrentPage(1)
            }}
          >
            Katalog Aktif ({rawGuns.length})
          </button>
          <button
            type="button"
            className={`catalog-tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('archived')
              setCurrentPage(1)
            }}
          >
            <Archive size={15} /> Arsip / Terhapus ({archivedGuns.length})
          </button>
        </div>

        {/* Header List */}
        <div className="list-head">
          <h2>
            {activeTab === 'active' ? 'Stok Tersedia' : 'Barang Terarsip (Soft Deleted)'}
          </h2>
          <div className="list-head-right">
            <span className="count">
              Total {filteredGuns.length} item
            </span>
            {activeTab === 'active' && onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Tambah Hardware
              </button>
            )}
          </div>
        </div>

        {/* Filter & Pencarian */}
        <AdvancedFilter
          search={search}
          onSearch={handleSearchChange}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={handleCategoryChange}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setCurrentPage(1)
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Memuat hardware…</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && currentError && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{currentError}</p>
            <div className="state-box__actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={activeTab === 'active' ? refetchGuns : refetchArchived}
              >
                <RefreshCw size={16} /> Coba Lagi
              </button>
              {activeTab === 'active' && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setUseLocal(true)}
                >
                  Buka Katalog Lokal
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredGuns.length === 0 && !currentError && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>
              {activeTab === 'active'
                ? 'Tidak ada produk yang sesuai dengan pencarian.'
                : 'Tidak ada item yang diarsipkan saat ini.'}
            </p>
          </div>
        )}

        {/* Grid Produk */}
        {filteredGuns.length > 0 && (
          <>
            <ul className="stock">
              {paginatedGuns.map((gun) => (
                <div key={gun.id || gun.name} className="catalog-card-wrap">
                  {/* Tampilkan Card Standar untuk Aktif */}
                  {activeTab === 'active' ? (
                    <GunCard
                      gun={gun}
                      onSelect={setSelectedGun}
                      onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                      onDelete={(g) =>
                        setDeleteModal({ open: true, target: g, isPermanent: false })
                      }
                      onAddToCart={onAddToCart}
                    />
                  ) : (
                    /* Challenge 6: Tampilan Khusus untuk Item di Arsip */
                    <li className="card card--archived">
                      <div className="card-btn" onClick={() => setSelectedGun(gun)}>
                        <img
                          className="card-img"
                          src={gun.image_url || gun.image || '/guns/pistol.svg'}
                          alt={gun.name}
                        />
                        <span className="name display">{gun.name}</span>
                        <span className="type">
                          {gun.type || gun.category} · {gun.caliber}
                        </span>
                        <span className="archive-badge">Status: Diarsip</span>
                      </div>
                      <div className="archive-actions">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => handleRestore(gun)}
                          disabled={actionLoading}
                          title="Restore ke katalog aktif"
                        >
                          <RotateCcw size={14} /> Pulihkan
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() =>
                            setDeleteModal({ open: true, target: gun, isPermanent: true })
                          }
                          disabled={actionLoading}
                          title="Hapus permanen dari database"
                        >
                          <Trash2 size={14} /> Hapus Permanen
                        </button>
                      </div>
                    </li>
                  )}
                </div>
              ))}
            </ul>

            {/* Challenge 1: Komponen Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page)
                window.scrollTo({ top: 380, behavior: 'smooth' })
              }}
            />
          </>
        )}

        {useLocal && activeTab === 'active' && (
          <p className="local-notice">
            Menampilkan katalog lokal offline.{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setUseLocal(false)
                refetchGuns()
              }}
            >
              Hubungkan ulang server
            </button>
          </p>
        )}
      </section>

      {/* Modal Konfirmasi Hapus (Soft Delete vs Permanent) */}
      <ConfirmModal
        open={deleteModal.open}
        title={deleteModal.isPermanent ? 'Hapus Permanen Produk' : 'Arsipkan / Soft Delete Produk'}
        message={
          deleteModal.isPermanent
            ? `Apakah Anda yakin ingin menghapus "${deleteModal.target?.name}" secara PERMANEN? Data tidak dapat dipulihkan kembali.`
            : `Apakah Anda ingin mengarsipkan "${deleteModal.target?.name}"? Item akan dipindahkan ke tab Arsip dan dapat dipulihkan sewaktu-waktu.`
        }
        confirmLabel={deleteModal.isPermanent ? 'Hapus Permanen' : 'Arsipkan'}
        danger
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ open: false, target: null, isPermanent: false })}
      />
    </>
  )
}
