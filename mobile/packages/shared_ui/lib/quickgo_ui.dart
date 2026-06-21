import 'package:flutter/material.dart';

const quickGoGreen = Color(0xFF246B45);
const quickGoSurface = Color(0xFFF7FAF7);
const quickGoLine = Color(0xFFD9E4DC);

ThemeData quickGoTheme() {
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: quickGoGreen),
    scaffoldBackgroundColor: quickGoSurface,
    appBarTheme: const AppBarTheme(
      backgroundColor: quickGoGreen,
      foregroundColor: Colors.white,
    ),
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: quickGoLine),
      ),
    ),
  );
}

class QuickGoSection extends StatelessWidget {
  const QuickGoSection({
    super.key,
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }
}

