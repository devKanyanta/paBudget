import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pabudget/core/api.dart';
import 'package:pabudget/providers.dart';
import 'package:pabudget/screens/explore.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> place(String name, int avg) => {
      'id': name, 'name': name, 'slug': name.toLowerCase(), 'category': 'Cafe', 'area': 'Woodlands', 'priceLevel': 1,
      'avgSpendPpNgwee': avg, 'isFeatured': false, 'thumb': null, 'openNow': true, 'distanceM': null, 'rating': null, 'ratingCount': 0, 'tags': <String>[],
    };

class FakeApi extends ApiClient {
  FakeApi() : super(tokens: MemoryTokenStore());
  final calls = <Map<String, dynamic>?>[];
  bool offline = false;
  @override
  Future<dynamic> request(String method, String path, {Object? body, Map<String, dynamic>? query, bool auth = true}) async {
    if (offline) throw ApiException(0, 'No internet connection');
    calls.add(query);
    if (path == '/meta') return {'areas': [], 'categories': [], 'tags': []};
    if (path == '/places') {
      final cheap = query?['maxPp'] != null;
      return {'total': cheap ? 1 : 2, 'items': cheap ? [place('Cheap Eats', 4000)] : [place('Cheap Eats', 4000), place('Fancy Place', 30000)]};
    }
    throw StateError('unexpected $path');
  }
}

Future<(ProviderContainer, FakeApi)> pump(WidgetTester t) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final api = FakeApi();
  final container = ProviderContainer(overrides: [sharedPrefsProvider.overrideWithValue(prefs), apiProvider.overrideWithValue(api), tokenStoreProvider.overrideWithValue(MemoryTokenStore())]);
  addTearDown(container.dispose);
  await t.pumpWidget(UncontrolledProviderScope(container: container, child: const MaterialApp(home: ExploreScreen())));
  await t.pumpAndSettle();
  return (container, api);
}

void main() {
  testWidgets('explore lists places with price per person', (t) async {
    await pump(t);
    expect(find.text('Cheap Eats'), findsOneWidget);
    expect(find.text('Fancy Place'), findsOneWidget);
    expect(find.text('~K40 pp'), findsOneWidget);
    expect(find.text('2 places'), findsOneWidget);
  });

  testWidgets('budget chip filters via the API', (t) async {
    final (_, api) = await pump(t);
    await t.tap(find.text('Under K100'));
    await t.pumpAndSettle();
    expect(find.text('Fancy Place'), findsNothing);
    expect(api.calls.last?['maxPp'], 10000);
    expect(api.calls.last?['sort'], 'cheapest');
    await t.tap(find.text('Clear filters'));
    await t.pumpAndSettle();
    expect(find.text('Fancy Place'), findsOneWidget);
  });

  testWidgets('falls back to the cached list when offline', (t) async {
    final (container, api) = await pump(t);
    api.offline = true;
    container.invalidate(placeListProvider);
    await t.pumpAndSettle();
    expect(find.text('Cheap Eats'), findsOneWidget);
    expect(find.textContaining('offline'), findsNothing);
  });
}
