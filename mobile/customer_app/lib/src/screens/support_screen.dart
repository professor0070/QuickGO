import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

// Provider to list the current user's tickets
final supportTicketsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  return client.getList('/support/tickets');
});

// Provider to fetch details of a specific ticket (includes events & details)
final ticketDetailProvider = FutureProvider.family.autoDispose<Map<String, dynamic>, String>((ref, ticketId) async {
  final client = ref.watch(apiClientProvider);
  return client.getMap('/support/tickets/$ticketId');
});

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  void _openCreateTicketSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _CreateTicketBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(supportTicketsProvider);
    final hasAppBar = Navigator.canPop(context);

    final content = RefreshIndicator(
      onRefresh: () async => ref.invalidate(supportTicketsProvider),
      color: quickGoGreen,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // Header Help Banner
          Card(
            clipBehavior: Clip.antiAlias,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [quickGoGreen, quickGoGreen.withOpacity(0.85)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Support Center',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Have an issue with an order or account? Submit a support request, and our operations team will resolve it quickly.',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      foregroundColor: quickGoGreen,
                      backgroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: _openCreateTicketSheet,
                    icon: const Icon(Icons.add_comment_outlined, size: 18),
                    label: const Text('Create New Ticket', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Your Tickets',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: quickGoTextDark,
            ),
          ),
          const SizedBox(height: 10),
          ticketsAsync.when(
            data: (tickets) {
              if (tickets.isEmpty) {
                return const SizedBox(
                  height: 200,
                  child: QuickGoEmptyState(
                    title: 'No Tickets Found',
                    message: 'Any support issues you create will appear here.',
                    icon: Icons.support_agent_outlined,
                  ),
                );
              }
              return Column(
                children: tickets.map<Widget>((ticket) {
                  final id = ticket['id'] as String? ?? '';
                  final subject = ticket['subject'] as String? ?? 'No Subject';
                  final description = ticket['description'] as String? ?? '';
                  final status = ticket['status'] as String? ?? 'OPEN';
                  final createdAtStr = ticket['createdAt'] as String? ?? '';
                  final dateText = createdAtStr.length >= 10
                      ? createdAtStr.substring(0, 10)
                      : 'Recently';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: quickGoLine),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _getStatusColor(status).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _getStatusIcon(status),
                          color: _getStatusColor(status),
                          size: 20,
                        ),
                      ),
                      title: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              subject,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: quickGoTextDark,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatusBadge(status: status),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 6),
                          Text(
                            description,
                            style: const TextStyle(
                              color: quickGoTextLight,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Submitted: $dateText',
                            style: const TextStyle(
                              color: quickGoTextLight,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      trailing: const Icon(Icons.chevron_right, color: quickGoTextLight),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (c) => SupportTicketDetailScreen(ticketId: id),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => Column(
              children: List.generate(
                3,
                (index) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
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
            ),
            error: (err, _) => QuickGoErrorState(
              title: 'Failed to load tickets',
              message: err.toString(),
              onRetry: () => ref.invalidate(supportTicketsProvider),
            ),
          ),
        ],
      ),
    );

    if (hasAppBar) {
      return Scaffold(
        appBar: AppBar(title: const Text('Support')),
        body: content,
      );
    }
    return content;
  }
}

class _CreateTicketBottomSheet extends ConsumerStatefulWidget {
  const _CreateTicketBottomSheet();

  @override
  ConsumerState<_CreateTicketBottomSheet> createState() => _CreateTicketBottomSheetState();
}

class _CreateTicketBottomSheetState extends ConsumerState<_CreateTicketBottomSheet> {
  final _subject = TextEditingController();
  final _description = TextEditingController();
  var _submitting = false;

  Future<void> _submitTicket() async {
    final desc = _description.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe your issue')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.postMap('/support/tickets', {
        'subject': _subject.text.trim().isEmpty ? 'Customer support request' : _subject.text.trim(),
        'description': desc,
        'priority': 'MEDIUM',
      });
      
      ref.invalidate(supportTicketsProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Support ticket created successfully'), backgroundColor: quickGoGreen),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create ticket: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.fromLTRB(20, 20, 20, padding + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Submit Support Request',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: quickGoTextDark,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Divider(color: quickGoLine),
            const SizedBox(height: 12),
            QuickGoTextField(
              controller: _subject,
              labelText: 'Subject',
              hintText: 'Brief summary (e.g. Payment Issue, App Bug)',
            ),
            const SizedBox(height: 16),
            QuickGoTextField(
              controller: _description,
              labelText: 'Details / Description',
              hintText: 'Provide detailed information about the issue...',
            ),
            const SizedBox(height: 20),
            QuickGoButton(
              onPressed: _submitTicket,
              isLoading: _submitting,
              label: 'Submit Ticket',
              icon: Icons.send,
            ),
          ],
        ),
      ),
    );
  }
}

