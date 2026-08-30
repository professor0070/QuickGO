import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:quickgo_shared_api/quickgo_api_client.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

// Authenticated session state
class SessionState {
  SessionState({this.token, this.phone, this.userId, this.avatarUrl});
  final String? token;
  final String? phone;
  final String? userId;
  final String? avatarUrl;

  bool get isAuthenticated => token != null;
}

const int customerSessionValidityDays = 50;
const int customerSessionValidityMs = customerSessionValidityDays * 24 * 60 * 60 * 1000;

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._client) : super(SessionState()) {
    restoreSession();
  }
  final QuickGoApiClient _client;

  Future<void> restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('quickgo_session_token');
      final phone = prefs.getString('quickgo_session_phone');
      final userId = prefs.getString('quickgo_session_user_id');
      final avatarUrl = prefs.getString('quickgo_session_avatar_url');
      final createdAt = prefs.getInt('quickgo_session_created_at') ?? 0;

      if (token != null && token.isNotEmpty && createdAt > 0) {
        final now = DateTime.now().millisecondsSinceEpoch;
        final elapsed = now - createdAt;
        if (elapsed < customerSessionValidityMs) {
          _client.setBearerToken(token);
          state = SessionState(
            token: token,
            phone: phone,
            userId: userId,
            avatarUrl: avatarUrl,
          );
          return;
        }
      }
      // Session missing or expired (>= 50 days)
      await logout();
    } catch (_) {}
  }

  Future<void> authenticate(String token, String phone, String userId, {String? avatarUrl}) async {
    // Evict previous account's cached avatar images on identity change (Section G.7)
    if (state.userId != null && state.userId != userId) {
      PaintingBinding.instance.imageCache.clear();
    }
    _client.setBearerToken(token);
    state = SessionState(token: token, phone: phone, userId: userId, avatarUrl: avatarUrl);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('quickgo_session_token', token);
      await prefs.setString('quickgo_session_phone', phone);
      await prefs.setString('quickgo_session_user_id', userId);
      if (avatarUrl != null) await prefs.setString('quickgo_session_avatar_url', avatarUrl);
      await prefs.setInt('quickgo_session_created_at', DateTime.now().millisecondsSinceEpoch);
    } catch (_) {}
  }

  void updateAvatarUrl(String avatarUrl) {
    state = SessionState(
      token: state.token,
      phone: state.phone,
      userId: state.userId,
      avatarUrl: avatarUrl,
    );
    try {
      SharedPreferences.getInstance().then((prefs) {
        prefs.setString('quickgo_session_avatar_url', avatarUrl);
      });
    } catch (_) {}
  }

  Future<void> logout() async {
    _client.setBearerToken('');
    state = SessionState();

    // Evict cached avatar images to prevent previous-account data leaking (Section G.7)
    PaintingBinding.instance.imageCache.clear();

    try {
      final prefs = await SharedPreferences.getInstance();
      for (final k in [
        'quickgo_session_token',
        'quickgo_session_phone',
        'quickgo_session_user_id',
        'quickgo_session_avatar_url',
        'quickgo_session_created_at',
        'quickgo_auth_token',
        'quickgo_api_url',
        'access_token',
        'token',
        'auth_token',
      ]) {
        try {
          await prefs.remove(k);
        } catch (_) {}
      }
    } catch (_) {}
  }
}

final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  final client = ref.watch(apiClientProvider);
  return SessionNotifier(client);
});

// Category list provider
final categoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  return client.getList('/catalog/categories');
});

// Active vendors list provider
final vendorsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  return client.getList('/catalog/vendors');
});

// Customer orders list provider
final ordersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/orders');
});

// Active cart provider
final cartProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const {};
  return client.getMap('/cart');
});

// Category products provider
final categoryProductsProvider = FutureProvider.family<List<dynamic>, String>((ref, categoryId) async {
  final client = ref.watch(apiClientProvider);
  return client.getList('/catalog/products?category_id=$categoryId');
});

// Vendor detail & products provider
final vendorDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, vendorId) async {
  final client = ref.watch(apiClientProvider);
  return client.getMap('/catalog/vendors/$vendorId');
});

// Customer addresses provider
final addressesProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/customer/addresses');
});

// Selected address for checkout
final selectedAddressProvider = StateProvider<Map<String, dynamic>?>((ref) => null);

final serviceabilityProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final address = ref.watch(selectedAddressProvider);
  if (address == null) {
    return const {'serviceable': true};
  }

  final latitude = num.tryParse(address['latitude']?.toString() ?? '');
  final longitude = num.tryParse(address['longitude']?.toString() ?? '');
  // If coordinates are missing from selected address, do not block MVP flows.
  // Serviceability will be evaluated server-side later using address/pincode.
  if (latitude == null || longitude == null) {
    return const {'serviceable': true};
  }

  final client = ref.watch(apiClientProvider);
  return client.postMap('/customer/serviceability', {
    'latitude': latitude,
    'longitude': longitude,
  });
});

// Search Query Provider
final searchQueryProvider = StateProvider<String>((ref) => '');

// Searched Products Provider
final searchedProductsProvider = FutureProvider<List<dynamic>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.length < 2) return const [];
  final client = ref.watch(apiClientProvider);
  final encodedQuery = Uri.encodeComponent(query);
  return client.getList('/catalog/products?search=$encodedQuery&limit=20');
});

// Notification list provider
final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const [];
  return client.getList('/notifications');
});

// Unread notification count provider
final unreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return 0;
  final result = await client.getMap('/notifications/unread-count');
  return (result['unread_count'] as num?)?.toInt() ?? 0;
});

/// Registers the device FCM token with the backend.
/// Call this after a successful authentication.
Future<void> registerDeviceToken(QuickGoApiClient client) async {
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

// Wallet details provider
final walletProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const {};
  return client.getMap('/wallet');
});

// Odyssey summary provider
final odysseyProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  final session = ref.watch(sessionProvider);
  if (!session.isAuthenticated) return const {};
  return client.getMap('/odyssey');
});

