import 'package:flutter_test/flutter_test.dart';
import 'package:pabudget/core/format.dart';

void main() {
  test('kwacha formats ngwee', () {
    expect(kwacha(12000), 'K120');
    expect(kwacha(12550), 'K125.50');
    expect(kwacha(150000), 'K1,500');
    expect(kwacha(null), '—');
  });
  test('toNgwee parses without float drift', () {
    expect(toNgwee('45.5'), 4550);
    expect(toNgwee('K1,200'), 120000);
    expect(toNgwee('0.29'), 29);
    expect(toNgwee('abc'), 0);
  });
  test('distance, time and links', () {
    expect(formatDistance(430), '430 m');
    expect(formatDistance(2340), '2.3 km');
    expect(formatDistance(null), isNull);
    final now = DateTime(2026, 11, 13, 12);
    expect(timeAgo(DateTime(2026, 11, 13, 8), now: now), 'today');
    expect(timeAgo(DateTime(2026, 11, 12, 8), now: now), 'yesterday');
    expect(timeAgo(DateTime(2026, 10, 1), now: now), '1 mo ago');
    expect(whatsappLink('0971234567'), 'https://wa.me/260971234567');
    expect(priceLevelLabel(2), 'KK');
  });
}
