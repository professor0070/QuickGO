import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickgo_shared_ui/quickgo_ui.dart';
import '../providers.dart';

// Provider to list the current partner's tickets
final partnerTicketsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final client = ref.watch(apiClientProvider);
  return client.getList('/support/tickets');
});

// Provider to fetch details of a specific ticket (includes events & details)
final partnerTicketDetailProvider = FutureProvider.family.autoDispose<Map<String, dynamic>, String>((ref, ticketId) async {
  final client = ref.watch(apiClientProvider);
  return client.getMap('/support/tickets/$ticketId');
});

class PartnerSupportScreen extends ConsumerStatefulWidget {
  const PartnerSupportScreen({super.key});

  @override
  ConsumerState<PartnerSupportScreen> createState() => _PartnerSupportScreenState();
}

class _PartnerSupportScreenState extends ConsumerState<PartnerSupportScreen> {
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
    final ticketsAsync = ref.watch(partnerTicketsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Partner Support'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(partnerTicketsProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header Help Banner
            Card(
              clipBehavior: Clip.antiAlias,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: quickGoLine),
              ),
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
                      'Partner Help Desk',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Encountering issues with order dispatch, rider payments, settlement amounts, or account validation? Raise a partner query and track its resolution.',
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
                      icon: const Icon(Icons.support_agent, size: 18),
                      label: const Text('Raise Query Ticket', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Your Support Tickets',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            ticketsAsync.when(
              data: (tickets) {
                if (tickets.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.mark_chat_read_outlined, size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        Text(
                          'No queries submitted',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                        ),
                      ],
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

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (c) => PartnerTicketDetailScreen(ticketId: id),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
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
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            subject,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        _StatusBadge(status: status),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      description,
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                        fontSize: 13,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Submitted: $dateText',
                                      style: TextStyle(
                                        color: Colors.grey.shade500,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (err, _) => Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'Failed to load tickets: $err',
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
            ),
          ],
        ),
      ),
    );
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
        'subject': _subject.text.trim().isEmpty ? 'Partner support request' : _subject.text.trim(),
        'description': desc,
        'priority': 'MEDIUM',
      });
      
      ref.invalidate(partnerTicketsProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Query ticket created successfully')),
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
                    color: Colors.black87,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 12),
            TextField(
              controller: _subject,
              decoration: const InputDecoration(
                labelText: 'Subject',
                hintText: 'Brief summary (e.g. Settlement Delay, Order Reassignment)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _description,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Details / Description',
                hintText: 'Provide detailed information about the issue...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            if (_submitting)
              const Center(child: CircularProgressIndicator())
            else
              FilledButton(
                onPressed: _submitTicket,
                style: FilledButton.styleFrom(
                  backgroundColor: quickGoGreen,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Submit Ticket',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class PartnerTicketDetailScreen extends ConsumerWidget {
  const PartnerTicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(partnerTicketDetailProvider(ticketId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(partnerTicketDetailProvider(ticketId)),
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
            padding: const EdgeInsets.all(16),
            children: [
              // Info Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _StatusBadge(status: status),
                          Chip(
                            label: Text(
                              'Priority: $priority',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        subject,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        description,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Admin Response Section
              if (adminNote.trim().isNotEmpty) ...[
                Card(
                  color: Colors.indigo.shade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
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
                ),
              ),
              const SizedBox(height: 12),
              if (events.isEmpty)
                const Text('No activity logged.')
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
                        // Left timeline line & dot
                        Column(
                          children: [
                            Container(
                              width: 2,
                              height: 16,
                              color: isFirst ? Colors.transparent : Colors.grey.shade300,
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
                              color: isLast ? Colors.transparent : Colors.grey.shade300,
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        // Right details content
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
                                  ),
                                ),
                                if (formattedTime.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    formattedTime,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade500,
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
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Text('Error: $err', style: const TextStyle(color: Colors.redAccent)),
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
