// Helpers for deciding when Next image optimization should be bypassed.
export function shouldSkipImageOptimization(src: string): boolean {
  if (!src) {
    return false;
  }

  const value = src.trim().toLowerCase();
  return (
    value.startsWith('/media/') ||
    value.includes('://localhost/media/') ||
    value.includes('://127.0.0.1/media/') ||
    value.includes('://nginx/media/') ||
    value.includes('://backend/media/') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')
  );
}
