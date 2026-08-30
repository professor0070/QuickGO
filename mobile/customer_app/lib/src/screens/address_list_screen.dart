import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import 'add_address_screen.dart';

class AddressListScreen extends ConsumerWidget {
  const AddressListScreen({super.key, this.onSelected});

  final ValueChanged<Map<String, dynamic>>? onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addressesAsync = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Addresses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AddAddressScreen()),
              );
            },
          ),
        ],
      ),
      body: addressesAsync.when(
        data: (addresses) {
          if (addresses.isEmpty) {
            return const QuickGoEmptyState(
              title: 'No Saved Addresses',
              message: 'Add a new delivery address to start placing orders.',
              icon: Icons.location_off_outlined,
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: addresses.length,
            itemBuilder: (context, index) {
              final address = addresses[index] as Map<String, dynamic>;
              final receiverName = address['receiverName'] as String? ?? '';
              final receiverPhone = address['receiverPhone'] as String? ?? '';
              final line1 = address['line1'] as String? ?? '';
              final city = address['city'] as String? ?? '';
              final isDefault = address['isDefault'] as bool? ?? false;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: quickGoLine),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: const Icon(Icons.location_on, color: quickGoGreen),
                  title: Text('$receiverName ($receiverPhone)', style: const TextStyle(fontWeight: FontWeight.bold, color: quickGoTextDark)),
                  subtitle: Text('$line1, $city', style: const TextStyle(color: quickGoTextLight)),
                  trailing: isDefault
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: quickGoGreen.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Default',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: quickGoGreen,
                            ),
                          ),
                        )
                      : null,
                  onTap: () {
                    if (onSelected != null) {
                      onSelected!(address);
                    } else {
                      ref.read(selectedAddressProvider.notifier).state = address;
                      Navigator.pop(context);
                    }
                  },
                ),
              );
            },
          );
        },
        loading: () => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: 3,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) => Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: quickGoLine),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                QuickGoSkeleton(width: 24, height: 24, borderRadius: 12),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      QuickGoSkeleton(width: 120, height: 16),
                      SizedBox(height: 8),
                      QuickGoSkeleton(width: 180, height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        error: (err, _) => QuickGoErrorState(
          title: 'Something went wrong',
          message: err.toString(),
          onRetry: () => ref.invalidate(addressesProvider),
        ),
      ),
    );
  }
}
