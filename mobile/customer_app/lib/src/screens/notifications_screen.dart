import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return const QuickGoEmptyState(
              title: 'No Notifications Yet',
              message: 'Alerts and updates from merchants and orders appear here.',
              icon: Icons.notifications_none_outlined,
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            color: quickGoGreen,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final notification = notifications[index] as Map<String, dynamic>;
                final title = notification['title']?.toString() ?? 'Notification';
                final body = notification['body']?.toString() ?? '';
                final isRead = notification['readAt'] != null;
                final notificationId = notification['id']?.toString() ?? '';
                final createdAt = notification['createdAt']?.toString() ?? '';

                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: quickGoLine),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isRead ? quickGoSurface : quickGoGreen.withOpacity(0.05),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isRead ? Icons.notifications_none : Icons.notifications_active,
                        color: isRead ? quickGoTextLight : quickGoGreen,
                      ),
                    ),
                    title: Text(
                      title,
                      style: TextStyle(
                        fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                        color: quickGoTextDark,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: quickGoTextDark)),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          _formatTimestamp(createdAt),
                          style: const TextStyle(fontSize: 12, color: quickGoTextLight),
                        ),
                      ],
                    ),
                    onTap: isRead
                        ? null
                        : () async {
                            try {
                              final client = ref.read(apiClientProvider);
                              await client.patchMap('/notifications/$notificationId/read', {});
                              ref.invalidate(notificationsProvider);
                              ref.invalidate(unreadNotificationCountProvider);
                            } catch (_) {
                              // Silently ignore mark-read errors
                            }
                          },
                  ),
                );
              },
            ),
          );
        },
        loading: () => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: 4,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) => Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: quickGoLine),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                QuickGoSkeleton(width: 40, height: 40, borderRadius: 20),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      QuickGoSkeleton(width: 120, height: 16),
                      SizedBox(height: 8),
                      QuickGoSkeleton(width: 200, height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        error: (error, _) => QuickGoErrorState(
          title: 'Failed to load notifications',
          message: error.toString(),
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
      ),
    );
  }

  String _formatTimestamp(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    final local = parsed.toLocal();
    final now = DateTime.now();
    final diff = now.difference(local);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${local.day}/${local.month}/${local.year}';
  }
}
