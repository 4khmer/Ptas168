import type { HttpClient } from '../http/client.js'

export interface UploadResponse {
  url: string
  filename: string
  size: number
  mimetype: string
}

export interface UploadsApi {
  upload(file: Blob | File, fieldName?: string): Promise<UploadResponse>
}

export function createUploadsApi(http: HttpClient): UploadsApi {
  return {
    upload: (file, fieldName = 'file') => {
      const form = new FormData()
      form.append(fieldName, file)
      return http.upload<UploadResponse>('/uploads', form)
    },
  }
}
