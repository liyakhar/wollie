export type LoginSearch = {
  signup?: '1'
  redirect?: string
  art?: 1 | 2 | 3 | 4
}

export function loginSearch(options?: {
  signup?: boolean
  redirect?: string
}): LoginSearch {
  return {
    signup: options?.signup ? '1' : undefined,
    redirect: options?.redirect,
  }
}

export function loginRedirectPath(pathname: string) {
  return pathname.startsWith('/login') || pathname.startsWith('/welcome')
    ? '/app'
    : pathname
}
