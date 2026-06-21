import 'package:quickgo_shared_api/quickgo_api_client.dart';

class QuickGoAuthRepository {
  QuickGoAuthRepository(this._api);

  final QuickGoApiClient _api;

  Future<void> sendOtp(String phone) async {
    await _api.postMap('/auth/send-otp', {
      'phone': phone,
      'purpose': 'LOGIN',
    });
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) {
    return _api.postMap('/auth/verify-otp', {
      'phone': phone,
      'otp': otp,
      'device': {
        'platform': 'ANDROID',
        'app_version': '1.0.0',
      },
    });
  }
}

