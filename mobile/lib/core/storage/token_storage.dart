import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  TokenStorage(this._storage);
  final FlutterSecureStorage _storage;
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  Future<String?> accessToken() => _storage.read(key: _accessKey);
  Future<String?> refreshToken() => _storage.read(key: _refreshKey);
  Future<void> save({required String accessToken, required String refreshToken}) =>
      _storage.write(key: _accessKey, value: accessToken).then(
        (_) => _storage.write(key: _refreshKey, value: refreshToken),
      );
  Future<void> clear() => _storage.deleteAll();
}
