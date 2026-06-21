import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

class AddAddressScreen extends ConsumerStatefulWidget {
  const AddAddressScreen({super.key});

  @override
  ConsumerState<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends ConsumerState<AddAddressScreen> {
  final _receiverName = TextEditingController();
  final _receiverPhone = TextEditingController();
  final _line1 = TextEditingController();
  final _line2 = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _pincode = TextEditingController();
  var _submitting = false;

  Future<void> _saveAddress() async {
    if (_receiverName.text.isEmpty ||
        _receiverPhone.text.isEmpty ||
        _line1.text.isEmpty ||
        _city.text.isEmpty ||
        _state.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all mandatory fields.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      final address = await client.postMap('/customer/addresses', {
        'receiver_name': _receiverName.text,
        'receiver_phone': _receiverPhone.text,
        'line1': _line1.text,
        'line2': _line2.text,
        'city': _city.text,
        'state': _state.text,
        'pincode': _pincode.text,
        'latitude': 24.775, // Default local zone coordinates for testing
        'longitude': 86.38,
      });

      ref.invalidate(addressesProvider);
      ref.read(selectedAddressProvider.notifier).state = address;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Address added successfully')),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to add address: $e')),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Address')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _receiverName,
            decoration: const InputDecoration(labelText: 'Receiver Name *'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _receiverPhone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Receiver Phone *'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _line1,
            decoration: const InputDecoration(labelText: 'Address Line 1 *'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _line2,
            decoration: const InputDecoration(labelText: 'Address Line 2 (Optional)'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _city,
            decoration: const InputDecoration(labelText: 'City *'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _state,
            decoration: const InputDecoration(labelText: 'State *'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _pincode,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Pincode'),
          ),
          const SizedBox(height: 24),
          _submitting
              ? const Center(child: CircularProgressIndicator())
              : FilledButton(
                  onPressed: _saveAddress,
                  child: const Text('Save Address'),
                ),
        ],
      ),
    );
  }
}
