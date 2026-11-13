import 'package:flutter_test/flutter_test.dart';
import 'package:pabudget/models.dart';
import 'package:pabudget/providers.dart';
import 'package:pabudget/widgets/menu_editor.dart';

void main() {
  test('PlaceSummary parses the API list shape', () {
    final l = PlaceList.fromJson({
      'total': 1,
      'items': [
        {'id': 'a', 'name': 'Cafe', 'slug': 'cafe', 'category': 'Cafe', 'area': 'Woodlands', 'priceLevel': 2, 'avgSpendPpNgwee': 15500, 'isFeatured': false, 'thumb': null, 'openNow': true, 'distanceM': 320, 'rating': 4.5, 'ratingCount': 3, 'tags': ['quiet']}
      ]
    });
    expect(l.items.first.avgSpendPpNgwee, 15500);
    expect(l.items.first.rating, 4.5);
    expect(l.items.first.tags, ['quiet']);
  });

  test('filters build the API query and compare by value', () {
    const a = PlaceFilters(maxPpNgwee: 20000, tags: ['outdoor'], openNow: true, sort: 'cheapest');
    expect(a.toQuery(), {'maxPp': 20000, 'tags': 'outdoor', 'openNow': 'true', 'sort': 'cheapest'});
    expect(a, const PlaceFilters(maxPpNgwee: 20000, tags: ['outdoor'], openNow: true, sort: 'cheapest'));
    final group = const PlaceFilters().copyWith(totalBudgetNgwee: 40000, groupSize: 2);
    expect(group.toQuery(), {'totalBudget': 40000, 'groupSize': 2});
    expect(group.copyWith(groupSize: null).toQuery(), isEmpty); // total without group size is ignored
  });

  test('menu payload drops blank rows', () {
    final m = [DraftSection('Mains', [DraftItem('Burger', 12000), DraftItem('', 0), DraftItem('Free', 0)]), DraftSection('Empty', [DraftItem('', 0)])];
    expect(menuPayload(m), [
      {'name': 'Mains', 'items': [{'name': 'Burger', 'priceNgwee': 12000}]}
    ]);
  });
}
