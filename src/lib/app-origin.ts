/**
 * The iPhone app carries its screens inside it and talks to the Wollie server
 * over the network. The app build sets VITE_NATIVE_API_ORIGIN to that server;
 * the website leaves it empty and keeps calling its own address.
 */
export const NATIVE_API_ORIGIN: string = import.meta.env.VITE_NATIVE_API_ORIGIN ?? ''

/** Header the app adds to its server calls; browsers cannot add it cross-site. */
export const NATIVE_APP_HEADER = 'x-wollie-app'

/** The full server address for a path, or the path itself on the website. */
export function apiUrl(path: string) {
  return NATIVE_API_ORIGIN ? new URL(path, NATIVE_API_ORIGIN).toString() : path
}
