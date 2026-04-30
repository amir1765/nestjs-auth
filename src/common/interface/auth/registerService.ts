
export interface RegisterOutput {
    id: string
    email: string
    createdAt: Date
    fullName: string | null
    avatarUrl: string | null
}

export interface LoginOutput {
  accessToken: string
  refreshToken: string
  user:{id: string
   email: string
   createdAt: Date
   fullName: string | null
   avatarUrl: string | null}
}