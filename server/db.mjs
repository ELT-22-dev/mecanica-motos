import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { TABLES } from './schema.mjs'

const DB_PATH = process.env.DB_PATH || 'data/motomanage.db'

const dir = dirname(DB_PATH)
if (dir && dir !== '.' && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true })
}

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

for (const table of Object.values(TABLES)) {
  db.exec(table.createSql)
  for (const indexSql of table.indexes) {
    db.exec(indexSql)
  }
}
