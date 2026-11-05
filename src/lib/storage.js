import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'vocabulary-bank.words.v1'
const TABLE = 'words'

export const storageMode = isSupabaseConfigured ? 'supabase' : 'local'

const VALID_STATUSES = ['learning', 'learned']

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeStatus(status) {
  if (status === 'mastered' || status === 'learned') return 'learned'
  if (status === 'learning' || status === 'new') return 'learning'
  return 'learning'
}

function legacyExplanation(entry) {
  const parts = []
  if (typeof entry.meaning === 'string' && entry.meaning.trim()) {
    parts.push(`Meaning: ${entry.meaning.trim()}`)
  }
  if (typeof entry.example === 'string' && entry.example.trim()) {
    parts.push(`Example: ${entry.example.trim()}`)
  }
  return parts.join('\n\n')
}

function normalizeExplanation(entry) {
  if (typeof entry.explanation === 'string') return entry.explanation
  return legacyExplanation(entry)
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    word: entry.word,
    explanation: normalizeExplanation(entry),
    status: normalizeStatus(entry.status),
    createdAt: entry.createdAt ?? Date.now(),
  }
}

function normalizeRow(row) {
  return {
    id: row.id,
    word: row.word,
    explanation: typeof row.explanation === 'string' ? row.explanation : '',
    status: normalizeStatus(row.status),
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

function readLocalWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.word === 'string' &&
          VALID_STATUSES.includes(normalizeStatus(entry.status)),
      )
      .map(normalizeEntry)
  } catch {
    return []
  }
}

function writeLocalWords(words) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  } catch {
    // Storage may be unavailable (private mode, full quota) — the app still works.
  }
}

export async function listWords() {
  if (!supabase) return readLocalWords()

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, word, explanation, status, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(normalizeRow)
}

export async function createWord({ word, explanation, status }) {
  const nextExplanation =
    typeof explanation === 'string' ? explanation.trim() : ''

  if (!supabase) {
    const entry = {
      id: createId(),
      word,
      explanation: nextExplanation,
      status: normalizeStatus(status),
      createdAt: Date.now(),
    }
    writeLocalWords([entry, ...readLocalWords()])
    return entry
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      word,
      explanation: nextExplanation,
      status: normalizeStatus(status),
    })
    .select('id, word, explanation, status, created_at')
    .single()

  if (error) throw error
  return normalizeRow(data)
}

export async function updateWordExplanation(id, explanation) {
  const nextExplanation =
    typeof explanation === 'string' ? explanation.trim() : ''

  if (!supabase) {
    writeLocalWords(
      readLocalWords().map((entry) =>
        entry.id === id ? { ...entry, explanation: nextExplanation } : entry,
      ),
    )
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      explanation: nextExplanation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function setWordStatus(id, status) {
  const nextStatus = normalizeStatus(status)

  if (!supabase) {
    writeLocalWords(
      readLocalWords().map((entry) =>
        entry.id === id ? { ...entry, status: nextStatus } : entry,
      ),
    )
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function removeWord(id) {
  if (!supabase) {
    writeLocalWords(readLocalWords().filter((entry) => entry.id !== id))
    return
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id)

  if (error) throw error
}
