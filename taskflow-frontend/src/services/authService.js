import { supabase } from './supabaseClient'

export const authService = {
  // Регистрация
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return data
  },

  // Вход
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  // Выход
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Получить текущего пользователя
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Получить сессию
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Подписка на изменения аутентификации
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}