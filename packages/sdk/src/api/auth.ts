import type { HttpClient } from '../http/client.js'
import type { AuthResponse, UserDto } from '@ptas/contracts'

export interface UpdateProfileArgs {
  fullName?: string
  username?: string
  phone?: string | null
  profileImage?: string | null
}

export interface AuthApi {
  loginWithCredentials(username: string, password: string): Promise<AuthResponse>
  loginWithTelegram(initData: string): Promise<AuthResponse>
  logout(): Promise<null>
  getProfile(): Promise<UserDto>
  updateProfile(args: UpdateProfileArgs): Promise<UserDto>
  changePassword(currentPassword: string, newPassword: string): Promise<null>
}

export function createAuthApi(http: HttpClient): AuthApi {
  return {
    loginWithCredentials: (username, password) =>
      http.post('/auth/login', { username, password }),

    loginWithTelegram: (initData) =>
      http.post('/auth/telegram', { initData }),

    logout: () => http.post('/auth/logout', {}),

    getProfile: () => http.get('/auth/me'),

    updateProfile: ({ fullName, username, phone, profileImage } = {}) => {
      const body: Record<string, unknown> = {}
      if (fullName     !== undefined) body.fullName = fullName
      if (username     !== undefined) body.username = username
      if (phone        !== undefined) body.phone = phone
      if (profileImage !== undefined) body.profileImage = profileImage
      return http.patch('/auth/me', body)
    },

    changePassword: (currentPassword, newPassword) =>
      http.post('/auth/password', { currentPassword, newPassword }),
  }
}
