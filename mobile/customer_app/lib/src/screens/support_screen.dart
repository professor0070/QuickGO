import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        QuickGoSection(
          title: 'Support',
          children: [
            const TextField(
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Issue details',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {},
              child: const Text('Create Support Ticket'),
            ),
          ],
        ),
      ],
    );
  }
}

