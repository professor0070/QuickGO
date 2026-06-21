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
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();
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
        if (_latitude.text.trim().isNotEmpty)
          'latitude': double.tryParse(_latitude.text.trim()),
        if (_longitude.text.trim().isNotEmpty)
          'longitude': double.tryParse(_longitude.text.trim()),
      });

      ref.invalidate(addressesProvider);
      ref.read(selectedAddressProvider.notifier).state = address;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Address added successfully')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to add address: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
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
            decoration:
                const InputDecoration(labelText: 'Address Line 2 (Optional)'),
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
          const SizedBox(height: 8),
          TextField(
            controller: _latitude,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
                labelText: 'Latitude (required for serviceability)'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _longitude,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
                labelText: 'Longitude (required for serviceability)'),
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
