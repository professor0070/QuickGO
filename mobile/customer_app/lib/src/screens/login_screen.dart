import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, required this.onVerified});

  final VoidCallback onVerified;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  var _otpSent = false;
  var _acceptedTerms = false;
  var _submitting = false;

  Future<void> _sendOtp() async {
    if (_phone.text.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendOtp(_phone.text);
      if (!mounted) return;
      setState(() => _otpSent = true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send OTP: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final response = await repo.verifyOtp(_phone.text, _otp.text);
      final token = response['access_token'] as String;
      final user = response['user'] as Map<String, dynamic>;

      ref.read(sessionProvider.notifier).authenticate(
            token,
            user['phone'] as String,
            user['id'] as String,
          );
      if (!mounted) return;
      widget.onVerified();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to verify OTP: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('QuickGO Login')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile number',
              prefixText: '+91 ',
            ),
          ),
          if (_otpSent) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _otp,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Enter OTP code'),
            ),
          ],
          const SizedBox(height: 8),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _acceptedTerms,
            onChanged: (value) =>
                setState(() => _acceptedTerms = value ?? false),
            title: const Text('I accept the Terms and Privacy Policy'),
          ),
          const SizedBox(height: 16),
          if (_submitting)
            const Center(child: CircularProgressIndicator())
          else
            FilledButton(
              onPressed: _acceptedTerms
                  ? () {
                      if (_otpSent) {
                        _verifyOtp();
                      } else {
                        _sendOtp();
                      }
                    }
                  : null,
              child: Text(_otpSent ? 'Verify OTP' : 'Send OTP'),
            ),
        ],
      ),
    );
  }
}
