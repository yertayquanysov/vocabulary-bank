const API_KEY_STORAGE = 'vocabulary-bank.gemini-key'
const MODEL = 'gemini-3.8-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    english: {
      type: 'OBJECT',
      properties: {
        meaning: { type: 'STRING' },
        examples: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['meaning', 'examples'],
    },
    russian: {
      type: 'OBJECT',
      properties: {
        meaning: { type: 'STRING' },
        examples: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['meaning', 'examples'],
    },
  },
  required: ['english', 'russian'],
}

export function getGeminiApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function saveGeminiApiKey(key) {
  try {
    localStorage.setItem(API_KEY_STORAGE, key.trim())
  } catch {
    // Storage may be unavailable; generation still works for this session.
  }
}

export function clearGeminiApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE)
  } catch {
    // Ignore unavailable storage.
  }
}

function buildPrompt(word) {
  return `You are helping a vocabulary learner study the English word "${word}".

Return:
1. A clear, concise English definition of the word.
2. Three natural English example sentences that use the word.
3. A clear, concise Russian translation or definition of the word.
4. Three natural Russian example sentences that use the Russian translation.

Keep the meanings short enough to fit on a flashcard. Use the exact word in each English example. Return only JSON that matches the schema.`
}

function formatSection(title, meaning, examples) {
  const lines = [title, `Meaning: ${meaning || '—'}`, 'Examples:']
  const cleaned = (Array.isArray(examples) ? examples : [])
    .map((example) => String(example).trim())
    .filter(Boolean)

  if (cleaned.length === 0) {
    lines.push('- —')
  } else {
    for (const example of cleaned) lines.push(`- ${example}`)
  }

  return lines.join('\n')
}

function formatExplanation(data) {
  return [
    formatSection('English', data?.english?.meaning, data?.english?.examples),
    formatSection('Russian', data?.russian?.meaning, data?.russian?.examples),
  ].join('\n\n')
}

function friendlyError(status, message) {
  if (status === 400 || status === 401 || status === 403) {
    return 'Gemini rejected the API key or request. Check the key and try again.'
  }
  if (status === 404) {
    return 'Gemini model not found. The app may need a newer model name.'
  }
  if (status === 429) {
    return 'Gemini rate limit reached. Wait a moment and try again.'
  }
  if (status >= 500) {
    return 'Gemini is unavailable right now. Try again shortly.'
  }
  return message || 'Could not generate an explanation.'
}

export async function generateWordExplanation(word, apiKey) {
  const trimmedWord = word.trim()
  const trimmedKey = apiKey.trim()

  if (!trimmedWord) throw new Error('Enter a word first.')
  if (!trimmedKey) throw new Error('Add your Gemini API key first.')

  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': trimmedKey,
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: buildPrompt(trimmedWord) }] },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
        },
      }),
    })
  } catch {
    throw new Error(
      'Could not reach Gemini. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    let message = ''
    try {
      const payload = await response.json()
      message = payload?.error?.message || ''
    } catch {
      // Ignore a non-JSON error body.
    }
    throw new Error(friendlyError(response.status, message))
  }

  const payload = await response.json()
  const text = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part?.text ?? '')
    .join('')
    .trim()

  if (!text) {
    const reason = payload?.promptFeedback?.blockReason
    throw new Error(
      reason
        ? `Gemini blocked this request (${reason}). Try a different word.`
        : 'Gemini returned no result. Try again.',
    )
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned an unexpected response. Try again.')
  }

  return formatExplanation(data)
}
