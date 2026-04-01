import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { companies as seedCompanies } from './data'

const DB_KEY = 'tech-companies-db-v1'
const PUBLIC_DB_PATH = '/companies-db.json'
const allowedRegions = ['الرياض', 'حائل', 'القصيم']

function makeId(name, idx = 0) {
  return `${String(name || 'company').replace(/\s+/g, '-').toLowerCase()}-${idx}`
}

function normalizeCompany(company, idx = 0) {
  const regions = Array.isArray(company.regions) && company.regions.length
    ? company.regions
    : (company.region ? [company.region] : [])

  return {
    id: company.id || makeId(company.name, idx),
    name: company.name || '',
    region: company.region || '',
    regions,
    size: company.size || 'صغيرة',
    spec: company.spec || '',
    web: company.web || '',
    contact: company.contact || '',
    linkedin: company.linkedin || '',
    training: company.training || '',
    trainingOpen: typeof company.trainingOpen === 'boolean'
      ? company.trainingOpen
      : Boolean(company.training && !String(company.training).includes('غير معروف')),
    grade: company.grade || '',
    nonSaudi: company.nonSaudi || 'غير معروف',
  }
}

function seedDb() {
  const normalized = seedCompanies.map((c, idx) => normalizeCompany(c, idx))
  return {
    companies: normalized,
    archived: [],
    updatedAt: new Date().toISOString(),
  }
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getCompanyRegions(company) {
  const sourceRegions = Array.isArray(company.regions) && company.regions.length
    ? company.regions
    : (company.region ? [company.region] : [])
  return sourceRegions.filter((r) => allowedRegions.includes(r))
}

function isAllowedCompany(company) {
  return getCompanyRegions(company).length > 0
}

function App() {
  const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')
  const [db, setDb] = useState(seedDb)

  const [regionFilter, setRegionFilter] = useState('')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [visibleCols, setVisibleCols] = useState({
    2: true, 3: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true,
  })
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const [adminSearch, setAdminSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const emptyDraft = {
    id: '', name: '', region: '', regions: [], size: 'صغيرة', spec: '', web: '', contact: '', linkedin: '',
    training: '', trainingOpen: false, grade: '', nonSaudi: 'غير معروف',
  }
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      const localRaw = localStorage.getItem(DB_KEY)
      if (localRaw) {
        try {
          const localData = JSON.parse(localRaw)
          if (!cancelled && localData && Array.isArray(localData.companies) && Array.isArray(localData.archived)) {
            setDb({
              companies: localData.companies.map((c, idx) => normalizeCompany(c, idx)),
              archived: localData.archived.map((c, idx) => normalizeCompany(c, idx + 10000)),
              updatedAt: localData.updatedAt || new Date().toISOString(),
            })
            setLoading(false)
            return
          }
        } catch {
          // Ignore invalid local cache.
        }
      }

      try {
        const res = await fetch(PUBLIC_DB_PATH, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data && Array.isArray(data.companies) && Array.isArray(data.archived)) {
            setDb({
              companies: data.companies.map((c, idx) => normalizeCompany(c, idx)),
              archived: data.archived.map((c, idx) => normalizeCompany(c, idx + 10000)),
              updatedAt: data.updatedAt || new Date().toISOString(),
            })
            localStorage.setItem(DB_KEY, JSON.stringify(data))
            setLoading(false)
            return
          }
        }
      } catch {
        // Fallback handled below.
      }

      if (!cancelled) {
        const seeded = seedDb()
        setDb(seeded)
        localStorage.setItem(DB_KEY, JSON.stringify(seeded))
        setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  async function persist(nextDb) {
    const payload = { ...nextDb, updatedAt: new Date().toISOString() }
    setDb(payload)
    localStorage.setItem(DB_KEY, JSON.stringify(payload))

    setSaveMsg('تم الحفظ داخل المتصفح الحالي. استخدم تصدير JSON إذا أردت نقل التعديلات أو نشرها.')

    setTimeout(() => setSaveMsg(''), 3500)
  }

  const exportDb = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJsonFile(`companies-db-${stamp}.json`, db)
    setSaveMsg('تم تصدير ملف JSON بنجاح.')
    setTimeout(() => setSaveMsg(''), 3500)
  }

  const importDb = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.companies) || !Array.isArray(parsed.archived)) {
        throw new Error('invalid db shape')
      }

      const payload = {
        companies: parsed.companies.map((c, idx) => normalizeCompany(c, idx)),
        archived: parsed.archived.map((c, idx) => normalizeCompany(c, idx + 10000)),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      }

      setDb(payload)
      localStorage.setItem(DB_KEY, JSON.stringify(payload))
      setSaveMsg('تم استيراد ملف JSON وتطبيق التغييرات.')
      setTimeout(() => setSaveMsg(''), 3500)
    } catch {
      setSaveMsg('ملف JSON غير صالح.')
      setTimeout(() => setSaveMsg(''), 3500)
    } finally {
      event.target.value = ''
    }
  }

  const resetFromBundledJson = async () => {
    try {
      const res = await fetch(PUBLIC_DB_PATH, { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      if (!Array.isArray(data.companies) || !Array.isArray(data.archived)) {
        throw new Error('invalid db')
      }
      const payload = {
        companies: data.companies.map((c, idx) => normalizeCompany(c, idx)),
        archived: data.archived.map((c, idx) => normalizeCompany(c, idx + 10000)),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
      setDb(payload)
      localStorage.setItem(DB_KEY, JSON.stringify(payload))
      setSaveMsg('تمت إعادة التحميل من ملف JSON الأساسي للموقع.')
      setTimeout(() => setSaveMsg(''), 3500)
    } catch {
      setSaveMsg('تعذر إعادة التحميل من ملف JSON الأساسي.')
      setTimeout(() => setSaveMsg(''), 3500)
    }
  }

  const visibleCompanies = useMemo(() => db.companies.filter(isAllowedCompany), [db.companies])

  const filteredCompanies = useMemo(() => {
    let result = regionFilter
      ? visibleCompanies.filter((c) => getCompanyRegions(c).includes(regionFilter))
      : visibleCompanies

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const va = sortConfig.key === 'region' ? getCompanyRegions(a).join(' + ') : (a[sortConfig.key] || '')
        const vb = sortConfig.key === 'region' ? getCompanyRegions(b).join(' + ') : (b[sortConfig.key] || '')
        return sortConfig.direction === 'asc' ? va.localeCompare(vb, 'ar') : vb.localeCompare(va, 'ar')
      })
    }
    return result
  }, [visibleCompanies, regionFilter, sortConfig])

  const stats = useMemo(() => {
    const counts = { total: visibleCompanies.length, riyadh: 0, hail: 0, qassim: 0, openTraining: 0 }
    visibleCompanies.forEach((c) => {
      const regions = getCompanyRegions(c)
      if (regions.includes('الرياض')) counts.riyadh += 1
      if (regions.includes('حائل')) counts.hail += 1
      if (regions.includes('القصيم')) counts.qassim += 1
      if (c.trainingOpen) counts.openTraining += 1
    })
    return counts
  }, [visibleCompanies])

  const handleSort = (colIdx) => {
    const keys = ['', 'name', 'region', 'size', 'spec', 'web', 'contact', 'linkedin', 'training', 'grade', 'nonSaudi', 'trainingOpen']
    const key = keys[colIdx]
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const toggleCol = (colIdx) => {
    setVisibleCols((prev) => ({ ...prev, [colIdx]: !prev[colIdx] }))
  }

  const badgeRegion = (r) => {
    const classes = { الرياض: 'badge-riyadh', حائل: 'badge-hail', القصيم: 'badge-qassim' }
    return <span className={`badge ${classes[r] || 'badge-multiple'}`}>{r}</span>
  }

  const badgeRegions = (regions) => {
    if (!regions.length) return <span style={{ color: '#ccc' }}>—</span>
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {regions.map((r) => <span key={r}>{badgeRegion(r)}</span>)}
      </div>
    )
  }

  const badgeSize = (s) => {
    const classes = { كبيرة: 'badge-large', حكومية: 'badge-gov', متوسطة: 'badge-medium', ناشئة: 'badge-startup' }
    return <span className={`badge ${classes[s] || 'badge-sme'}`}>{['كبيرة', 'حكومية', 'متوسطة', 'ناشئة'].includes(s) ? s : 'صغيرة'}</span>
  }

  const badgeGrade = (g) => {
    if (!g || g === '—') return <span style={{ color: '#ccc' }}>—</span>
    const classes = { 'A+': 'badge-aplus', A: 'badge-a', B: 'badge-b' }
    return <span className={`badge ${classes[g] || ''}`}>{g}</span>
  }

  const badgeNonSaudi = (n) => {
    if (!n || n === 'غير معروف') return <span className="badge badge-maybe">غير معروف</span>
    if (n.startsWith('نعم')) return <span className="badge badge-yes">نعم</span>
    if (n.includes('محتمل') || n.includes('محدود')) return <span className="badge badge-maybe">محتمل</span>
    return <span className="badge badge-maybe">{n}</span>
  }

  const badgeTrainingOpen = (v) => (
    <span className={`badge ${v ? 'badge-yes' : 'badge-no'}`}>{v ? 'مفتوح' : 'مغلق'}</span>
  )

  const linkify = (url, label) => {
    if (!url || url === '—') return <span style={{ color: '#ccc' }}>—</span>
    const href = url.startsWith('http') ? url : `https://${url}`
    let text = label || url.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    if (text.length > 25) text = `${text.substring(0, 22)}...`
    return <a href={href} target="_blank" rel="noopener noreferrer">{text}</a>
  }

  const isH = (colIdx) => (!visibleCols[colIdx] ? 'hidden-col' : '')

  const handleCopy = (text) => {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg(`تم نسخ: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`)
      setTimeout(() => setCopyMsg(''), 2000)
    })
  }

  const adminFilteredCompanies = useMemo(() => {
    const q = adminSearch.trim().toLowerCase()
    if (!q) return db.companies
    return db.companies.filter((c) =>
      [c.name, c.spec, c.contact, c.web, c.region, (c.regions || []).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [adminSearch, db.companies])

  const selectedCompany = useMemo(() => db.companies.find((c) => c.id === selectedId), [db.companies, selectedId])

  useEffect(() => {
    if (selectedCompany) setDraft({ ...selectedCompany })
  }, [selectedCompany])

  const resetDraft = () => {
    setSelectedId('')
    setDraft({ ...emptyDraft, id: makeId(`new-${Date.now()}`) })
  }

  const onSelectCompany = (company) => {
    setSelectedId(company.id)
    setDraft({ ...company })
  }

  const applyDraft = async () => {
    if (!draft.name.trim()) {
      setSaveMsg('اسم الشركة مطلوب.')
      return
    }
    const normalized = normalizeCompany({ ...draft, id: draft.id || makeId(draft.name, Date.now()) })
    const exists = db.companies.some((c) => c.id === normalized.id)
    const companies = exists
      ? db.companies.map((c) => (c.id === normalized.id ? normalized : c))
      : [normalized, ...db.companies]
    await persist({ ...db, companies })
    setSelectedId(normalized.id)
  }

  const archiveCompany = async (id) => {
    const target = db.companies.find((c) => c.id === id)
    if (!target) return
    const companies = db.companies.filter((c) => c.id !== id)
    const archived = [{ ...target }, ...db.archived]
    await persist({ ...db, companies, archived })
    if (selectedId === id) resetDraft()
  }

  const restoreCompany = async (id) => {
    const target = db.archived.find((c) => c.id === id)
    if (!target) return
    const archived = db.archived.filter((c) => c.id !== id)
    const companies = [{ ...target }, ...db.companies]
    await persist({ ...db, companies, archived })
  }

  const onRegionsInputChange = (value) => {
    const regions = value
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    setDraft((prev) => ({ ...prev, regions }))
  }

  if (loading) {
    return <div className="loading-screen">جاري تحميل البيانات...</div>
  }

  if (isAdminPage) {
    return (
      <div dir="rtl">
        <div className="header">
          <h1>لوحة إدارة الشركات</h1>
          <p>تعديل مباشر: إضافة / تحديث / أرشفة / استرجاع + حالة فتح التدريب</p>
          <a className="admin-link" href="/">العودة للدليل العام</a>
        </div>

        <div className="admin-layout">
          <div className="admin-list-card">
            <div className="admin-toolbar">
              <input
                className="admin-input"
                placeholder="ابحث عن شركة..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              <button className="admin-btn" type="button" onClick={resetDraft}>+ شركة جديدة</button>
            </div>
            <div className="admin-toolbar secondary">
              <button className="admin-btn" type="button" onClick={exportDb}>تصدير JSON</button>
              <label className="admin-btn file-btn">
                استيراد JSON
                <input type="file" accept="application/json" onChange={importDb} hidden />
              </label>
              <button className="admin-btn ghost" type="button" onClick={resetFromBundledJson}>استعادة من ملف الموقع</button>
            </div>

            <h3>الشركات النشطة ({db.companies.length})</h3>
            <div className="admin-scroll">
              {adminFilteredCompanies.map((company) => (
                <div key={company.id} className="admin-row">
                  <button className="admin-row-main" type="button" onClick={() => onSelectCompany(company)}>
                    <strong>{company.name}</strong>
                    <span>{getCompanyRegions(company).join(' + ') || 'خارج النطاق'}</span>
                  </button>
                  <button className="admin-btn danger" type="button" onClick={() => archiveCompany(company.id)}>أرشفة</button>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '16px' }}>الأرشيف ({db.archived.length})</h3>
            <div className="admin-scroll archived">
              {db.archived.length === 0 && <p className="muted">لا توجد شركات مؤرشفة.</p>}
              {db.archived.map((company) => (
                <div key={company.id} className="admin-row">
                  <div className="admin-row-main static">
                    <strong>{company.name}</strong>
                    <span>{(company.regions || []).join(' + ') || company.region || '—'}</span>
                  </div>
                  <button className="admin-btn" type="button" onClick={() => restoreCompany(company.id)}>استرجاع</button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-form-card">
            <h3>{selectedId ? 'تعديل شركة' : 'إضافة شركة جديدة'}</h3>
            <div className="admin-form-grid">
              <label>اسم الشركة<input className="admin-input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} /></label>
              <label>المناطق (بفاصلة)<input className="admin-input" value={(draft.regions || []).join(', ')} onChange={(e) => onRegionsInputChange(e.target.value)} placeholder="الرياض, حائل" /></label>
              <label>حجم الشركة
                <select className="admin-input" value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: e.target.value }))}>
                  <option value="كبيرة">كبيرة</option>
                  <option value="حكومية">حكومية</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="ناشئة">ناشئة</option>
                  <option value="صغيرة">صغيرة</option>
                </select>
              </label>
              <label>التقييم
                <select className="admin-input" value={draft.grade} onChange={(e) => setDraft((p) => ({ ...p, grade: e.target.value }))}>
                  <option value="">بدون</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </label>
              <label className="full">التخصص<input className="admin-input" value={draft.spec} onChange={(e) => setDraft((p) => ({ ...p, spec: e.target.value }))} /></label>
              <label className="full">رابط الموقع<input className="admin-input" value={draft.web} onChange={(e) => setDraft((p) => ({ ...p, web: e.target.value }))} /></label>
              <label className="full">رابط لينكدإن<input className="admin-input" value={draft.linkedin} onChange={(e) => setDraft((p) => ({ ...p, linkedin: e.target.value }))} /></label>
              <label className="full">التواصل<input className="admin-input" value={draft.contact} onChange={(e) => setDraft((p) => ({ ...p, contact: e.target.value }))} /></label>
              <label className="full">تفاصيل التدريب<input className="admin-input" value={draft.training} onChange={(e) => setDraft((p) => ({ ...p, training: e.target.value }))} /></label>
              <label>
                قبول غير السعوديين
                <select className="admin-input" value={draft.nonSaudi} onChange={(e) => setDraft((p) => ({ ...p, nonSaudi: e.target.value }))}>
                  <option value="نعم">نعم</option>
                  <option value="محتمل">محتمل</option>
                  <option value="غير معروف">غير معروف</option>
                </select>
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={Boolean(draft.trainingOpen)} onChange={(e) => setDraft((p) => ({ ...p, trainingOpen: e.target.checked }))} />
                التدريب مفتوح الآن
              </label>
            </div>

            <div className="admin-actions">
              <button className="admin-btn" type="button" onClick={applyDraft}>حفظ التعديلات</button>
              <button className="admin-btn ghost" type="button" onClick={resetDraft}>تفريغ النموذج</button>
            </div>
            {saveMsg && <p className="save-msg">{saveMsg}</p>}
            <p className="muted" style={{ marginTop: '10px' }}>بدون خادم: التعديلات تُحفظ في هذا المتصفح. إذا أردت نقلها أو اعتمادها للنشر، صدّر JSON ثم استبدل ملف الموقع به.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <div className="header">
        <h1>دليل شركات التقنية</h1>
        <p>الرياض · حائل · القصيم — دليل شامل لفرص التدريب الصيفي والتعاوني لعام 2026</p>
        <a className="admin-link" href="/admin">لوحة الإدارة</a>
      </div>

      <div className="stats-bar">
        <div className="stat"><span className="num">{stats.total}</span><span className="label">إجمالي الشركات</span></div>
        <div className="stat"><span className="num">{stats.riyadh}</span><span className="label">الرياض</span></div>
        <div className="stat"><span className="num">{stats.hail}</span><span className="label">حائل</span></div>
        <div className="stat"><span className="num">{stats.qassim}</span><span className="label">القصيم</span></div>
        <div className="stat"><span className="num">{stats.openTraining}</span><span className="label">التدريب المفتوح</span></div>
      </div>

      {saveMsg && <p className="save-msg site">{saveMsg}</p>}

      <div className="controls-wrapper">
        <div className="controls">
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">كل المناطق</option>
            <option value="الرياض">📍 الرياض</option>
            <option value="حائل">📍 حائل</option>
            <option value="القصيم">📍 القصيم</option>
          </select>
          <div className="btn-columns" onClick={() => setShowColDropdown(!showColDropdown)}>
            <span>⚙️ اخفاء او اظهار معلومات اكثر</span>
            <div className={`column-dropdown ${showColDropdown ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
              {[
                { id: 2, label: 'المنطقة' },
                { id: 3, label: 'الحجم' },
                { id: 5, label: 'الموقع' },
                { id: 6, label: 'التواصل' },
                { id: 7, label: 'لينكد إن' },
                { id: 8, label: 'فرص التدريب' },
                { id: 11, label: 'التدريب مفتوح' },
                { id: 9, label: 'التقييم' },
                { id: 10, label: 'غير السعوديين' },
              ].map((col) => (
                <label key={col.id} className="col-item">
                  <input type="checkbox" checked={visibleCols[col.id]} onChange={() => toggleCol(col.id)} /> {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {copyMsg && <div className="copy-tooltip">{copyMsg}</div>}
        {filteredCompanies.length > 0 ? (
          <>
            {windowWidth > 1024 ? (
              <div className="table-card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(0)}>#</th>
                        <th onClick={() => handleSort(1)}>الشركة ▲▼</th>
                        <th className={isH(2)} onClick={() => handleSort(2)}>المنطقة</th>
                        <th className={isH(3)} onClick={() => handleSort(3)}>الحجم</th>
                        <th className={isH(5)} onClick={() => handleSort(5)}>الموقع</th>
                        <th className={isH(6)} onClick={() => handleSort(6)}>التواصل</th>
                        <th className={isH(7)} onClick={() => handleSort(7)}>لينكد إن</th>
                        <th className={isH(8)} onClick={() => handleSort(8)}>فرص التدريب</th>
                        <th className={isH(11)} onClick={() => handleSort(11)}>التدريب مفتوح</th>
                        <th className={isH(9)} onClick={() => handleSort(9)}>التقييم</th>
                        <th className={isH(10)} onClick={() => handleSort(10)}>غير السعوديين</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((c, i) => (
                        <tr key={c.id || i}>
                          <td onClick={() => handleCopy(String(i + 1))}>{i + 1}</td>
                          <td onClick={() => handleCopy(`${c.name} ${c.spec}`)}>
                            <div className="company-info">
                              <span className="company-name">{c.name}</span>
                              <span className="company-spec">{c.spec}</span>
                            </div>
                          </td>
                          <td className={isH(2)} onClick={() => handleCopy(getCompanyRegions(c).join(' + '))}>{badgeRegions(getCompanyRegions(c))}</td>
                          <td className={isH(3)} onClick={() => handleCopy(c.size)}>{badgeSize(c.size)}</td>
                          <td className={isH(5)} onClick={() => handleCopy(c.web)}>{linkify(c.web)}</td>
                          <td className={isH(6)} onClick={() => handleCopy(c.contact)}><div className="contact-cell" title={c.contact || ''}>{c.contact || '—'}</div></td>
                          <td className={isH(7)} onClick={() => handleCopy(c.linkedin)}>{c.linkedin ? linkify(c.linkedin, 'لينكد إن') : '—'}</td>
                          <td className={isH(8)} onClick={() => handleCopy(c.training)}><div className="training-cell" title={c.training || ''}>{c.training || '—'}</div></td>
                          <td className={isH(11)}>{badgeTrainingOpen(Boolean(c.trainingOpen))}</td>
                          <td className={isH(9)} onClick={() => handleCopy(c.grade)}>{badgeGrade(c.grade)}</td>
                          <td className={isH(10)} onClick={() => handleCopy(c.nonSaudi)}>{badgeNonSaudi(c.nonSaudi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mobile-cards" style={{ display: 'grid' }}>
                {filteredCompanies.map((c) => (
                  <div className="m-card" key={c.id}>
                    <div className="m-header">
                      <div className="m-title">{c.name}</div>
                      {badgeGrade(c.grade)}
                    </div>
                    <div className="m-grid">
                      <div className="m-item"><span className="m-label">المنطقة</span><span className="m-value">{badgeRegions(getCompanyRegions(c))}</span></div>
                      <div className="m-item"><span className="m-label">الحجم</span><span className="m-value">{badgeSize(c.size)}</span></div>
                      <div className="m-item"><span className="m-label">الموقع</span><span className="m-value">{linkify(c.web)}</span></div>
                      <div className="m-item"><span className="m-label">التدريب مفتوح</span><span className="m-value">{badgeTrainingOpen(Boolean(c.trainingOpen))}</span></div>
                      <div className="m-item"><span className="m-label">لينكد إن</span><span className="m-value">{c.linkedin ? linkify(c.linkedin, 'لينكد إن') : '—'}</span></div>
                      <div className="m-item"><span className="m-label">التواصل</span><span className="m-value" style={{ fontSize: '0.8rem' }}>{c.contact || '—'}</span></div>
                      <div className="m-item m-full"><span className="m-label">التخصص</span><span className="m-value">{c.spec}</span></div>
                      <div className="m-item m-full"><span className="m-label">فرص التدريب</span><span className="m-value">{c.training || '—'}</span></div>
                      <div className="m-item m-full"><span className="m-label">قبول غير السعوديين</span><span className="m-value">{badgeNonSaudi(c.nonSaudi)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-results">
            <i>🔍</i>
            <h3>لا توجد نتائج تطابق بحثك</h3>
            <p>جرب تغيير الفلاتر أو تحديث البيانات من لوحة الإدارة</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
