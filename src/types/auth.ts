export type Role = 'admin' | 'tutor'

export interface AuthUser {
  id: string
  username: string
  role: Role
  assignedClass: string
}
