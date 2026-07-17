/**
 * Simulates network latency for the mock services layer.
 * Swap the services layer for real API calls later — callers never
 * need to change since they only depend on the returned Promise.
 */
export function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
