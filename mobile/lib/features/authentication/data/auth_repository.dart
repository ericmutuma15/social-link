import '../../../core/network/api_client.dart';

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;

  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await _api.post('/api/login', data: {'email': email, 'password': password, 'mobile_client': true});
    return result['data'] as Map<String, dynamic>? ?? {};
  }

  Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final result = await _api.post('/api/register', data: {'name': name, 'email': email, 'password': password});
    return result['data'] as Map<String, dynamic>? ?? {};
  }

  Future<Map<String, dynamic>> currentUser() async {
    final result = await _api.get('/api/current_user');
    return result as Map<String, dynamic>? ?? {};
  }
}
