// Helpers for normalizing media paths and deciding when Next image optimization should be bypassed.
const LOCAL_MEDIA_HOSTS = new Set(['localhost', '127.0.0.1', 'nginx', 'backend']);

export function normalizeImageSource(src: string): string {
  if (!src) {
    return '';
  }

  const value = src.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('/') || value.startsWith('blob:') || value.startsWith('data:')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (LOCAL_MEDIA_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith('/media/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return value;
  } catch (_error) {
    return value;
  }
}

export function shouldSkipImageOptimization(src: string): boolean {
  const normalized = normalizeImageSource(src);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('blob:') || normalized.startsWith('data:') || normalized.startsWith('/media/')) {
    return true;
  }

  try {
    const parsed = new URL(normalized);
    return LOCAL_MEDIA_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith('/media/');
  } catch (_error) {
    return false;
  }
}
