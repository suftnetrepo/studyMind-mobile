import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabaseSync('studymind_notes.db')

export interface Note {
  id:         string
  module_id:  string
  course_code?: string  // captured at creation time — display source of truth,
                        // never re-derived from the (mutable) active-module store
  title:      string
  content:    string
  created_at: string
  updated_at: string
  synced:     boolean   // true once uploaded to backend
  document_id?: string  // backend document ID after sync
}

export function initNotesDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      module_id   TEXT NOT NULL,
      course_code TEXT,
      title       TEXT NOT NULL DEFAULT 'My Notes',
      content     TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      synced      INTEGER NOT NULL DEFAULT 0,
      document_id TEXT
    );
  `)
  migrateNotesDB()
}

// CREATE TABLE IF NOT EXISTS is a no-op once the table already exists on a
// device — it never retroactively adds new columns. So each column added
// after the table first shipped needs an explicit ALTER TABLE, guarded by
// checking PRAGMA table_info (SQLite has no "ADD COLUMN IF NOT EXISTS").
function migrateNotesDB() {
  const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(notes)')
  const existing = new Set(columns.map((c) => c.name))

  if (!existing.has('course_code')) {
    db.execSync('ALTER TABLE notes ADD COLUMN course_code TEXT')
  }
}

// SQLite has no boolean type — `synced` comes back from every read as the
// raw INTEGER 0/1, not a real boolean, no matter what the Note type claims.
// Left uncoerced, `{note.synced && <Text>...</Text>}` renders the literal
// number 0 as a bare child outside any <Text> ("Text strings must be
// rendered within a <Text> component"). Coerce once here so every caller
// gets an honest boolean and that class of bug can't recur anywhere else.
function coerceNote(row: any): Note {
  return { ...row, synced: !!row.synced }
}

export function getNotesByModule(moduleId: string): Note[] {
  const rows = db.getAllSync<Note>(
    'SELECT * FROM notes WHERE module_id = ? ORDER BY updated_at DESC',
    [moduleId],
  )
  return rows.map(coerceNote)
}

export function getNoteById(id: string): Note | null {
  const row = db.getFirstSync<Note>('SELECT * FROM notes WHERE id = ?', [id])
  return row ? coerceNote(row) : null
}

export function saveNote(note: Note): void {
  db.runSync(
    `INSERT OR REPLACE INTO notes
     (id, module_id, course_code, title, content, created_at, updated_at, synced, document_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.module_id, note.course_code || null, note.title, note.content,
     note.created_at, note.updated_at, note.synced ? 1 : 0, note.document_id || null],
  )
}

export function updateNoteContent(id: string, content: string, title: string): void {
  db.runSync(
    'UPDATE notes SET content = ?, title = ?, updated_at = ?, synced = 0 WHERE id = ?',
    [content, title, new Date().toISOString(), id],
  )
}

export function markNoteSynced(id: string, documentId: string): void {
  db.runSync(
    'UPDATE notes SET synced = 1, document_id = ? WHERE id = ?',
    [documentId, id],
  )
}

export function deleteNote(id: string): void {
  db.runSync('DELETE FROM notes WHERE id = ?', [id])
}
