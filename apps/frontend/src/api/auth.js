import { api } from './client.js'

export const authApi = {
  loginWithCredentials: (username, password) =>
    api.post('/auth/login', { username, password }),

  loginWithTelegram: (initData) =>
    api.post('/auth/telegram', { initData }),

  logout: () => api.post('/auth/logout', {}),

  getProfile: () => api.get('/auth/me'),

  updateProfile: ({ fullName, username, phone, profileImage } = {}) => {
    const body = {}
    if (fullName !== undefined)     body.fullName = fullName
    if (username !== undefined)     body.username = username
    if (phone !== undefined)        body.phone = phone
    if (profileImage !== undefined) body.profileImage = profileImage
    return api.patch('/auth/me', body)
  },

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/password', { currentPassword, newPassword }),
}
