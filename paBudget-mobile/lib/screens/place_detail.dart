import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api.dart';
import '../core/format.dart';
import '../models.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/common.dart';

class PlaceDetailScreen extends ConsumerStatefulWidget {
  const PlaceDetailScreen({super.key, required this.slug});
  final String slug;
  @override
  ConsumerState<PlaceDetailScreen> createState() => _PlaceDetailScreenState();
}

class _PlaceDetailScreenState extends ConsumerState<PlaceDetailScreen> {
  bool _viewed = false;

  Future<void> _launch(String url) async {
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok && mounted) showSnack(context, 'Couldn’t open that.');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(placeDetailProvider(widget.slug));
    return Scaffold(
      appBar: AppBar(),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorBox(e, onRetry: () => ref.invalidate(placeDetailProvider(widget.slug))),
        data: (p) {
          if (!_viewed) { _viewed = true; WidgetsBinding.instance.addPostFrameCallback((_) => trackEvent(ref, p.id, 'view')); }
          return _Body(p: p, launch: _launch);
        },
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.p, required this.launch});
  final PlaceDetail p;
  final Future<void> Function(String) launch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(reviewsProvider(p.id));
    final favs = ref.watch(favouritesProvider).value ?? [];
    final isFav = favs.any((f) => f.id == p.id);
    final user = ref.watch(authProvider).value;
    return ListView(padding: const EdgeInsets.only(bottom: 32), children: [
      if (p.images.isEmpty)
        Container(height: 160, margin: const EdgeInsets.symmetric(horizontal: 16), decoration: BoxDecoration(color: Tokens.brandSoft, borderRadius: BorderRadius.circular(18)), child: const Center(child: Text('🍽️', style: TextStyle(fontSize: 48))))
      else
        SizedBox(
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: p.images.length, separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) => ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: AspectRatio(aspectRatio: 4 / 3, child: Stack(fit: StackFit.expand, children: [
                CachedNetworkImage(imageUrl: i == 0 ? p.images[i].medium : p.images[i].thumb, fit: BoxFit.cover, placeholder: (_, _) => const ColoredBox(color: Tokens.brandSoft)),
                if (p.images[i].by != null) Positioned(left: 6, bottom: 6, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(6)), child: Text('Photo by ${p.images[i].by}', style: const TextStyle(color: Colors.white, fontSize: 11)))),
              ])),
            ),
          ),
        ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Text(p.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900))),
            IconButton.filledTonal(
              tooltip: isFav ? 'Remove from saved' : 'Save',
              icon: Icon(isFav ? Icons.favorite : Icons.favorite_border, color: isFav ? Tokens.danger : null),
              onPressed: () async {
                if (user == null) { context.push('/login'); return; }
                try { await toggleFavourite(ref, p.id, isFav); } on ApiException catch (e) { if (context.mounted) showSnack(context, e.message); }
              },
            ),
          ]),
          Text('${p.category} · ${p.area}${p.address != null ? ' · ${p.address}' : ''}', style: const TextStyle(color: Tokens.muted)),
          const SizedBox(height: 8),
          Wrap(spacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Text(priceLevelLabel(p.priceLevel), style: const TextStyle(fontWeight: FontWeight.w800, color: Tokens.brand)),
            if (p.avgSpendPpNgwee != null) Text('~${kwacha(p.avgSpendPpNgwee)} per person'),
            Stars(p.rating, count: p.ratingCount),
            if (p.openNow == true) const Text('Open now', style: TextStyle(color: Tokens.brand, fontWeight: FontWeight.w600)),
            if (p.openNow == false) const Text('Closed now', style: TextStyle(color: Tokens.muted)),
            if (p.closedPermanently) const Text('Permanently closed', style: TextStyle(color: Tokens.danger, fontWeight: FontWeight.w700)),
          ]),
          if (p.tags.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Wrap(spacing: 6, runSpacing: 6, children: [for (final t in p.tags) Chip(label: Text(t), visualDensity: VisualDensity.compact)])),
          if (p.description != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(p.description!)),
          const SizedBox(height: 12),
          Row(children: [
            if (p.phone != null) Expanded(child: OutlinedButton.icon(onPressed: () { trackEvent(ref, p.id, 'call'); launch('tel:${p.phone}'); }, icon: const Icon(Icons.call), label: const Text('Call'))),
            if (p.phone != null || p.whatsapp != null) ...[const SizedBox(width: 8), Expanded(child: OutlinedButton.icon(onPressed: () { trackEvent(ref, p.id, 'whatsapp'); launch(whatsappLink(p.whatsapp ?? p.phone!)); }, icon: const Icon(Icons.chat), label: const Text('WhatsApp')))],
            const SizedBox(width: 8),
            Expanded(child: FilledButton.icon(style: FilledButton.styleFrom(minimumSize: const Size(0, 44)), onPressed: () { trackEvent(ref, p.id, 'directions'); launch(directionsLink(p.lat, p.lng)); }, icon: const Icon(Icons.directions), label: const Text('Directions'))),
          ]),
        ]),
      ),
      _Section(
        title: 'Menu & prices',
        trailing: Text('Updated ${timeAgo(p.menuUpdatedAt)}${p.menuAddedBy != null ? ' · by ${p.menuAddedBy}' : ''}', style: const TextStyle(fontSize: 11.5, color: Tokens.muted)),
        child: p.menu.isEmpty
            ? const Text('No menu yet. Be the first to add it!', style: TextStyle(color: Tokens.muted))
            : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final s in p.menu) ...[
                  Padding(padding: const EdgeInsets.only(top: 8, bottom: 2), child: Text(s.name.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: .8, color: Tokens.brand))),
                  for (final i in s.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.name, style: const TextStyle(fontWeight: FontWeight.w500)), if (i.description != null) Text(i.description!, style: const TextStyle(fontSize: 12, color: Tokens.muted))])),
                        Text(kwacha(i.priceNgwee), style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
                      ]),
                    ),
                ],
              ]),
      ),
      if (p.hours.isNotEmpty)
        _Section(title: 'Opening hours', child: Column(children: [
          for (var d = 0; d < 7; d++)
            Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(children: [
              SizedBox(width: 52, child: Text(weekdays[d], style: const TextStyle(fontWeight: FontWeight.w600))),
              Text(p.hours.where((h) => h.weekday == d).map((h) => '${h.opensAt}–${h.closesAt}').join(', ').ifEmpty('Closed'), style: const TextStyle(color: Tokens.muted)),
            ])),
        ])),
      _Section(
        title: 'Reviews',
        child: reviews.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text(errorText(e), style: const TextStyle(color: Tokens.muted)),
          data: (list) => list.isEmpty ? const Text('No reviews yet.', style: TextStyle(color: Tokens.muted)) : Column(children: [for (final r in list) _ReviewTile(r)]),
        ),
      ),
      _Section(
        title: 'Help keep this page accurate',
        child: Wrap(spacing: 8, runSpacing: 8, children: [
          ActionChip(avatar: const Icon(Icons.star_outline, size: 16), label: const Text('Write a review'), onPressed: () => requireContributor(context, ref, () => context.push('/contribute/${p.slug}/review'))),
          ActionChip(avatar: const Icon(Icons.restaurant_menu, size: 16), label: const Text('Add / update menu'), onPressed: () => requireContributor(context, ref, () => context.push('/contribute/${p.slug}/menu'))),
          ActionChip(avatar: const Icon(Icons.photo_camera_outlined, size: 16), label: const Text('Add photos'), onPressed: () => requireContributor(context, ref, () => context.push('/contribute/${p.slug}/photos'))),
          ActionChip(avatar: const Icon(Icons.edit_outlined, size: 16), label: const Text('Suggest an edit'), onPressed: () => requireContributor(context, ref, () => context.push('/contribute/${p.slug}/edit'))),
          ActionChip(avatar: const Icon(Icons.flag_outlined, size: 16), label: const Text('Report'), onPressed: () => requireContributor(context, ref, () => _report(context, ref))),
        ]),
      ),
    ]);
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final c = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Report this place'),
        content: TextField(controller: c, decoration: const InputDecoration(hintText: 'What is wrong?'), maxLines: 3),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(80, 40)), onPressed: () => Navigator.pop(context, c.text), child: const Text('Send'))],
      ),
    );
    if (reason == null || reason.trim().length < 3) return;
    try {
      await ref.read(apiProvider).post('/submissions/flag', body: {'targetType': 'place', 'targetId': p.id, 'reason': reason.trim()});
      if (context.mounted) showSnack(context, 'Thanks — we’ll take a look.');
    } on ApiException catch (e) {
      if (context.mounted) showSnack(context, e.message);
    }
  }
}

extension on String {
  String ifEmpty(String other) => isEmpty ? other : this;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child, this.trailing});
  final String title;
  final Widget child;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                if (trailing != null) Flexible(child: trailing!),
              ]),
              const SizedBox(height: 6),
              child,
            ]),
          ),
        ),
      );
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile(this.r);
  final Review r;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(r.author, style: const TextStyle(fontWeight: FontWeight.w700)), Text(timeAgo(r.createdAt), style: const TextStyle(fontSize: 12, color: Tokens.muted))]),
          Stars(r.rating.toDouble()),
          if (r.amountPaidNgwee != null) Text('Paid ${kwacha(r.amountPaidNgwee)}${r.groupSize != null ? ' for ${r.groupSize}' : ''}${r.itemsOrdered != null ? ' · ${r.itemsOrdered}' : ''}', style: const TextStyle(fontSize: 12, color: Tokens.muted)),
          if (r.body != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(r.body!)),
          if (r.ownerReply != null) Container(margin: const EdgeInsets.only(top: 6), padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Tokens.brandSoft, borderRadius: BorderRadius.circular(8)), child: Text('Owner reply: ${r.ownerReply}', style: const TextStyle(fontSize: 12))),
          const Divider(height: 20),
        ]),
      );
}
