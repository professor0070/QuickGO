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
    final receiverPhoneText = _receiverPhone.text.trim();
    final pincodeText = _pincode.text.trim();

    if (_receiverName.text.trim().isEmpty ||
        receiverPhoneText.isEmpty ||
        _line1.text.trim().isEmpty ||
        _city.text.trim().isEmpty ||
        _state.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all mandatory fields.')),
      );
      return;
    }

    if (!RegExp(r'^\d{10}$').hasMatch(receiverPhoneText)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid phone number.')));
      return;
    }

    if (pincodeText.isNotEmpty && !RegExp(r'^\d{6}$').hasMatch(pincodeText)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid 6-digit pincode.')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      final address = await client.postMap('/customer/addresses', {
        'receiver_name': _receiverName.text.trim(),
        'receiver_phone': receiverPhoneText,
        'line1': _line1.text.trim(),
        'line2': _line2.text.trim(),
        'city': _city.text.trim(),
        'state': _state.text.trim(),
        'pincode': pincodeText,
        // Latitude/Longitude intentionally omitted from customer-provided payload
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
      final err = e.toString();
      final msg = err.contains('Network') ? 'Network error. Check your connection.' : 'Failed to add address. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
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
          // Latitude/Longitude removed from MVP customer UI
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

  @override
  void dispose() {
    _receiverName.dispose();
    _receiverPhone.dispose();
    _line1.dispose();
    _line2.dispose();
    _city.dispose();
    _state.dispose();
    _pincode.dispose();
    super.dispose();
  }
}
