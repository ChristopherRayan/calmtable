// Helpers for normalizing media paths and deciding when Next image optimization should be bypassed.
const LOCAL_MEDIA_HOSTS = new Set(['localhost', '127.0.0.1']);
const REMOTE_BYPASS_OPTIMIZATION_HOSTS = new Set(['images.unsplash.com']);
const UNSPLASH_FALLBACK = '/images/food-placeholder.svg';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

function getMediaOrigin() {
  if (typeof window !== 'undefined') {
    if (!API_BASE_URL || API_BASE_URL.startsWith('/') || API_BASE_URL.startsWith('.')) {
      return window.location.origin;
    }
  }

  try {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return '';
  }
}

const MEDIA_ORIGIN = getMediaOrigin();

function toMediaAbsolute(pathWithQueryHash: string): string {
  if (!MEDIA_ORIGIN) {
    return pathWithQueryHash;
  }
  return `${MEDIA_ORIGIN}${pathWithQueryHash}`;
}

export function normalizeImageSource(src: string): string {
  if (!src) {
    return '';
  }

  const value = src.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('/media/')) {
    return toMediaAbsolute(value);
  }

  if (value.startsWith('media/')) {
    return toMediaAbsolute(`/${value}`);
  }

  if (value.startsWith('/') || value.startsWith('blob:') || value.startsWith('data:')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname.toLowerCase() === 'images.unsplash.com') {
      return value;
    }
    if (LOCAL_MEDIA_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith('/media/')) {
      return toMediaAbsolute(`${parsed.pathname}${parsed.search}${parsed.hash}`);
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
    const hostname = parsed.hostname.toLowerCase();
    if (LOCAL_MEDIA_HOSTS.has(hostname) && parsed.pathname.startsWith('/media/')) {
      return true;
    }

    // Avoid Next.js server-side optimizer timeouts for remote CDNs in local dev.
    if (REMOTE_BYPASS_OPTIMIZATION_HOSTS.has(hostname)) {
      return true;
    }

    // For non-local remote hosts, prefer direct browser loading over proxy optimization.
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return !LOCAL_MEDIA_HOSTS.has(hostname);
    }

    return false;
  } catch (_error) {
    return false;
  }
}
