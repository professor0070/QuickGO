import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_api/quickgo_api_client.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

final apiClientProvider = Provider<QuickGoApiClient>((ref) {
  return QuickGoApiClient();
});

final authRepositoryProvider = Provider<QuickGoAuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return QuickGoAuthRepository(client);
});

// Authenticated session state
class SessionState {
  SessionState({this.token, this.phone, this.userId});
  final String? token;
  final String? phone;
  final String? userId;

  bool get isAuthenticated => token != null;
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._client) : super(SessionState());
  final QuickGoApiClient _client;

  void authenticate(String token, String phone, String userId) {
    _client.setBearerToken(token);
    state = SessionState(token: token, phone: phone, userId: userId);
  }

  Future<void> logout() async {
    _client.setBearerToken('');
    state = SessionState();
    // Best-effort: remove common persisted keys so reopening app won't auto-login
    // Remove any auth token from the API client
    _client.setBearerToken('');

    // reset app session state
    state = SessionState();

    // Best-effort: clear common shared preferences keys used for tokens
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final k in [
        'quickgo_auth_token',
        'quickgo_api_url',
        'access_token',
        'token',
        'auth_token',
      ]) {
        try {
          await prefs.remove(k);
        } catch (_) {
          // ignore individual key removal errors
        }
      }
    } catch (_) {
      // ignore prefs errors
    }
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
  final products = await client.getList('/catalog/products');
  return products.where((p) {
    final name = (p['name'] as String? ?? '').toLowerCase();
    return name.contains(query.toLowerCase());
  }).toList();
});
