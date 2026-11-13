import 'package:intl/intl.dart';

/// Prices are integer ngwee (K1 = 100 ngwee).
String kwacha(int? ngwee) {
  if (ngwee == null) return '—';
  final k = ngwee / 100;
  if (ngwee % 100 == 0) return 'K${NumberFormat('#,##0').format(k)}';
  return 'K${NumberFormat('#,##0.00').format(k)}';
}

/// Parses user input like "45.5" or "K1,200" to ngwee without float drift.
int toNgwee(String input) {
  final cleaned = input.replaceAll(RegExp(r'[^\d.]'), '');
  final v = double.tryParse(cleaned);
  if (v == null) return 0;
  return (v * 100).round();
}

String priceLevelLabel(int level) => 'K' * level.clamp(1, 3);

String? formatDistance(int? m) {
  if (m == null) return null;
  if (m < 1000) return '${(m / 10).round() * 10} m';
  return '${(m / 1000).toStringAsFixed(1)} km';
}

String timeAgo(DateTime? t, {DateTime? now}) {
  if (t == null) return 'never';
  final days = (now ?? DateTime.now()).difference(t).inDays;
  if (days <= 0) return 'today';
  if (days == 1) return 'yesterday';
  if (days < 30) return '$days days ago';
  if (days < 365) return '${days ~/ 30} mo ago';
  return '${days ~/ 365} yr ago';
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

String whatsappLink(String phone) {
  var p = phone.replaceAll(RegExp(r'[^\d]'), '');
  if (p.startsWith('0')) p = '260${p.substring(1)}';
  return 'https://wa.me/$p';
}

String directionsLink(double lat, double lng) => 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
