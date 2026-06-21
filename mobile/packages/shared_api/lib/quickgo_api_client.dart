import 'package:dio/dio.dart';

class QuickGoApiClient {
  QuickGoApiClient({
    String baseUrl = 'http://localhost:3000/api/v1',
    Dio? dio,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 12),
                receiveTimeout: const Duration(seconds: 12),
                headers: {'Content-Type': 'application/json'},
              ),
            );

  final Dio _dio;

  void setBearerToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  Future<Map<String, dynamic>> getMap(String path) async {
    final response = await _dio.get<Map<String, dynamic>>(path);
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }

  Future<List<dynamic>> getList(String path) async {
    final response = await _dio.get<Map<String, dynamic>>(path);
    return response.data?['data'] as List<dynamic>? ?? const [];
  }

  Future<Map<String, dynamic>> postMap(
    String path,
    Map<String, dynamic> body, {
    String? idempotencyKey,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      path,
      data: body,
      options: Options(
        headers: {
          if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
        },
      ),
    );
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }

  Future<Map<String, dynamic>> patchMap(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(path, data: body);
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final response = await _dio.delete<Map<String, dynamic>>(path);
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }
}

