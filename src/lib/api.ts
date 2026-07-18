import { getStoredUser } from '@/lib/auth-storage'
import type { AuthUser } from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export class ApiError extends Error {}

/**
 * The Apps Script backend responds to every request with a 302 redirect to
 * a pre-rendered script.googleusercontent.com URL (its "echo" mechanism) —
 * fetch()'s default redirect handling follows this transparently for both
 * GET and POST, so no special handling is needed here.
 */
async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiResponse<T>
  if (!body.success) throw new ApiError(body.error)
  return body.data
}

function requireUserId(): string {
  const user = getStoredUser()
  if (!user) throw new ApiError('Not signed in')
  return user.id
}

export async function apiGet<T>(
  action: string,
  params: Record<string, string> = {},
): Promise<T> {
  const query = new URLSearchParams({ action, userId: requireUserId(), ...params })
  const res = await fetch(`${API_BASE_URL}?${query.toString()}`)
  return parseResponse<T>(res)
}

/**
 * Content-Type is deliberately text/plain: Apps Script's ContentService has
 * no API to set CORS response headers, so the only way this works
 * cross-origin from a browser is by avoiding the CORS preflight entirely —
 * application/json would trigger one that Apps Script can't answer. The
 * server parses the body as JSON regardless of the declared content type.
 */
export async function apiPost<T>(action: string, payload?: unknown): Promise<T> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, userId: requireUserId(), payload }),
  })
  return parseResponse<T>(res)
}

export async function apiLogin(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'login', username, password }),
  })
  return parseResponse<AuthUser>(res)
}
