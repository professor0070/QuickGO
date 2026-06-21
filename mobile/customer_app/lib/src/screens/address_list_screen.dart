import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
            return const Center(child: Text('No saved addresses found. Please add a delivery address.'));
          }

          return ListView.builder(
            itemCount: addresses.length,
            itemBuilder: (context, index) {
              final address = addresses[index] as Map<String, dynamic>;
              final receiverName = address['receiverName'] as String? ?? '';
              final receiverPhone = address['receiverPhone'] as String? ?? '';
              final line1 = address['line1'] as String? ?? '';
              final city = address['city'] as String? ?? '';
              final isDefault = address['isDefault'] as bool? ?? false;

              return ListTile(
                leading: const Icon(Icons.location_on_outlined, color: Colors.indigo),
                title: Text('$receiverName ($receiverPhone)'),
                subtitle: Text('$line1, $city'),
                trailing: isDefault ? const Chip(label: Text('Default', style: TextStyle(fontSize: 10))) : null,
                onTap: () {
                  if (onSelected != null) {
                    onSelected!(address);
                  } else {
                    ref.read(selectedAddressProvider.notifier).state = address;
                    Navigator.pop(context);
                  }
                },
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading addresses: $err')),
      ),
    );
  }
}
