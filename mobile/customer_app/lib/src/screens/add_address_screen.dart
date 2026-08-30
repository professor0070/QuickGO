import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
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
        const SnackBar(content: Text('Please fill all mandatory fields.'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    if (!RegExp(r'^\d{10}$').hasMatch(receiverPhoneText)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit phone number.'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    if (pincodeText.isNotEmpty && !RegExp(r'^\d{6}$').hasMatch(pincodeText)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 6-digit pincode.'), backgroundColor: Colors.redAccent),
      );
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
      });

      ref.invalidate(addressesProvider);
      ref.read(selectedAddressProvider.notifier).state = address;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: const Text('Address added successfully'), backgroundColor: quickGoGreen),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      final err = e.toString();
      final msg = err.contains('Network') ? 'Network error. Check your connection.' : 'Failed to add address. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.redAccent));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Address')),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        children: [
          QuickGoTextField(
            controller: _receiverName,
            labelText: 'Receiver Name *',
            hintText: 'Enter recipient name',
          ),
          const SizedBox(height: 12),
          QuickGoTextField(
            controller: _receiverPhone,
            labelText: 'Receiver Phone *',
            hintText: 'Enter 10-digit number',
          ),
          const SizedBox(height: 12),
          QuickGoTextField(
            controller: _line1,
            labelText: 'Address Line 1 *',
            hintText: 'Flat / House no, Building, Street',
          ),
          const SizedBox(height: 12),
          QuickGoTextField(
            controller: _line2,
            labelText: 'Address Line 2 (Optional)',
            hintText: 'Landmark, Locality',
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: QuickGoTextField(
                  controller: _city,
                  labelText: 'City *',
                  hintText: 'City name',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: QuickGoTextField(
                  controller: _state,
                  labelText: 'State *',
                  hintText: 'State name',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          QuickGoTextField(
            controller: _pincode,
            labelText: 'Pincode',
            hintText: '6-digit pincode',
          ),
          const SizedBox(height: 28),
          QuickGoButton(
            onPressed: _saveAddress,
            isLoading: _submitting,
            label: 'Save Address',
            icon: Icons.save_outlined,
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
