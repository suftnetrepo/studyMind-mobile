import { useState, useCallback, useEffect } from 'react'
import { useToast, useLoader } from 'fluent-styles'
import * as FileSystem from 'expo-file-system'
import * as Crypto from 'expo-crypto'
import { moduleService } from '../services/api'
import {
  Note, getNotesByModule, saveNote, updateNoteContent,
  markNoteSynced, deleteNote as deleteNoteDB, initNotesDB,
} from '../db/notes'

export function useNotes(moduleId: string | null) {
  const [notes,   setNotes]   = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const toast  = useToast()
  const loader = useLoader()

  const loadNotes = useCallback(() => {
    if (!moduleId) return
    initNotesDB()
    const result = getNotesByModule(moduleId)
    setNotes(result)
  }, [moduleId])

  useEffect(() => { loadNotes() }, [loadNotes])

  const createNote = (courseCode?: string, title?: string): Note => {
    if (!moduleId) throw new Error('No module selected')
    const now  = new Date().toISOString()
    const note: Note = {
      id:         Crypto.randomUUID(),
      module_id:  moduleId,
      course_code: courseCode,
      title:      title || 'New note',
      content:    '',
      created_at: now,
      updated_at: now,
      synced:     false,
    }
    saveNote(note)
    loadNotes()
    return note
  }

  const updateNote = (id: string, content: string) => {
    // Auto-title from first line of content
    const firstLine = content.split('\n')[0].slice(0, 60) || 'My note'
    updateNoteContent(id, content, firstLine)
    loadNotes()
  }

  const syncNoteToBackend = async (note: Note) => {
    if (!moduleId) return
    const loadId = loader.show({ label: 'Saving to AI…', variant: 'dots' })
    try {
      // Write note content to a temp file
      const filename = `note_${note.id.slice(0, 8)}.txt`
      const uri      = FileSystem.cacheDirectory + filename
      await FileSystem.writeAsStringAsync(uri, note.content, {
        encoding: FileSystem.EncodingType.UTF8,
      })
      // Upload as personal document
      const res = await moduleService.uploadDocument(
        moduleId,
        { uri, name: filename, type: 'text/plain' },
        'personal',
      )
      markNoteSynced(note.id, res.document_id)
      loadNotes()
      toast.success('Saved to AI!', 'Your note is now searchable by the AI tutor.')
    } catch (e: any) {
      toast.error('Sync failed', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const deleteNote = (id: string) => {
    deleteNoteDB(id)
    loadNotes()
  }

  return { notes, loading, loadNotes, createNote, updateNote, syncNoteToBackend, deleteNote }
}
