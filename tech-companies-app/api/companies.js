import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { companies as seedCompanies } from '../src/data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbDir = path.join(__dirname, '..', 'data')
const dbFile = path.join(dbDir, 'companies-db.json')

function json(res, statusCode, body) {
  res.status(statusCode).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.send(JSON.stringify(body))
}

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

function getSeedDb() {
  return {
    companies: seedCompanies.map((c, idx) => normalizeCompany(c, idx)),
    archived: [],
    updatedAt: new Date().toISOString(),
  }
}

async function readDb() {
  try {
    const raw = await fs.readFile(dbFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.companies) && Array.isArray(parsed.archived)) {
      return {
        companies: parsed.companies.map((c, idx) => normalizeCompany(c, idx)),
        archived: parsed.archived.map((c, idx) => normalizeCompany(c, idx + 10000)),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      }
    }
    return getSeedDb()
  } catch {
    return getSeedDb()
  }
}

async function writeDb(payload) {
  await fs.mkdir(dbDir, { recursive: true })
  await fs.writeFile(dbFile, JSON.stringify(payload, null, 2), 'utf8')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await readDb()
    return json(res, 200, db)
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body || {}
      const companies = Array.isArray(body.companies) ? body.companies.map((c, idx) => normalizeCompany(c, idx)) : []
      const archived = Array.isArray(body.archived) ? body.archived.map((c, idx) => normalizeCompany(c, idx + 10000)) : []

      if (!companies.length && !archived.length) {
        return json(res, 400, { error: 'Invalid payload: companies and archived are empty.' })
      }

      const payload = {
        companies,
        archived,
        updatedAt: new Date().toISOString(),
      }

      await writeDb(payload)
      return json(res, 200, payload)
    } catch (error) {
      return json(res, 500, {
        error: 'Write failed. This deployment may be read-only (serverless filesystem).',
        details: String(error?.message || error),
      })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return json(res, 405, { error: 'Method not allowed' })
}
