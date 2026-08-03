import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import 'package:image_picker/image_picker.dart';
import '../providers.dart';
import '../utils.dart';
import 'address_list_screen.dart';
import 'package:quickgo_customer_app/src/screens/orders_screen.dart';
import 'package:quickgo_customer_app/src/screens/support_screen.dart';
import 'package:quickgo_customer_app/src/screens/login_screen.dart';
import 'legal_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _pickAndUploadAvatar(BuildContext context, WidgetRef ref) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (pickedFile == null) return;
      if (!context.mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Uploading profile picture...')),
      );

      final client = ref.read(apiClientProvider);
      final response = await client.uploadFile(
        '/profile/avatar',
        pickedFile.path,
        'file',
        {},
      );

      final avatarUrl = response['avatarUrl'] as String?;
      if (avatarUrl != null) {
        if (!context.mounted) return;
        ref.read(sessionProvider.notifier).updateAvatarUrl(avatarUrl);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile picture updated successfully!')),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to upload picture: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final addressesAsync = ref.watch(addressesProvider);

    final rawPhone = session.phone ?? '';
    final String phone = rawPhone.trim().isNotEmpty ? rawPhone : 'Phone not available';
    String name = 'Customer';

    final rawAvatarUrl = session.avatarUrl;
    final resolvedAvatarUrl = (rawAvatarUrl != null && rawAvatarUrl.isNotEmpty)
        ? resolveMediaUrl(rawAvatarUrl, ref.read(apiClientProvider).baseUrl)
        : null;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
          // Profile Details Header Card
          Card(
            color: quickGoGreen,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: Colors.white,
                        backgroundImage: resolvedAvatarUrl != null && resolvedAvatarUrl.isNotEmpty
                            ? NetworkImage(resolvedAvatarUrl)
                            : null,
                        // Show neutral placeholder on load failure (401/403/404) — Section G.6, G.9
                        onBackgroundImageError: resolvedAvatarUrl != null
                            ? (_, __) {} // Silently fall through to child placeholder
                            : null,
                        child: resolvedAvatarUrl == null || resolvedAvatarUrl.isEmpty
                            ? Builder(builder: (ctx) {
                                final cleaned = phone.replaceAll('+', '').replaceAll(' ', '');
                                final avatarChar = cleaned.isNotEmpty ? cleaned[0] : 'C';
                                return Text(
                                  avatarChar,
                                  style: const TextStyle(color: quickGoGreen, fontSize: 26, fontWeight: FontWeight.bold),
                                );
                              })
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: () => _pickAndUploadAvatar(context, ref),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              size: 16,
                              color: quickGoGreen,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          phone,
                          style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        addressesAsync.when(
                          data: (addresses) {
                            if (addresses.isEmpty) {
                              return Text('No address listed', style: TextStyle(color: Colors.white.withOpacity(0.7)));
                            }
                            final a = addresses.first as Map<String, dynamic>;
                            final summary = '${a['line1'] ?? ''}${a['city'] != null ? ', ${a['city']}' : ''}';
                            return Text(
                              summary,
                              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            );
                          },
                          loading: () => Text('Loading address...', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                          error: (_, __) => Text('Address unavailable', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Account Options
          QuickGoSection(
            title: 'Account Settings',
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.location_on, color: quickGoGreen),
                title: const Text('Manage Addresses', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                subtitle: const Text('Add, edit, or delete delivery addresses', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: quickGoTextLight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const AddressListScreen())),
              ),
              const Divider(height: 1, color: quickGoLine),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.receipt_long, color: quickGoGreen),
                title: const Text('My Orders', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                subtitle: const Text('View history and active order tracking', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: quickGoTextLight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const OrdersScreen())),
              ),
              const Divider(height: 1, color: quickGoLine),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.support_agent, color: quickGoGreen),
                title: const Text('Customer Support', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                subtitle: const Text('Submit ticket issues and get help', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: quickGoTextLight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const SupportScreen())),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // About Section
          QuickGoSection(
            title: 'About QuickGO',
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.policy, color: quickGoGreen),
                title: const Text('Terms & Privacy Agreements', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                subtitle: const Text('Read our user terms and privacy policies', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: quickGoTextLight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const LegalScreen())),
              ),
              const Divider(height: 1, color: quickGoLine),
              const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.info_outline, color: quickGoGreen),
                title: Text('Application Version', style: TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                subtitle: Text('1.0.0 (Production Release)', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Logout Action
          QuickGoOutlineButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Logout?'),
                  content: const Text('Are you sure you want to logout from QuickGO?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
                      onPressed: () => Navigator.pop(c, true),
                      child: const Text('Logout'),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                ref.read(sessionProvider.notifier).logout();
                if (!context.mounted) return;
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (ctx) => LoginScreen(onVerified: () {})),
                  (route) => false,
                );
              }
            },
            label: 'Logout Account',
            icon: Icons.logout,
          ),
        ],
      );
  }
}

// Local imports for navigation targets were moved to file top

