import 'package:flutter/material.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: const [
        QuickGoSection(
          title: 'Profile',
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('Customer'),
              subtitle: Text('Name, mobile number, addresses, and legal consent.'),
            ),
          ],
        ),
      ],
    );
  }
}

