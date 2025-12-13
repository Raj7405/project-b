/**
 * Helper function to make authenticated API calls
 * Automatically includes access token and refresh token in headers
 */

import { API_URL } from './constants'

interface AuthenticatedFetchOptions extends RequestInit {
  accessToken?: string | null
  refreshToken?: string | null
}

export const authenticatedFetch = async (
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> => {
  const { accessToken, refreshToken, headers = {}, ...restOptions } = options

  // Add authentication headers if tokens are provided
  const authHeaders: HeadersInit = { ...headers }
  
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`
  }
  
  if (refreshToken) {
    authHeaders['x-refresh-token'] = refreshToken
  }

  // Make sure URL is absolute or relative to API_URL
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`

  return fetch(fullUrl, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  })
}

/**
 * Helper to handle API responses with automatic error handling
 */
export const handleApiResponse = async <T = any>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

