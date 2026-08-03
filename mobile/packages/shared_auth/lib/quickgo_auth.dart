import 'package:quickgo_shared_api/quickgo_api_client.dart';

class QuickGoAuthRepository {
  QuickGoAuthRepository(this._api);

  final QuickGoApiClient _api;

  /// Normalize an Indian mobile input to +91XXXXXXXXXX
  /// Throws [FormatException] on invalid input.
  static String normalizeIndianPhone(String input) {
    final digits = input.replaceAll(RegExp(r'\D'), '');
    String ten;
    if (digits.length == 12 && digits.startsWith('91')) {
      ten = digits.substring(2);
    } else if (digits.length == 11 && digits.startsWith('0')) {
      ten = digits.substring(1);
    } else if (digits.length == 10) {
      ten = digits;
    } else {
      throw FormatException('Please enter a valid Indian mobile number.');
    }
    if (ten.length != 10) throw FormatException('Please enter a valid Indian mobile number.');
    final first = ten[0];
    if (!(first == '6' || first == '7' || first == '8' || first == '9')) {
      throw FormatException('Please enter a valid Indian mobile number.');
    }
    return '+91' + ten;
  }

  Future<void> sendOtp(String phone) async {
    final normalized = normalizeIndianPhone(phone);
    await _api.postMap('/auth/send-otp', {
      'phone': normalized,
      'purpose': 'LOGIN',
    });
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp, {String? appContext}) {
    final normalized = normalizeIndianPhone(phone);
    return _api.postMap('/auth/verify-otp', {
      'phone': normalized,
      'otp': otp,
      if (appContext != null) 'appContext': appContext,
      'device': {
        'platform': 'ANDROID',
        'app_version': '1.0.0',
      },
    });
  }
}
