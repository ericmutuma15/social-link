import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient(this._tokens)
      : dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 30),
          headers: const {'Accept': 'application/json', 'X-Mobile-Client': 'flutter'},
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokens.accessToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode != 401 || error.requestOptions.extra['retried'] == true) {
          handler.next(error);
          return;
        }
        final refresh = await _tokens.refreshToken();
        if (refresh == null) {
          handler.next(error);
          return;
        }
        try {
          final result = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl)).post<Map<String, dynamic>>(
            '/api/refresh',
            data: const {'mobile_client': true},
            options: Options(headers: {'Authorization': 'Bearer $refresh', 'X-Mobile-Client': 'flutter'}),
          );
          final data = result.data?['data'] as Map<String, dynamic>?;
          final access = data?['access_token'] as String?;
          if (access == null) throw const ApiException('Your session has expired.');
          await _tokens.save(accessToken: access, refreshToken: refresh);
          final request = error.requestOptions;
          request.extra['retried'] = true;
          request.headers['Authorization'] = 'Bearer $access';
          handler.resolve(await dio.fetch(request));
        } catch (_) {
          await _tokens.clear();
          handler.next(error);
        }
      },
    ));
  }

  final TokenStorage _tokens;
  final Dio dio;

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) => _request(() => dio.get(path, queryParameters: query));
  Future<Map<String, dynamic>> post(String path, {Object? data, ProgressCallback? onSendProgress}) => _request(() => dio.post(path, data: data, onSendProgress: onSendProgress));
  Future<Map<String, dynamic>> delete(String path) => _request(() => dio.delete(path));
  Future<Map<String, dynamic>> put(String path, {Object? data}) => _request(() => dio.put(path, data: data));
  Future<Map<String, dynamic>> patch(String path, {Object? data}) => _request(() => dio.patch(path, data: data));

  Future<Map<String, dynamic>> _request(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      final data = response.data;
      return data is Map<String, dynamic> ? data : {'data': data};
    } on DioException catch (error) {
      final payload = error.response?.data;
      final errors = payload is Map ? payload['errors'] : null;
      final message = payload is Map ? payload['message']?.toString() : null;
      final detail = errors is List && errors.isNotEmpty ? errors.join(' ') : null;
      throw ApiException(detail ?? message ?? _friendly(error), statusCode: error.response?.statusCode);
    }
  }

  String _friendly(DioException error) => switch (error.type) {
        DioExceptionType.connectionTimeout || DioExceptionType.connectionError => 'Please check your internet connection.',
        DioExceptionType.receiveTimeout => 'The server took too long to respond. Please try again.',
        _ => 'Something went wrong. Please try again.',
      };
}
