import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { companies as initialCompanies } from './data'

function App() {
  const allowedRegions = ['الرياض', 'حائل', 'القصيم']
  const getCompanyRegions = (company) => {
    const sourceRegions = Array.isArray(company.regions) && company.regions.length
      ? company.regions
      : (company.region ? [company.region] : [])
    return sourceRegions.filter(r => allowedRegions.includes(r))
  }
  const getRegionText = (company) => {
    const regions = getCompanyRegions(company)
    return regions.join(' + ')
  }

  const [regionFilter, setRegionFilter] = useState('')
  const [showColDropdown, setShowColDropdown] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [visibleCols, setVisibleCols] = useState({
    2: true, 3: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true
  })
  const [companies, setCompanies] = useState(
    initialCompanies.filter(c => getCompanyRegions(c).length > 0)
  )
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredCompanies = useMemo(() => {
    let result = regionFilter
      ? companies.filter(c => getCompanyRegions(c).includes(regionFilter))
      : companies

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const va = sortConfig.key === 'region' ? getRegionText(a) : (a[sortConfig.key] || '')
        const vb = sortConfig.key === 'region' ? getRegionText(b) : (b[sortConfig.key] || '')
        if (sortConfig.direction === 'asc') {
          return va.localeCompare(vb, 'ar')
        }
        return vb.localeCompare(va, 'ar')
      })
    }
    return result
  }, [companies, regionFilter, sortConfig])

  const stats = useMemo(() => {
    const counts = { total: companies.length, riyadh: 0, hail: 0, qassim: 0 }
    companies.forEach(c => {
      const regions = getCompanyRegions(c)
      if (regions.includes('الرياض')) counts.riyadh++
      if (regions.includes('حائل')) counts.hail++
      if (regions.includes('القصيم')) counts.qassim++
    })
    return counts
  }, [companies])

  const handleSort = (colIdx) => {
    const keys = ['', 'name', 'region', 'size', 'spec', 'web', 'contact', 'linkedin', 'training', 'grade', 'nonSaudi']
    const key = keys[colIdx]
    if (!key) return

    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const toggleCol = (colIdx) => {
    setVisibleCols(prev => ({ ...prev, [colIdx]: !prev[colIdx] }))
  }

  const badgeRegion = (r) => {
    const classes = {
      'الرياض': 'badge-riyadh',
      'حائل': 'badge-hail',
      'القصيم': 'badge-qassim'
    }
    return <span className={`badge ${classes[r] || 'badge-multiple'}`}>{r}</span>
  }

  const badgeRegions = (regions) => {
    if (!regions.length) return <span style={{ color: '#ccc' }}>—</span>
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {regions.map((r) => (
          <span key={r}>{badgeRegion(r)}</span>
        ))}
      </div>
    )
  }

  const badgeSize = (s) => {
    const classes = {
      'كبيرة': 'badge-large',
      'حكومية': 'badge-gov',
      'متوسطة': 'badge-medium',
      'ناشئة': 'badge-startup'
    }
    return <span className={`badge ${classes[s] || 'badge-sme'}`}>{s === 'كبيرة' || s === 'حكومية' || s === 'متوسطة' || s === 'ناشئة' ? s : 'صغيرة'}</span>
  }

  const badgeGrade = (g) => {
    if (!g || g === '—') return <span style={{ color: '#ccc' }}>—</span>
    const classes = { 'A+': 'badge-aplus', 'A': 'badge-a', 'B': 'badge-b' }
    return <span className={`badge ${classes[g] || ''}`}>{g}</span>
  }

  const badgeNonSaudi = (n) => {
    if (!n || n === 'غير معروف') return <span className="badge badge-maybe">غير معروف</span>
    if (n.startsWith('نعم')) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="badge badge-yes">نعم متاح</span>
          <small style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{n.replace(/^نعم\s*[—–-]?\s*/, '')}</small>
        </div>
      )
    }
    if (n.includes('محتمل') || n.includes('محدود')) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="badge badge-maybe">محتمل</span>
          <small style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
            {n.replace(/^محتمل\s*[—–-]?\s*/, '').replace(/^محدود\s*[—–-]?\s*/, '')}
          </small>
        </div>
      )
    }
    return <span className="badge badge-maybe">{n}</span>
  }

  const linkify = (url, label) => {
    if (!url || url === '—') return <span style={{ color: '#ccc' }}>—</span>
    const href = url.startsWith('http') ? url : `https://${url}`
    let text = label || url.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    if (text.length > 25) text = text.substring(0, 22) + '...'
    return <a href={href} target="_blank" rel="noopener noreferrer">{text}</a>
  }

  const isH = (colIdx) => !visibleCols[colIdx] ? 'hidden-col' : ''

  const handleCopy = (text) => {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg(`تم نسخ: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`)
      setTimeout(() => setCopyMsg(''), 2000)
    })
  }

  return (
    <div dir="rtl">
      <div className="header">
        <h1>دليل شركات التقنية</h1>
        <p>الرياض · حائل · القصيم — دليل شامل لفرص التدريب الصيفي والتعاوني لعام 2026</p>
      </div>

      <div className="stats-bar">
        <div className="stat"><span className="num">{stats.total}</span><span className="label">إجمالي الشركات</span></div>
        <div className="stat"><span className="num">{stats.riyadh}</span><span className="label">الرياض</span></div>
        <div className="stat"><span className="num">{stats.hail}</span><span className="label">حائل</span></div>
        <div className="stat"><span className="num">{stats.qassim}</span><span className="label">القصيم</span></div>
      </div>

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
                { id: 9, label: 'التقييم' },
                { id: 10, label: 'غير السعوديين' }
              ].map(col => (
                <label key={col.id} className="col-item">
                  <input
                    type="checkbox"
                    checked={visibleCols[col.id]}
                    onChange={() => toggleCol(col.id)}
                  /> {col.label}
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
                        <th className={isH(9)} onClick={() => handleSort(9)}>التقييم</th>
                        <th className={isH(10)} onClick={() => handleSort(10)}>غير السعوديين</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((c, i) => (
                        <tr key={i}>
                          <td onClick={() => handleCopy(i + 1)}>{i + 1}</td>
                          <td onClick={() => handleCopy(`${c.name} ${c.spec}`)}>
                            <div className="company-info">
                              <span className="company-name">{c.name}</span>
                              <span className="company-spec">{c.spec}</span>
                            </div>
                          </td>
                          <td className={isH(2)} onClick={() => handleCopy(getRegionText(c))}>{badgeRegions(getCompanyRegions(c))}</td>
                          <td className={isH(3)} onClick={() => handleCopy(c.size)}>{badgeSize(c.size)}</td>
                          <td className={isH(5)} onClick={() => handleCopy(c.web)}>{linkify(c.web)}</td>
                          <td className={isH(6)} onClick={() => handleCopy(c.contact)}>
                            <div className="contact-cell" title={c.contact || ''}>{c.contact || '—'}</div>
                          </td>
                          <td className={isH(7)} onClick={() => handleCopy(c.linkedin)}>{c.linkedin ? linkify(c.linkedin, 'لينكد إن') : '—'}</td>
                          <td className={isH(8)} onClick={() => handleCopy(c.training)}>
                            <div className="training-cell" title={c.training || ''}>{c.training || '—'}</div>
                          </td>
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
                {filteredCompanies.map((c, i) => (
                  <div className="m-card" key={i}>
                    <div className="m-header">
                      <div className="m-title">{c.name}</div>
                      {badgeGrade(c.grade)}
                    </div>
                    <div className="m-grid">
                      <div className="m-item"><span className="m-label">المنطقة</span><span className="m-value">{badgeRegions(getCompanyRegions(c))}</span></div>
                      <div className="m-item"><span className="m-label">الحجم</span><span className="m-value">{badgeSize(c.size)}</span></div>
                      <div className="m-item"><span className="m-label">الموقع</span><span className="m-value">{linkify(c.web)}</span></div>
                      <div className="m-item">
                        <span className="m-label">التواصل</span>
                        <span className="m-value" style={{ fontSize: '0.8rem' }}>{c.contact || '—'}</span>
                      </div>
                      <div className="m-item">
                        <span className="m-label">لينكد إن</span>
                        <span className="m-value">{c.linkedin ? linkify(c.linkedin, 'لينكد إن') : '—'}</span>
                      </div>
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
            <p>جرب تغيير كلمات البحث أو الفلاتر المختارة</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
