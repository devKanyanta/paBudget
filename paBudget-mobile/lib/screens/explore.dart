import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../core/format.dart';
import '../providers.dart';
import '../widgets/common.dart';
import '../theme.dart';

class FiltersNotifier extends Notifier<PlaceFilters> {
  @override
  PlaceFilters build() => const PlaceFilters();
  void set(PlaceFilters f) => state = f;
}

final filtersProvider = NotifierProvider<FiltersNotifier, PlaceFilters>(FiltersNotifier.new);

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});
  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _search = TextEditingController();

  @override
  void dispose() { _search.dispose(); super.dispose(); }

  Future<void> _nearMe() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        if (mounted) showSnack(context, 'Location permission is needed for “near me”.');
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      final f = ref.read(filtersProvider);
      ref.read(filtersProvider.notifier).set(f.copyWith(lat: pos.latitude, lng: pos.longitude, sort: 'nearest'));
    } catch (_) {
      if (mounted) showSnack(context, 'Couldn’t get your location.');
    }
  }

  void _openFilters() => showModalBottomSheet(context: context, isScrollControlled: true, showDragHandle: true, builder: (_) => const _FilterSheet());

  @override
  Widget build(BuildContext context) {
    final f = ref.watch(filtersProvider);
    final list = ref.watch(placeListProvider(f));
    final drafts = ref.watch(draftsProvider);
    final notifier = ref.read(filtersProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text.rich(TextSpan(children: [TextSpan(text: 'pa', style: TextStyle(color: Tokens.brand)), TextSpan(text: 'Budget')]), style: TextStyle(fontWeight: FontWeight.w900))),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(placeListProvider(f).future),
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
          Row(children: [
            Expanded(
              child: TextField(
                controller: _search,
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(hintText: 'Search place, dish or area', prefixIcon: Icon(Icons.search)),
                onSubmitted: (v) => notifier.set(f.copyWith(q: v.trim().isEmpty ? null : v.trim())),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filledTonal(onPressed: _openFilters, icon: const Icon(Icons.tune), tooltip: 'Filters'),
          ]),
          const SizedBox(height: 10),
          SizedBox(
            height: 38,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              for (final b in [100, 200, 300, 500])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('Under K$b'),
                    selected: f.maxPpNgwee == b * 100 && f.groupSize == null,
                    onSelected: (s) => notifier.set(f.copyWith(maxPpNgwee: s ? b * 100 : null, totalBudgetNgwee: null, groupSize: null, sort: s ? 'cheapest' : null)),
                  ),
                ),
              Padding(padding: const EdgeInsets.only(right: 8), child: FilterChip(label: const Text('Open now'), selected: f.openNow, onSelected: (s) => notifier.set(f.copyWith(openNow: s)))),
              ActionChip(avatar: const Icon(Icons.near_me, size: 16), label: const Text('Near me'), onPressed: _nearMe),
            ]),
          ),
          if (drafts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Card(color: Tokens.brandSoft, child: ListTile(leading: const Icon(Icons.cloud_upload_outlined), title: Text('${drafts.length} contribution${drafts.length == 1 ? '' : 's'} waiting to send'), trailing: TextButton(onPressed: () async { final n = await ref.read(draftsProvider.notifier).sync(); if (context.mounted) showSnack(context, n > 0 ? 'Sent $n' : 'Still offline'); }, child: const Text('Send now')))),
            ),
          if (!f.isEmpty)
            Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: () { _search.clear(); notifier.set(const PlaceFilters()); }, child: const Text('Clear filters'))),
          list.when(
            loading: () => const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
            error: (e, _) => SizedBox(height: 300, child: ErrorBox(e, onRetry: () => ref.invalidate(placeListProvider(f)))),
            data: (l) => l.items.isEmpty
                ? const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Nothing matches yet.\nTry a higher budget or fewer filters.', textAlign: TextAlign.center)))
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: Text('${l.total} ${l.total == 1 ? 'place' : 'places'}', style: const TextStyle(color: Tokens.muted))),
                    for (final p in l.items) Padding(padding: const EdgeInsets.only(bottom: 10), child: PlaceCard(p)),
                  ]),
          ),
        ]),
      ),
    );
  }
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet();
  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  late PlaceFilters f = ref.read(filtersProvider);
  late final pp = TextEditingController(text: f.maxPpNgwee != null ? (f.maxPpNgwee! / 100).round().toString() : '');
  late final total = TextEditingController(text: f.totalBudgetNgwee != null ? (f.totalBudgetNgwee! / 100).round().toString() : '');
  late final group = TextEditingController(text: f.groupSize?.toString() ?? '');

  @override
  Widget build(BuildContext context) {
    final meta = ref.watch(metaProvider).value;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: pp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Per person (K)'))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: total, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Or total (K)'))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: group, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Group'))),
          ]),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            initialValue: f.area, decoration: const InputDecoration(labelText: 'Area'),
            items: [const DropdownMenuItem(value: null, child: Text('All areas')), for (final a in meta?.areas ?? []) DropdownMenuItem(value: a.slug, child: Text(a.name))],
            onChanged: (v) => f = f.copyWith(area: v),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            initialValue: f.category, decoration: const InputDecoration(labelText: 'Type'),
            items: [const DropdownMenuItem(value: null, child: Text('All types')), for (final c in meta?.categories ?? []) DropdownMenuItem(value: c.slug, child: Text(c.name))],
            onChanged: (v) => f = f.copyWith(category: v),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            initialValue: f.sort, decoration: const InputDecoration(labelText: 'Sort by'),
            items: const [DropdownMenuItem(value: null, child: Text('Top rated')), DropdownMenuItem(value: 'cheapest', child: Text('Cheapest')), DropdownMenuItem(value: 'nearest', child: Text('Nearest')), DropdownMenuItem(value: 'newest', child: Text('Newest'))],
            onChanged: (v) => f = f.copyWith(sort: v),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            for (final t in meta?.tags ?? [])
              FilterChip(label: Text(t.name), selected: f.tags.contains(t.slug), onSelected: (s) => setState(() => f = f.copyWith(tags: s ? [...f.tags, t.slug] : f.tags.where((x) => x != t.slug).toList()))),
          ]),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              final g = int.tryParse(group.text);
              final t = total.text.isEmpty ? null : toNgwee(total.text);
              final p = pp.text.isEmpty ? null : toNgwee(pp.text);
              final useTotal = t != null && g != null && g > 0;
              ref.read(filtersProvider.notifier).set(f.copyWith(maxPpNgwee: useTotal ? null : p, totalBudgetNgwee: useTotal ? t : null, groupSize: useTotal ? g : null));
              Navigator.pop(context);
            },
            child: const Text('Show results'),
          ),
        ]),
      ),
    );
  }
}
