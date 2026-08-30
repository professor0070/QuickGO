import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../widgets/go_buddy/go_buddy.dart';
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
    final phoneText = _phone.text.trim();
    String normalized;
    try {
      normalized = QuickGoAuthRepository.normalizeIndianPhone(phoneText);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit phone number.')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendOtp(normalized);
      if (!mounted) return;
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP sent successfully. (Use 123456 in test mode)')),
      );
    } catch (e) {
      debugPrint('Error sending OTP: $e');
      if (!mounted) return;
      final err = e.toString();
      final isNet = err.contains('DioException') || err.contains('Network') || err.contains('SocketException') || err.contains('connection');
      final msg = isNet
          ? 'Network error. Please check your connection to the server.'
          : 'Failed to send OTP. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verifyOtp() async {
    final otpText = _otp.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(otpText)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 6-digit OTP code.')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final normalized = QuickGoAuthRepository.normalizeIndianPhone(_phone.text.trim());
      final response = await repo.verifyOtp(normalized, otpText, appContext: 'CUSTOMER');
      final token = response['access_token'] as String?;
      final user = response['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        throw Exception('Malformed server response');
      }

      ref.read(sessionProvider.notifier).authenticate(
            token,
            user['phone'] as String? ?? '',
            user['id'] as String? ?? '',
            avatarUrl: user['avatarUrl'] as String?,
          );
      if (!mounted) return;
      widget.onVerified();
    } catch (e) {
      debugPrint('Error verifying OTP: $e');
      if (!mounted) return;
      final err = e.toString();
      String msg = 'Failed to verify OTP. Please try again.';
      if (err.contains('Invalid OTP') || err.contains('OTP')) msg = 'Invalid OTP.';
      if (err.contains('DioException') || err.contains('Network') || err.contains('connection')) {
        msg = 'Network error. Cannot connect to server.';
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    // Substantially enlarged 1.5x hero size: ~410-440dp on standard phone screens
    final heroWidth = (screenSize.width * 1.1).clamp(340.0, 440.0);
    final heroHeight = (screenSize.height * 0.48).clamp(340.0, 440.0);
    final heroSize = heroWidth < heroHeight ? heroWidth : heroHeight;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 4.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Go Buddy Hero Mascot Header (Enlarged 1.5x - Position & Size LOCKED)
                Center(
                  child: GoBuddyWidget(
                    state: GoBuddyState.splash,
                    width: heroSize,
                    height: heroSize,
                  ),
                ),
                // Shift lower form content upward as a coherent group to close transparent asset gap
                Transform.translate(
                  offset: const Offset(0, -32.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Welcome to QuickGO',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: quickGoTextDark,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Enter your phone number to receive a verification OTP',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: quickGoTextLight,
                        ),
                      ),
                      const SizedBox(height: 16),
                      QuickGoTextField(
                        controller: _phone,
                        labelText: 'Mobile number',
                        keyboardType: TextInputType.phone,
                        hintText: 'Mobile no.',
                        prefixIcon: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 14.0),
                          child: Text(
                            '+91 ',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: quickGoTextDark,
                            ),
                          ),
                        ),
                      ),
                      if (_otpSent) ...[
                        const SizedBox(height: 16),
                        QuickGoTextField(
                          controller: _otp,
                          labelText: 'Verification OTP',
                          keyboardType: TextInputType.number,
                          hintText: 'OTP',
                          prefixIcon: const Icon(Icons.lock_outline, color: quickGoGreen),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Card(
                        child: CheckboxListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
                          value: _acceptedTerms,
                          onChanged: (value) => setState(() => _acceptedTerms = value ?? false),
                          activeColor: quickGoGreen,
                          title: const Text(
                            'I accept the QuickGO Terms of Service & Privacy Policy Agreements.',
                            style: TextStyle(fontSize: 12, color: quickGoTextDark),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      QuickGoButton(
                        onPressed: _acceptedTerms
                            ? () {
                                if (_otpSent) {
                                  _verifyOtp();
                                } else {
                                  _sendOtp();
                                }
                              }
                            : null,
                        isLoading: _submitting,
                        label: _otpSent ? 'Verify & Login' : 'Send OTP',
                        icon: _otpSent ? Icons.verified_user : Icons.send,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }
}
