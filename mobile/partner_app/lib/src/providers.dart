import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_api/quickgo_api_client.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';

final apiClientProvider = Provider<QuickGoApiClient>((ref) {
  return QuickGoApiClient(baseUrl: 'http://localhost:3000/api/v1');
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
