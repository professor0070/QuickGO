import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _subject = TextEditingController();
  final _description = TextEditingController();
  var _submitting = false;

  Future<void> _createTicket() async {
    if (_description.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.postMap('/support/tickets', {
        'subject': _subject.text.trim().isEmpty ? 'Customer support request' : _subject.text.trim(),
        'description': _description.text.trim(),
        'priority': 'MEDIUM',
      });
      _subject.clear();
      _description.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support ticket created')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create ticket: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        QuickGoSection(
          title: 'Support',
          children: [
            TextField(
              controller: _subject,
              decoration: const InputDecoration(
                labelText: 'Subject',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _description,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Issue details',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            if (_submitting)
              const Center(child: CircularProgressIndicator())
            else
              FilledButton(
                onPressed: _createTicket,
                child: const Text('Create Support Ticket'),
              ),
          ],
        ),
      ],
    );
  }
}
