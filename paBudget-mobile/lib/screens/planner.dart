import 'package:flutter/material.dart' hide Thumb;
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/format.dart';
import '../planner_models.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Where shared plans open on the web.
const siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'https://pabudget.app');

class BillCard extends StatelessWidget {
  const BillCard({super.key, required this.items, required this.total, this.over = 0});
  final List<BillLine> items;
  final int total, over;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Tokens.sunken, borderRadius: BorderRadius.circular(12)),
        child: Column(children: [
          for (final i in items) Padding(padding: const EdgeInsets.symmetric(vertical: 1), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Flexible(child: Text('${i.qty} × ${i.name}')), Text(kwacha(i.lineTotal))])),
          const Divider(height: 14),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Estimated total', style: TextStyle(fontWeight: FontWeight.w800)), Text(kwacha(total), style: const TextStyle(fontWeight: FontWeight.w800))]),
          if (over > 0) Align(alignment: Alignment.centerRight, child: Text('${kwacha(over)} over budget', style: const TextStyle(color: Tokens.danger, fontSize: 12, fontWeight: FontWeight.w600))),
        ]),
      );
}

Future<void> shareOnWhatsApp(String text) => launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}'), mode: LaunchMode.externalApplication);

class _Msg {
  _Msg(this.fromUser, this.text, [this.reply]);
  final bool fromUser;
  final String text;
  final PlannerReply? reply;
}

class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});
  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _msgs = <_Msg>[_Msg(false, 'Tell me your budget, group size, area and vibe — I’ll suggest places with real menu prices.')];
  Map<String, dynamic>? _filters;
  bool _busy = false;
  int? _remaining;
  static const examples = ['Date for 2 in Woodlands, K400 max, outdoor, Saturday evening', 'Lunch for 4, K300, Kabulonga', 'Cheap family dinner for 5, K500'];

  Future<void> _send(String text) async {
    final message = text.trim();
    if (message.length < 2 || _busy) return;
    _input.clear();
    setState(() { _busy = true; _msgs.add(_Msg(true, message)); });
    try {
      final j = await ref.read(apiProvider).post('/planner/chat', body: {'message': message, if (_filters != null) 'filters': _filters});
      final r = PlannerReply.fromJson(Map<String, dynamic>.from(j));
      setState(() { _filters = r.filters; _remaining = r.remaining; _msgs.add(_Msg(false, r.message, r)); });
    } catch (e) {
      setState(() => _msgs.add(_Msg(false, errorText(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) { if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).value;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plan my outing', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [if (user != null) IconButton(tooltip: 'Saved plans', icon: const Icon(Icons.bookmarks_outlined), onPressed: () => context.push('/plans'))],
      ),
      body: user == null
          ? Center(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.receipt_long_outlined, size: 36, color: Tokens.faint),
              const SizedBox(height: 12),
              const Text('Know the bill before you go', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
              const SizedBox(height: 6),
              const Text('Log in, tell the planner your budget and group size, and get places with a bill built from real menu prices.', textAlign: TextAlign.center, style: TextStyle(color: Tokens.muted)),
              const SizedBox(height: 20),
              FilledButton(onPressed: () => context.push('/login'), child: const Text('Log in')),
            ])))
          : Column(children: [
              Expanded(
                child: ListView(controller: _scroll, padding: const EdgeInsets.all(16), children: [
                  for (final m in _msgs) _bubble(m),
                  if (_busy) const Padding(padding: EdgeInsets.all(8), child: Text('Planning…', style: TextStyle(color: Tokens.muted))),
                  if (_msgs.length == 1) Wrap(spacing: 8, runSpacing: 8, children: [for (final e in examples) ActionChip(label: Text(e), onPressed: () => _send(e))]),
                ]),
              ),
              if (_remaining != null) Text('$_remaining requests left today', style: const TextStyle(fontSize: 11, color: Tokens.muted)),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                  child: Row(children: [
                    Expanded(child: TextField(controller: _input, maxLength: 500, textInputAction: TextInputAction.send, onSubmitted: _send, decoration: InputDecoration(hintText: _filters != null ? 'Refine: cheaper, outdoor, Saturday…' : 'e.g. Date for 2, K400, Woodlands', counterText: ''))),
                    const SizedBox(width: 8),
                    IconButton.filled(onPressed: _busy ? null : () => _send(_input.text), icon: const Icon(Icons.send)),
                  ]),
                ),
              ),
            ]),
    );
  }

  Widget _bubble(_Msg m) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: m.fromUser
            ? Align(alignment: Alignment.centerRight, child: Container(constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), decoration: BoxDecoration(color: Tokens.brand, borderRadius: BorderRadius.circular(16)), child: Text(m.text, style: const TextStyle(color: Colors.white))))
            : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.text),
                for (final n in m.reply?.notes ?? const <String>[]) Text(n, style: const TextStyle(fontSize: 12, color: Tokens.muted)),
                for (final o in m.reply?.options ?? const <PlanOption>[]) Padding(padding: const EdgeInsets.only(top: 10), child: _OptionCard(o, m.reply!.filters)),
                if (m.reply != null && m.reply!.options.isNotEmpty) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Try: “cheaper”, “somewhere outdoor”, “Friday night instead”.', style: TextStyle(fontSize: 12, color: Tokens.muted))),
              ]),
      );
}

