import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import 'address_list_screen.dart';
import 'package:quickgo_customer_app/src/screens/orders_screen.dart';
import 'package:quickgo_customer_app/src/screens/support_screen.dart';
import 'package:quickgo_customer_app/src/screens/login_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final addressesAsync = ref.watch(addressesProvider);

    final rawPhone = session.phone ?? '';
    final String phone = rawPhone.trim().isNotEmpty ? rawPhone : 'Phone not available';
    String name = '';

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          color: quickGoGreen,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Builder(builder: (ctx) {
                    final cleaned = phone.replaceAll('+', '').replaceAll(' ', '');
                    final avatarChar = name.isNotEmpty
                        ? name[0]
                        : (cleaned.isNotEmpty ? cleaned[0] : 'P');
                    return Text(
                      avatarChar,
                      style: TextStyle(color: quickGoGreen, fontSize: 24, fontWeight: FontWeight.bold),
                    );
                  }),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Customer', style: const TextStyle(color: Colors.white70)),
                      const SizedBox(height: 6),
                      Text(name.isNotEmpty ? name : phone, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      addressesAsync.when(
                        data: (addresses) {
                          if (addresses.isEmpty) return Text('No saved address', style: const TextStyle(color: Colors.white70));
                          final a = addresses.first as Map<String, dynamic>;
                          final summary = '${a['line1'] ?? ''}${a['city'] != null ? ', ${a['city']}' : ''}';
                          return Text(summary, style: const TextStyle(color: Colors.white70));
                        },
                        loading: () => Text('Loading address...', style: const TextStyle(color: Colors.white70)),
                        error: (_, __) => Text('Address unavailable', style: const TextStyle(color: Colors.white70)),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),

        QuickGoSection(
          title: 'Account',
          children: [
            ListTile(
              leading: const Icon(Icons.location_on),
              title: const Text('Manage Addresses'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const AddressListScreen())),
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long),
              title: const Text('My Orders'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const OrdersScreen())),
            ),
            ListTile(
              leading: const Icon(Icons.support_agent),
              title: const Text('Support'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => const SupportScreen())),
            ),
          ],
        ),

        QuickGoSection(
          title: 'About',
          children: [
            ListTile(
              leading: const Icon(Icons.policy),
              title: const Text('Terms & Privacy'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => showDialog(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Terms & Privacy'),
                  content: const Text('Terms and Privacy are available on the website.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c), child: const Text('Close')),
                  ],
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('App Version'),
              subtitle: const Text('1.0.0 (placeholder)'),
            ),
          ],
        ),

        QuickGoSection(
          title: ' ',
          children: [
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: Text('Logout', style: const TextStyle(color: Colors.redAccent)),
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (c) => AlertDialog(
                    title: const Text('Logout?'),
                    content: const Text('Are you sure you want to logout from QuickGO?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                      TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Logout')),
                    ],
                  ),
                );

                if (confirm == true) {
                  ref.read(sessionProvider.notifier).logout();
                  if (!context.mounted) return;
                  // Ensure navigation resets to login screen
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (ctx) => LoginScreen(onVerified: () {})),
                    (route) => false,
                  );
                }
              },
            ),
          ],
        ),
      ],
    );
  }
}

// Local imports for navigation targets were moved to file top

