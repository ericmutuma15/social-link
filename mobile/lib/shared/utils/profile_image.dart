import '../../core/config/app_config.dart';

String? resolveProfileImageUrl(String? imageUrl) {
  if (imageUrl == null || imageUrl.trim().isEmpty) return null;
  final value = imageUrl.trim();
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return '${AppConfig.apiBaseUrl}${value.startsWith('/') ? value : '/$value'}';
}
