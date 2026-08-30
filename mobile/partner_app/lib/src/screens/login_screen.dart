import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_auth/quickgo_auth.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';
import '../widgets/go_buddy_widget.dart';

/// Formatter to handle national Indian mobile digits and safely parse pasted prefixed numbers
class IndianNationalPhoneInputFormatter extends TextInputFormatter {
  const IndianNationalPhoneInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text;
    if (text.isEmpty) return newValue;

    // Extract digits only
    final digits = text.replaceAll(RegExp(r'\D'), '');

    // Handle prefixed paste (+91XXXXXXXXXX or 91XXXXXXXXXX or 0XXXXXXXXXX)
    String nationalDigits = digits;
    if (digits.length == 12 && digits.startsWith('91')) {
      nationalDigits = digits.substring(2);
    } else if (digits.length == 11 && digits.startsWith('0')) {
      nationalDigits = digits.substring(1);
    }

    // Limit to maximum 10 digits
    if (nationalDigits.length > 10) {
      nationalDigits = nationalDigits.substring(0, 10);
    }

    return TextEditingValue(
      text: nationalDigits,
      selection: TextSelection.collapsed(offset: nationalDigits.length),
    );
  }
}

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
    if (_submitting) return;

    final phoneInput = _phone.text.trim();
    String normalized;
    try {
      normalized = QuickGoAuthRepository.normalizeIndianPhone(phoneInput);
    } on FormatException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 10-digit Indian mobile number.'),
        ),
      );
      return;
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 10-digit Indian mobile number.'),
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendOtp(normalized);
      if (!mounted) return;
      setState(() => _otpSent = true);
    } catch (e) {
      debugPrint('Error sending OTP: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Failed to send OTP. Please check your connection and try again.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_submitting) return;

    final otpText = _otp.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(otpText)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 6-digit OTP code.'),
        ),
      );
      return;
    }

    String normalized;
    try {
      normalized =
          QuickGoAuthRepository.normalizeIndianPhone(_phone.text.trim());
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 10-digit Indian mobile number.'),
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final response = await repo.verifyOtp(normalized, otpText, appContext: 'PARTNER');
      final token = response['access_token'] as String?;
      final user = response['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        throw Exception('Malformed server response');
      }
      final rawRoles = user['roles'] as List<dynamic>? ?? const [];
      final roles = rawRoles.map((r) => r.toString()).toList();

      ref.read(sessionProvider.notifier).authenticate(
            token,
            user['phone'] as String? ?? normalized,
            user['id'] as String? ?? '',
            roles,
          );
      if (!mounted) return;
      widget.onVerified();
    } catch (e) {
      debugPrint('Error verifying OTP: $e');
      if (!mounted) return;
      final errStr = e.toString();
      String msg = 'Failed to verify OTP. Please try again.';
      if (errStr.contains('Invalid OTP') || errStr.contains('OTP')) {
        msg = 'Invalid OTP code. Please try again.';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg)),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    // Substantially enlarged 1.5x hero size: ~340-440dp on standard phone screens
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
                  child: PartnerGoBuddyWidget(
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
                      TextField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        inputFormatters: const [IndianNationalPhoneInputFormatter()],
                        style: const TextStyle(color: quickGoTextDark, fontSize: 16),
                        decoration: const InputDecoration(
                          labelText: 'Mobile number',
                          hintText: 'Mobile no.',
                          prefixIcon: Padding(
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
                      ),
                      if (_otpSent) ...[
                        const SizedBox(height: 16),
                        TextField(
                          controller: _otp,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          style: const TextStyle(color: quickGoTextDark, fontSize: 16),
                          decoration: const InputDecoration(
                            labelText: 'Verification OTP',
                            hintText: 'OTP',
                            prefixIcon: Icon(Icons.lock_outline, color: quickGoGreen),
                          ),
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
                        label: _otpSent ? 'Verify OTP' : 'Send OTP',
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
}