class SupportTicketDetailScreen extends ConsumerWidget {
  const SupportTicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(ticketDetailProvider(ticketId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(ticketDetailProvider(ticketId)),
          ),
        ],
      ),
      body: detailAsync.when(
        data: (ticket) {
          final subject = ticket['subject'] as String? ?? 'No Subject';
          final description = ticket['description'] as String? ?? '';
          final status = ticket['status'] as String? ?? 'OPEN';
          final priority = ticket['priority'] as String? ?? 'MEDIUM';
          final adminNote = ticket['adminNote'] as String? ?? '';
          final events = (ticket['events'] as List<dynamic>?) ?? [];

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            children: [
              // Info Card
              QuickGoCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _StatusBadge(status: status),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: quickGoSurface,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: quickGoLine),
                          ),
                          child: Text(
                            'Priority: $priority',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: quickGoTextLight),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      subject,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: quickGoTextDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 14,
                        color: quickGoTextLight,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Admin Response Section
              if (adminNote.trim().isNotEmpty) ...[
                Card(
                  color: Colors.indigo.shade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.indigo.shade100),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.rate_review_outlined, color: Colors.indigo),
                            SizedBox(width: 8),
                            Text(
                              'Response from Operations',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.indigo,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          adminNote,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.indigo.shade900,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Events Timeline
              const Text(
                'Activity History',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: quickGoTextDark,
                ),
              ),
              const SizedBox(height: 12),
              if (events.isEmpty)
                const Text('No activity logged.', style: TextStyle(color: quickGoTextLight))
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: events.length,
                  itemBuilder: (context, index) {
                    final event = events[index] as Map<String, dynamic>;
                    final message = event['message'] as String? ?? '';
                    final isFirst = index == 0;
                    final isLast = index == events.length - 1;
                    final dateStr = event['createdAt'] as String? ?? '';
                    final formattedTime = dateStr.length >= 19
                        ? '${dateStr.substring(0, 10)} ${dateStr.substring(11, 16)}'
                        : '';

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Column(
                          children: [
                            Container(
                              width: 2,
                              height: 16,
                              color: isFirst ? Colors.transparent : quickGoLine,
                            ),
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: quickGoGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Container(
                              width: 2,
                              height: 24,
                              color: isLast ? Colors.transparent : quickGoLine,
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  message,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: quickGoTextDark,
                                  ),
                                ),
                                if (formattedTime.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    formattedTime,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: quickGoTextLight,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: quickGoGreen)),
        error: (err, _) => QuickGoErrorState(
          title: 'Failed to load details',
          message: err.toString(),
          onRetry: () => ref.invalidate(ticketDetailProvider(ticketId)),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

Color _getStatusColor(String status) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return Colors.blue;
    case 'IN_REVIEW':
    case 'IN_PROGRESS':
      return Colors.orange;
    case 'RESOLVED':
    case 'CLOSED':
      return Colors.green;
    case 'REJECTED':
      return Colors.red;
    case 'WAITING_FOR_VENDOR':
    case 'WAITING_FOR_RIDER':
      return Colors.purple;
    default:
      return Colors.grey;
  }
}

IconData _getStatusIcon(String status) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return Icons.fiber_new;
    case 'IN_REVIEW':
    case 'IN_PROGRESS':
      return Icons.pending_actions;
    case 'RESOLVED':
      return Icons.done_all;
    case 'CLOSED':
      return Icons.lock_outline;
    case 'REJECTED':
      return Icons.cancel_outlined;
    case 'WAITING_FOR_VENDOR':
    case 'WAITING_FOR_RIDER':
      return Icons.hourglass_empty;
    default:
      return Icons.help_outline;
  }
}
