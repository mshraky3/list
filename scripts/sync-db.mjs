import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { companies as seedCompanies } from '../src/data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '..', 'public')
const dbPath = path.join(publicDir, 'companies-db.json')

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

const payload = {
    companies: seedCompanies.map((company, idx) => normalizeCompany(company, idx)),
    archived: [],
    updatedAt: new Date().toISOString(),
}

await fs.mkdir(publicDir, { recursive: true })
await fs.writeFile(dbPath, JSON.stringify(payload, null, 2), 'utf8')
console.log(`Synced ${payload.companies.length} companies to ${dbPath}`)