class _OptionCard extends ConsumerStatefulWidget {
  const _OptionCard(this.o, this.filters);
  final PlanOption o;
  final Map<String, dynamic> filters;
  @override
  ConsumerState<_OptionCard> createState() => _OptionCardState();
}

class _OptionCardState extends ConsumerState<_OptionCard> {
  SavedPlan? _saved;
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final o = widget.o;
      final j = await ref.read(apiProvider).post('/plans', body: {
        'budgetNgwee': widget.filters['budgetNgwee'], 'groupSize': widget.filters['groupSize'],
        'stops': [{'placeId': o.placeId, 'items': [for (final i in o.items) {'itemId': i.itemId, 'qty': i.qty}]}],
      });
      ref.invalidate(savedPlansProvider);
      setState(() => _saved = SavedPlan.fromJson(Map<String, dynamic>.from(j)));
    } catch (e) {
      if (mounted) showSnack(context, errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.o;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          InkWell(
            onTap: () => context.push('/place/${o.slug}'),
            child: Row(children: [
              Thumb(o.thumb, size: 56),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                Text('${o.category} · ${o.area}${o.rating != null ? ' · ${o.rating} stars' : ''}', style: const TextStyle(fontSize: 12, color: Tokens.muted)),
              ])),
            ]),
          ),
          if (o.reason.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(o.reason)),
          const SizedBox(height: 8),
          BillCard(items: o.items, total: o.totalNgwee, over: o.overBudgetNgwee),
          if (o.recentBillPpNgwee != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Recent diners reported paying about ${kwacha(o.recentBillPpNgwee)} per person.', style: const TextStyle(fontSize: 12, color: Tokens.muted))),
          const SizedBox(height: 8),
          if (_saved == null)
            OutlinedButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save plan'))
          else
            Wrap(spacing: 8, children: [
              const Chip(label: Text('Saved ✓')),
              OutlinedButton.icon(onPressed: () => shareOnWhatsApp('${o.name}: about ${kwacha(_saved!.totalNgwee)} for ${widget.filters['groupSize']}. $siteUrl/plan/${_saved!.shareToken}'), icon: const Icon(Icons.chat), label: const Text('WhatsApp')),
              OutlinedButton.icon(onPressed: () { Clipboard.setData(ClipboardData(text: '$siteUrl/plan/${_saved!.shareToken}')); showSnack(context, 'Link copied'); }, icon: const Icon(Icons.link), label: const Text('Copy link')),
            ]),
        ]),
      ),
    );
  }
}

final savedPlansProvider = FutureProvider<List<SavedPlan>>((ref) async {
  if (ref.watch(authProvider).value == null) return [];
  final j = await ref.read(apiProvider).get('/plans');
  return (j as List).map((e) => SavedPlan.fromJson(Map<String, dynamic>.from(e))).toList();
});

