import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

String _resolveMediaUrl(String? path, String apiBaseUrl) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  var base = apiBaseUrl.replaceAll('/api/v1', '');
  if (base.endsWith('/')) {
    base = base.substring(0, base.length - 1);
  }
  return '$base${path.startsWith('/') ? '' : '/'}$path';
}

class PartnerProfileCard extends ConsumerStatefulWidget {
  const PartnerProfileCard({
    super.key,
    required this.name,
    required this.phone,
    required this.roleLabel,
    required this.avatarUrl,
    required this.onUploadSuccess,
    this.subDetails = const [],
    this.isVerified = false,
    this.verificationText,
    this.uploadDisabled = false,
  });

  final String name;
  final String phone;
  final String roleLabel;
  final String? avatarUrl;
  final VoidCallback onUploadSuccess;
  final List<String> subDetails;
  final bool isVerified;
  final String? verificationText;
  final bool uploadDisabled;

  @override
  ConsumerState<PartnerProfileCard> createState() => _PartnerProfileCardState();
}

class _PartnerProfileCardState extends ConsumerState<PartnerProfileCard> {
  bool _isUploading = false;
  String? _errorMessage;

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    if (widget.uploadDisabled || _isUploading) return;

    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (pickedFile == null) {
        setState(() {
          _isUploading = false;
        });
        return;
      }

      final client = ref.read(apiClientProvider);
      final response = await client.uploadFile(
        '/profile/avatar',
        pickedFile.path,
        'file',
        {},
      );

      final avatarUrl = response['avatarUrl'] as String?;
      if (avatarUrl != null) {
        widget.onUploadSuccess();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile picture updated successfully!')),
          );
        }
      } else {
        throw Exception('No avatarUrl returned by server');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().contains('DioException')
            ? 'Network error. Please check connection.'
            : 'Upload failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  void _showImagePickerOptions() {
    if (widget.uploadDisabled || _isUploading) return;

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUploadAvatar(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUploadAvatar(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final client = ref.watch(apiClientProvider);
    final resolvedUrl = _resolveMediaUrl(widget.avatarUrl, client.baseUrl);

    final cleaned = widget.phone.replaceAll('+', '').replaceAll(' ', '');
    final avatarChar = widget.name.isNotEmpty
        ? widget.name[0].toUpperCase()
        : (cleaned.isNotEmpty ? cleaned[0] : 'P');

    return Card(
      color: quickGoGreen,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  label: 'Profile picture avatar',
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.white,
                        backgroundImage: resolvedUrl.isNotEmpty && !_isUploading
                            ? NetworkImage(resolvedUrl)
                            : null,
                        // Show neutral placeholder on load failure (401/403/404) — Section G.6, G.9
                        onBackgroundImageError: resolvedUrl.isNotEmpty
                            ? (_, __) {} // Silently fall through to child placeholder
                            : null,
                        child: (resolvedUrl.isEmpty || _isUploading)
                            ? _isUploading
                                ? const CircularProgressIndicator(
                                    valueColor: AlwaysStoppedAnimation<Color>(quickGoGreen),
                                  )
                                : Text(
                                    avatarChar,
                                    style: const TextStyle(
                                      color: quickGoGreen,
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                            : null,
                      ),
                      if (!widget.uploadDisabled)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Semantics(
                            label: 'Change profile picture button',
                            button: true,
                            child: GestureDetector(
                              onTap: _showImagePickerOptions,
                              child: Container(
                                constraints: const BoxConstraints(
                                  minWidth: 32,
                                  minHeight: 32,
                                ),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black12,
                                      blurRadius: 4,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.camera_alt,
                                  size: 18,
                                  color: quickGoGreen,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              widget.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              widget.roleLabel,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.phone,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 6),
                      for (final detail in widget.subDetails) ...[
                        Text(
                          detail,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.85),
                            fontSize: 12,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                      ],
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: widget.isVerified ? Colors.green.shade600 : Colors.orange.shade700,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          widget.verificationText ?? (widget.isVerified ? 'Verified' : 'Pending Verification'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: _showImagePickerOptions,
                    child: const Text(
                      'Retry',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
