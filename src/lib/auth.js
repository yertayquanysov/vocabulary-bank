import { supabase } from './supabase'

export function getSession() {
  if (!supabase) return Promise.resolve(null)

  return supabase.auth.getSession().then(({ data, error }) => {
    if (error) throw error
    return data.session
  })
}

export function onAuthChange(callback) {
  if (!supabase) return () => {}

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => data.subscription.unsubscribe()
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
}

export async function signOut() {
  if (!supabase) return

  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