class SavedPlansScreen extends ConsumerWidget {
  const SavedPlansScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(savedPlansProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved plans', style: TextStyle(fontWeight: FontWeight.w800))),
      body: plans.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorBox(e, onRetry: () => ref.invalidate(savedPlansProvider)),
        data: (l) => l.isEmpty
            ? const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Nothing saved yet.\nAsk the planner for an outing and tap “Save plan”.', textAlign: TextAlign.center)))
            : ListView(padding: const EdgeInsets.all(16), children: [
                for (final p in l)
                  Card(
                    child: ExpansionTile(
                      title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text('${kwacha(p.totalNgwee)} for ${p.groupSize} · ${timeAgo(p.createdAt)}'),
                      childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      children: [
                        for (final s in p.stops) ...[Align(alignment: Alignment.centerLeft, child: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700))), const SizedBox(height: 4), BillCard(items: s.items, total: s.totalNgwee), const SizedBox(height: 8)],
                        Row(children: [
                          TextButton.icon(onPressed: () => shareOnWhatsApp('${p.title}: about ${kwacha(p.totalNgwee)} for ${p.groupSize}. $siteUrl/plan/${p.shareToken}'), icon: const Icon(Icons.chat), label: const Text('Share')),
                          const Spacer(),
                          TextButton(
                            style: TextButton.styleFrom(foregroundColor: Tokens.danger),
                            onPressed: () async { await ref.read(apiProvider).delete('/plans/${p.id}'); ref.invalidate(savedPlansProvider); },
                            child: const Text('Delete'),
                          ),
                        ]),
                      ],
                    ),
                  ),
              ]),
      ),
    );
  }
}

final leaderboardProvider = FutureProvider.family<List<LeaderRow>, String?>((ref, area) async {
  final j = await ref.read(apiProvider).get('/leaderboard', query: {'area': ?area});
  return (j as List).map((e) => LeaderRow.fromJson(Map<String, dynamic>.from(e))).toList();
});
final badgesProvider = FutureProvider<List<BadgeInfo>>((ref) async {
  if (ref.watch(authProvider).value == null) return [];
  final j = await ref.read(apiProvider).get('/me/badges');
  return (j as List).map((e) => BadgeInfo.fromJson(Map<String, dynamic>.from(e))).toList();
});

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  String? _area;
  @override
  Widget build(BuildContext context) {
    final meta = ref.watch(metaProvider).value;
    final rows = ref.watch(leaderboardProvider(_area));
    final badges = ref.watch(badgesProvider).value ?? const <BadgeInfo>[];
    return Scaffold(
      appBar: AppBar(title: const Text('Top contributors', style: TextStyle(fontWeight: FontWeight.w800))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        DropdownButtonFormField<String?>(
          initialValue: _area,
          decoration: const InputDecoration(labelText: 'Area'),
          items: [const DropdownMenuItem(value: null, child: Text('All Lusaka')), for (final a in meta?.areas ?? const []) DropdownMenuItem(value: a.slug, child: Text(a.name))],
          onChanged: (v) => setState(() => _area = v),
        ),
        const SizedBox(height: 12),
        rows.when(
          loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
          error: (e, _) => ErrorBox(e, onRetry: () => ref.invalidate(leaderboardProvider(_area))),
          data: (l) => l.isEmpty
              ? const Padding(padding: EdgeInsets.all(24), child: Text('No contributions here yet — be the first!', textAlign: TextAlign.center))
              : Column(children: [
                  for (final r in l)
                    Card(
                      shape: r.isMe ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Tokens.brand)) : null,
                      child: ListTile(
                        leading: CircleAvatar(backgroundColor: Tokens.brandSoft, child: Text('${r.rank}', style: const TextStyle(fontWeight: FontWeight.w900, color: Tokens.brand))),
                        title: Text('${r.name}${r.isMe ? ' (you)' : ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('${r.badges} badge${r.badges == 1 ? '' : 's'}'),
                        trailing: Text('${r.points} pts', style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ),
                ]),
        ),
        if (badges.isNotEmpty) ...[
          const SectionTitle('Your badges'),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final b in badges) Chip(avatar: Icon(b.earned ? Icons.military_tech : Icons.lock_outline, size: 18, color: b.earned ? Tokens.accent : Tokens.muted), label: Text(b.name), side: BorderSide(color: b.earned ? Tokens.accent : Tokens.border))]),
        ],
      ]),
    );
  }
}
