String resolveMediaUrl(String? path, String apiBaseUrl) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  var base = apiBaseUrl.replaceAll('/api/v1', '');
  if (base.endsWith('/')) {
    base = base.substring(0, base.length - 1);
  }
  return '$base${path.startsWith('/') ? '' : '/'}$path';
}
