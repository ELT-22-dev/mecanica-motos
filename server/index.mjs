import express from 'express'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { db } from './db.mjs'
import { TABLES } from './schema.mjs'

const PORT = process.env.PORT || 3001
const DIST_DIR = path.resolve('dist')

// Columns that behave like Supabase's `default now()` — filled in on insert
// only when the request doesn't already provide a value.
const DEFAULT_NOW_COLUMNS = ['created_at', 'updated_at', 'opened_at']

const app = express()
app.use(express.json({ limit: '50mb' }))

function tableMiddleware(req, res, next) {
  const table = TABLES[req.params.table]
  if (!table) return res.status(404).json({ error: `Unknown table: ${req.params.table}` })
  req.tableDef = table
  next()
}

/**
 * Builds { row, cols } for an insert. Only columns the request actually
 * provides (plus id/timestamp defaults) are included — a column left out of
 * `cols` is left out of the INSERT statement entirely, so SQLite's own
 * `default X` applies. Explicitly sending `null` for a NOT NULL DEFAULT
 * column would otherwise violate the constraint instead of falling back.
 */
function buildInsertRow(tableDef, data) {
  const row = { id: data.id || randomUUID() }
  const cols = ['id']
  for (const col of tableDef.columns) {
    if (DEFAULT_NOW_COLUMNS.includes(col)) {
      const provided = data[col]
      row[col] = provided === undefined || provided === null || provided === '' ? new Date().toISOString() : provided
      cols.push(col)
    } else if (col in data) {
      row[col] = data[col] === undefined ? null : data[col]
      cols.push(col)
    }
  }
  return { row, cols }
}

function parseOrderBy(raw, tableDef) {
  if (!raw) return ''
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return ''
  }
  const allowedCols = new Set(['id', ...tableDef.columns])
  const clauses = Object.entries(parsed)
    .filter(([col]) => allowedCols.has(col))
    .map(([col, dir]) => `"${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`)
  return clauses.length ? ` ORDER BY ${clauses.join(', ')}` : ''
}

app.get('/api/:table', tableMiddleware, (req, res) => {
  const orderBy = parseOrderBy(req.query.orderBy, req.tableDef)
  const rows = db.prepare(`SELECT * FROM "${req.params.table}"${orderBy}`).all()
  res.json(rows)
})

app.get('/api/:table/:id', tableMiddleware, (req, res) => {
  const row = db.prepare(`SELECT * FROM "${req.params.table}" WHERE id = ?`).get(req.params.id)
  res.json(row ?? null)
})

app.post('/api/:table/bulk', tableMiddleware, (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : []
  // Rows can vary in which optional fields they set, so each distinct column
  // shape gets its own prepared statement (cached per request — in practice
  // a CSV/backup import's rows share one shape, so this is usually just one).
  const stmtCache = new Map()
  const insertMany = db.transaction((items) => {
    const ids = []
    for (const item of items) {
      const { row, cols } = buildInsertRow(req.tableDef, item)
      const key = cols.join(',')
      let stmt = stmtCache.get(key)
      if (!stmt) {
        const placeholders = cols.map((c) => `@${c}`).join(', ')
        const updateCols = cols.filter((c) => c !== 'id')
        // ON CONFLICT DO UPDATE (rather than INSERT OR REPLACE) so restoring a
        // backup that reuses existing ids updates rows in place instead of
        // delete+reinsert, which would cascade-delete dependents via the FKs.
        const conflictAction = updateCols.length
          ? `DO UPDATE SET ${updateCols.map((c) => `"${c}" = excluded."${c}"`).join(', ')}`
          : 'DO NOTHING'
        stmt = db.prepare(
          `INSERT INTO "${req.params.table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})
           ON CONFLICT(id) ${conflictAction}`
        )
        stmtCache.set(key, stmt)
      }
      stmt.run(row)
      ids.push(row.id)
    }
    return ids
  })
  try {
    const ids = insertMany(rows)
    const saved = ids.length
      ? db.prepare(`SELECT * FROM "${req.params.table}" WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
      : []
    res.json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/:table', tableMiddleware, (req, res) => {
  const { row, cols } = buildInsertRow(req.tableDef, req.body || {})
  const placeholders = cols.map((c) => `@${c}`).join(', ')
  try {
    db.prepare(
      `INSERT INTO "${req.params.table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    ).run(row)
    const saved = db.prepare(`SELECT * FROM "${req.params.table}" WHERE id = ?`).get(row.id)
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.patch('/api/:table/:id', tableMiddleware, (req, res) => {
  const data = req.body || {}
  const cols = req.tableDef.columns.filter((c) => c in data)
  if (cols.length > 0) {
    const setClause = cols.map((c) => `"${c}" = @${c}`).join(', ')
    const params = { id: req.params.id }
    for (const c of cols) params[c] = data[c] === undefined ? null : data[c]
    try {
      db.prepare(`UPDATE "${req.params.table}" SET ${setClause} WHERE id = @id`).run(params)
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }
  }
  const row = db.prepare(`SELECT * FROM "${req.params.table}" WHERE id = ?`).get(req.params.id)
  res.json(row ?? null)
})

// Respond with a small JSON body (200) rather than 204 No Content — a bodyless
// response makes Chromium's DevTools Network panel flag the request as
// "net::ERR_ABORTED" even though it completed fine (a known, harmless Chromium
// quirk), which is confusing to see while diagnosing a real issue later.
app.delete('/api/:table/:id', tableMiddleware, (req, res) => {
  db.prepare(`DELETE FROM "${req.params.table}" WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

// Not-null id filter used by clearAllData (Supabase's `.not('id', 'is', null)`
// trick to delete every row) — plain DELETE without a WHERE does the same here.
app.delete('/api/:table', tableMiddleware, (req, res) => {
  db.prepare(`DELETE FROM "${req.params.table}"`).run()
  res.json({ ok: true })
})

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`MotoManage Pro server rodando em http://localhost:${PORT}`)
  if (!existsSync(DIST_DIR)) {
    console.log('(dist/ nao encontrado — rode "npm run build" antes de servir em producao)')
  }
})
