import 'package:flutter/painting.dart';
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

enum PartnerMode { vendor, rider }

class SessionState {
  SessionState({
    this.token,
    this.phone,
    this.userId,
    this.roles = const [],
    this.selectedPartnerMode,
  });
  final String? token;
  final String? phone;
  final String? userId;
  final List<String> roles;
  final PartnerMode? selectedPartnerMode;

  bool get isAuthenticated => token != null;
  bool get isVendor => roles.contains('VENDOR_OWNER') || roles.contains('VENDOR_STAFF');
  bool get isRider => roles.contains('RIDER');

  bool get hasVendorRole => roles.contains('VENDOR_OWNER') || roles.contains('VENDOR_STAFF');
  bool get hasRiderRole => roles.contains('RIDER');
  bool get hasPartnerAccess => hasVendorRole || hasRiderRole;
  bool get hasMultiplePartnerModes => hasVendorRole && hasRiderRole;
  PartnerMode? get defaultPartnerMode {
    if (hasVendorRole && !hasRiderRole) return PartnerMode.vendor;
    if (hasRiderRole && !hasVendorRole) return PartnerMode.rider;
    return null;
  }
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._client) : super(SessionState());
  final QuickGoApiClient _client;

  void authenticate(String token, String phone, String userId, List<String> roles) {
    // Evict previous account's cached avatar images on identity change (Section G.7)
    if (state.userId != null && state.userId != userId) {
      PaintingBinding.instance.imageCache.clear();
    }
    _client.setBearerToken(token);

    // Automatically set selected mode if the user only has a single role
    PartnerMode? autoMode;
    final hasVendor = roles.contains('VENDOR_OWNER') || roles.contains('VENDOR_STAFF');
    final hasRider = roles.contains('RIDER');
    if (hasVendor && !hasRider) {
      autoMode = PartnerMode.vendor;
    } else if (hasRider && !hasVendor) {
      autoMode = PartnerMode.rider;
    }

    state = SessionState(
      token: token,
      phone: phone,
      userId: userId,
      roles: roles,
      selectedPartnerMode: autoMode,
    );
  }

  void selectMode(PartnerMode mode) {
    if (mode == PartnerMode.vendor && !state.hasVendorRole) return;
    if (mode == PartnerMode.rider && !state.hasRiderRole) return;
    state = SessionState(
      token: state.token,
      phone: state.phone,
      userId: state.userId,
      roles: state.roles,
      selectedPartnerMode: mode,
    );
  }

  void logout() {
    _client.setBearerToken('');
    // Evict cached avatar images to prevent previous-account data leaking (Section G.7)
    PaintingBinding.instance.imageCache.clear();
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
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.vendor) return const {};
  return client.getMap('/vendor/dashboard');
});

final vendorOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.vendor) return const [];
  return client.getList('/vendor/orders');
});

final vendorProductsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.vendor) return const [];
  return client.getList('/vendor/products');
});

final vendorProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.vendor) return const {};
  return client.getMap('/vendor/profile');
});

final vendorComplianceProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.vendor) return const [];
  return client.getList('/vendor/compliance-documents');
});

final riderDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.rider) return const {};
  return client.getMap('/rider/dashboard');
});

final riderProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.rider) return const {};
  return client.getMap('/rider/profile');
});

final riderKycDocumentsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.rider) return const [];
  return client.getList('/rider/kyc-documents');
});

final riderOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.rider) return const [];
  return client.getList('/rider/orders');
});

final riderOrderHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated || session.selectedPartnerMode != PartnerMode.rider) return const [];
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

final vendorTabIndexProvider = StateProvider<int>((ref) => 0);
final riderTabIndexProvider = StateProvider<int>((ref) => 0);
