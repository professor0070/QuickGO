import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:quickgo_shared_api/quickgo_api_client.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';

final apiClientProvider = Provider<QuickGoApiClient>((ref) {
  return QuickGoApiClient();
});

final isFirebaseInitializedProvider = Provider<bool>((ref) {
  throw UnimplementedError('Override this provider in ProviderScope');
});

final authRepositoryProvider = Provider<QuickGoAuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return QuickGoAuthRepository(client);
});

class SessionState {
  SessionState({this.token, this.phone, this.userId, this.roles = const []});
  final String? token;
  final String? phone;
  final String? userId;
  final List<String> roles;

  bool get isAuthenticated => token != null;
  bool get isVendor => roles.contains('VENDOR_OWNER') || roles.contains('VENDOR_STAFF');
  bool get isRider => roles.contains('RIDER');
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._client) : super(SessionState());
  final QuickGoApiClient _client;

  void authenticate(String token, String phone, String userId, List<String> roles) {
    _client.setBearerToken(token);
    state = SessionState(token: token, phone: phone, userId: userId, roles: roles);
  }

  void logout() {
    _client.setBearerToken('');
    state = SessionState();
  }
}

final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  final client = ref.watch(apiClientProvider);
  return SessionNotifier(client);
});

// Partner dashboards
final vendorDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const {};
  return client.getMap('/vendor/dashboard');
});

final vendorOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/vendor/orders');
});

final vendorProductsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/vendor/products');
});

final vendorProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const {};
  return client.getMap('/vendor/profile');
});

final vendorComplianceProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/vendor/compliance-documents');
});

final riderDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || !session.isRider) return const {};
  return client.getMap('/rider/dashboard');
});

final riderProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || !session.isRider) return const {};
  return client.getMap('/rider/profile');
});

final riderKycDocumentsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || !session.isRider) return const [];
  return client.getList('/rider/kyc-documents');
});

final riderOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || !session.isRider) return const [];
  return client.getList('/rider/orders');
});

final riderOrderHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || !session.isRider) return const [];
  return client.getList('/rider/order-history');
});

/// Registers the partner device FCM token with the backend.
/// Call this after a successful partner authentication.
Future<void> registerPartnerDeviceToken(QuickGoApiClient client) async {
  try {
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission();
    final token = await messaging.getToken();
    if (token != null && token.isNotEmpty) {
      await client.postMap('/notifications/register-device', {
        'fcmToken': token,
        'platform': 'ANDROID',
      });
    }
  } catch (_) {
    // Silently ignore FCM registration failures — non-blocking for MVP
  }
}
