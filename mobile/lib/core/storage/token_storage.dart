import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  TokenStorage(this._storage);
  final FlutterSecureStorage _storage;
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  String? _accessToken;
  String? _refreshToken;
  var _loaded = false;

  /// Tokens survive app restarts only in the Android and iOS apps. Other
  /// targets retain them in memory for the current run, without writing them
  /// to browser or desktop storage.
  bool get _persistsOnThisDevice =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  Future<String?> accessToken() async {
    await _loadPersistedTokens();
    return _accessToken;
  }

  Future<String?> refreshToken() async {
    await _loadPersistedTokens();
    return _refreshToken;
  }

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _loaded = true;

    if (_persistsOnThisDevice) {
      await Future.wait([
        _storage.write(key: _accessKey, value: accessToken),
        _storage.write(key: _refreshKey, value: refreshToken),
      ]);
    }
  }

  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
    _loaded = true;

    if (_persistsOnThisDevice) {
      await Future.wait([
        _storage.delete(key: _accessKey),
        _storage.delete(key: _refreshKey),
      ]);
    }
  }

  Future<void> _loadPersistedTokens() async {
    if (_loaded) return;
    _loaded = true;
    if (!_persistsOnThisDevice) return;

    final tokens = await Future.wait([
      _storage.read(key: _accessKey),
      _storage.read(key: _refreshKey),
    ]);
    _accessToken = tokens[0];
    _refreshToken = tokens[1];
  }
}
