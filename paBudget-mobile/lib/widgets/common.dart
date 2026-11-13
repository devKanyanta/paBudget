import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/api.dart';
import '../core/format.dart';
import '../models.dart';
import '../providers.dart';
import '../theme.dart';

String errorText(Object e) => e is ApiException ? e.toString() : 'Something went wrong. Please try again.';

class ErrorBox extends StatelessWidget {
  const ErrorBox(this.error, {super.key, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) {
    final offline = error is ApiException && (error as ApiException).isOffline;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(offline ? Icons.cloud_off : Icons.error_outline, size: 40, color: Tokens.muted),
          const SizedBox(height: 8),
          Text(offline ? 'You’re offline. Connect to load this.' : errorText(error), textAlign: TextAlign.center),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Try again')),
        ]),
      ),
    );
  }
}

class Thumb extends StatelessWidget {
  const Thumb(this.url, {super.key, this.size = 88, this.radius = 14});
  final String? url;
  final double size, radius;
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: SizedBox(
          width: size,
          height: size,
          child: url == null
              ? const ColoredBox(color: Tokens.brandSoft, child: Center(child: Text('🍽️', style: TextStyle(fontSize: 28))))
              : CachedNetworkImage(imageUrl: url!, fit: BoxFit.cover, memCacheWidth: (size * 2).round(), placeholder: (_, _) => const ColoredBox(color: Tokens.brandSoft), errorWidget: (_, _, _) => const ColoredBox(color: Tokens.brandSoft)),
        ),
      );
}

class Stars extends StatelessWidget {
  const Stars(this.value, {super.key, this.count});
  final double? value;
  final int? count;
  @override
  Widget build(BuildContext context) => value == null
      ? const Text('No reviews yet', style: TextStyle(fontSize: 12, color: Tokens.muted))
      : Text.rich(TextSpan(children: [
          const TextSpan(text: '★ ', style: TextStyle(color: Tokens.accent)),
          TextSpan(text: value!.toStringAsFixed(1)),
          if (count != null) TextSpan(text: ' ($count)', style: const TextStyle(color: Tokens.muted)),
        ]), style: const TextStyle(fontSize: 12.5));
}

class PlaceCard extends StatelessWidget {
  const PlaceCard(this.p, {super.key});
  final PlaceSummary p;
  @override
  Widget build(BuildContext context) {
    final dist = formatDistance(p.distanceM);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/place/${p.slug}'),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Thumb(p.thumb, size: 92),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                  if (p.isFeatured) const Chip(label: Text('Featured'), visualDensity: VisualDensity.compact, backgroundColor: Tokens.brandSoft),
                ]),
                Text('${p.category} · ${p.area}${dist != null ? ' · $dist' : ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
                const SizedBox(height: 4),
                Row(children: [
                  Text(priceLevelLabel(p.priceLevel), style: const TextStyle(fontWeight: FontWeight.w800, color: Tokens.brand)),
                  const SizedBox(width: 8),
                  Text(p.avgSpendPpNgwee != null ? '~${kwacha(p.avgSpendPpNgwee)} pp' : 'Menu needed', style: const TextStyle(fontSize: 14)),
                ]),
                const SizedBox(height: 2),
                Row(children: [
                  Stars(p.rating, count: p.ratingCount),
                  const SizedBox(width: 8),
                  if (p.openNow == true) const Text('Open now', style: TextStyle(color: Tokens.brand, fontSize: 12.5, fontWeight: FontWeight.w600)),
                  if (p.openNow == false) const Text('Closed', style: TextStyle(color: Tokens.muted, fontSize: 12.5)),
                ]),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Runs [action] only for signed-in users, else sends them to log in.
Future<void> requireContributor(BuildContext context, WidgetRef ref, VoidCallback action) async {
  final user = ref.read(authProvider).value;
  if (user == null) { context.push('/login'); return; }
  action();
}

void showSnack(BuildContext context, String msg) => ScaffoldMessenger.of(context)..hideCurrentSnackBar()..showSnackBar(SnackBar(content: Text(msg)));

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 16, 0, 8),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(text, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)), if (trailing != null) trailing!]),
      );
}
