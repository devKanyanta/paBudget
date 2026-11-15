import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pabudget/planner_models.dart';
import 'package:pabudget/screens/planner.dart';

final _reply = {
  'filters': {'budgetNgwee': 40000, 'groupSize': 2, 'areaSlug': 'woodlands', 'tags': [], 'day': null, 'time': null, 'occasion': null},
  'message': 'Here are 1 options within K400 for 2.',
  'notes': ['Nothing matched in that area, so I looked across Lusaka.'],
  'remaining': 7,
  'options': [
    {
      'placeId': 'p1', 'slug': 'cafe', 'name': 'Cafe', 'area': 'Woodlands', 'category': 'Cafe', 'reason': 'Quiet and affordable.', 'thumb': null, 'rating': 4.5,
      'overBudgetNgwee': 0, 'recentBillPpNgwee': 15000,
      'bundle': {'id': 'p1:standard', 'kind': 'standard', 'totalNgwee': 29000, 'items': [
        {'itemId': 'a', 'name': 'Burger', 'priceNgwee': 12000, 'qty': 2, 'role': 'main'},
        {'itemId': 'b', 'name': 'Coke', 'priceNgwee': 2500, 'qty': 2, 'role': 'drink'},
      ]},
    }
  ],
};

void main() {
  test('parses a planner reply and line totals', () {
    final r = PlannerReply.fromJson(_reply);
    expect(r.remaining, 7);
    expect(r.needsBudget, false);
    final o = r.options.single;
    expect(o.totalNgwee, 29000);
    expect(o.items.fold<int>(0, (a, i) => a + i.lineTotal), o.totalNgwee);
    expect(o.recentBillPpNgwee, 15000);
  });

  test('flags a missing budget', () {
    final r = PlannerReply.fromJson({..._reply, 'needs': 'budget', 'options': []});
    expect(r.needsBudget, true);
    expect(r.options, isEmpty);
  });

  test('parses a saved plan', () {
    final p = SavedPlan.fromJson({
      'id': 'x', 'title': 'Outing at Cafe', 'groupSize': 2, 'budgetNgwee': 40000, 'totalNgwee': 29000, 'shareToken': 'tok', 'createdAt': '2026-11-13T10:00:00.000Z',
      'stops': [{'name': 'Cafe', 'area': 'Woodlands', 'slug': 'cafe', 'totalNgwee': 29000, 'items': (_reply['options'] as List).first['bundle']['items']}],
    });
    expect(p.stops.single.items, hasLength(2));
    expect(p.shareToken, 'tok');
  });

  testWidgets('bill card shows each line, the total and the over-budget gap', (tester) async {
    final items = PlannerReply.fromJson(_reply).options.single.items;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: BillCard(items: items, total: 29000, over: 4000))));
    expect(find.text('2 × Burger'), findsOneWidget);
    expect(find.text('K240'), findsOneWidget);
    expect(find.text('K290'), findsOneWidget);
    expect(find.text('K40 over budget'), findsOneWidget);
  });

  test('parses leaderboard rows', () {
    final r = LeaderRow.fromJson({'rank': 1, 'name': 'Chanda', 'points': 40, 'badges': 2, 'isMe': true});
    expect(r.isMe, true);
    expect(r.points, 40);
  });
}
