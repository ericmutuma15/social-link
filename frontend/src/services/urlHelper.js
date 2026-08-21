export function resolveAsset(path) {
  if (!path) return '/default-profile.png';
  // Already absolute or root-relative
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export default resolveAsset;
