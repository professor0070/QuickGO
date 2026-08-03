import 'dart:convert';
import 'package:http/http.dart' as http;

class QuickGoApiClient {
  QuickGoApiClient({String? baseUrl, http.Client? client})
      : _baseUrl = baseUrl ?? 'http://10.38.163.97:3000/api/v1',
        _httpClient = client ?? http.Client();

  final String _baseUrl;
  final http.Client _httpClient;
  String? _token;

  String get baseUrl => _baseUrl;

  void setBearerToken(String token) {
    _token = token;
  }

  Map<String, String> _headers([Map<String, String>? extra]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  Future<Map<String, dynamic>> getMap(String path) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.get(uri, headers: _headers());
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>? ?? json;
    }
    throw Exception('GET $path failed (${response.statusCode}): ${response.body}');
  }

  Future<List<dynamic>> getList(String path) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.get(uri, headers: _headers());
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as List<dynamic>? ?? const [];
    }
    throw Exception('GET $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> postMap(
    String path,
    Map<String, dynamic> body, {
    String? idempotencyKey,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    final headers = _headers(idempotencyKey != null ? {'Idempotency-Key': idempotencyKey} : null);
    final response = await _httpClient.post(uri, headers: headers, body: jsonEncode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>? ?? json;
    }
    throw Exception('POST $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> patchMap(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.patch(uri, headers: _headers(), body: jsonEncode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>? ?? json;
    }
    throw Exception('PATCH $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.delete(uri, headers: _headers());
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>? ?? json;
    }
    throw Exception('DELETE $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> clear(String path) async {
    return delete(path);
  }

  Future<Map<String, dynamic>> _uploadMultipart(String path, String filePath, {String? token}) async {
    final uri = Uri.parse('$_baseUrl$path');
    final request = http.MultipartRequest('POST', uri);
    final authToken = token ?? _token;
    if (authToken != null) {
      request.headers['Authorization'] = 'Bearer $authToken';
    }
    request.files.add(await http.MultipartFile.fromPath('file', filePath));
    final streamed = await _httpClient.send(request);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>? ?? json;
    }
    throw Exception('Upload $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> uploadOwnAvatar(String filePath) async {
    return _uploadMultipart('/profile/avatar', filePath);
  }

  Future<List<int>> fetchOwnAvatarBytes() async {
    final uri = Uri.parse('$_baseUrl/profile/avatar/media');
    final response = await _httpClient.get(uri, headers: _headers());
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.bodyBytes;
    }
    throw Exception('Fetch avatar media failed (${response.statusCode})');
  }

  Future<Map<String, dynamic>> deleteOwnAvatar() async {
    return delete('/profile/avatar');
  }

  Future<Map<String, dynamic>> uploadRiderKycDocument(String documentType, String filePath) async {
    return _uploadMultipart('/partner/documents/upload', filePath);
  }

  Future<Map<String, dynamic>> uploadVendorComplianceDocument(String documentType, String filePath) async {
    return _uploadMultipart('/partner/documents/upload', filePath);
  }

  Future<Map<String, dynamic>> uploadProductMedia(String productId, String filePath) async {
    return _uploadMultipart('/vendor/products/$productId/image', filePath);
  }

  Future<Map<String, dynamic>> uploadFile(
    String path,
    String filePath, [
    dynamic arg3,
    dynamic arg4,
  ]) async {
    String? token;
    if (arg3 is String) token = arg3;
    if (arg4 is String) token = arg4;
    return _uploadMultipart(path, filePath, token: token);
  }

  Future<Map<String, dynamic>> get(String path, {String? token}) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('GET $path failed (${response.statusCode}): ${response.body}');
  }

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body, String? token}) async {
    final uri = Uri.parse('$_baseUrl$path');
    final response = await _httpClient.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: body != null ? jsonEncode(body) : null,
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('POST $path failed (${response.statusCode}): ${response.body}');
  }
}
