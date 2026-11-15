/// AI planner shapes. Totals are always computed by the server from real menu prices.
class BillLine {
  BillLine({required this.itemId, required this.name, required this.priceNgwee, required this.qty});
  final String itemId, name;
  final int priceNgwee, qty;
  int get lineTotal => priceNgwee * qty;
  factory BillLine.fromJson(Map<String, dynamic> j) =>
      BillLine(itemId: j['itemId'], name: j['name'], priceNgwee: j['priceNgwee'], qty: j['qty']);
}

class PlanOption {
  PlanOption({required this.placeId, required this.slug, required this.name, required this.area, required this.category, required this.reason, required this.items, required this.totalNgwee, this.thumb, this.rating, this.overBudgetNgwee = 0, this.recentBillPpNgwee});
  final String placeId, slug, name, area, category, reason;
  final String? thumb;
  final double? rating;
  final List<BillLine> items;
  final int totalNgwee, overBudgetNgwee;
  final int? recentBillPpNgwee;
  factory PlanOption.fromJson(Map<String, dynamic> j) => PlanOption(
        placeId: j['placeId'], slug: j['slug'], name: j['name'], area: j['area'], category: j['category'], reason: j['reason'] ?? '',
        thumb: j['thumb'], rating: (j['rating'] as num?)?.toDouble(), overBudgetNgwee: j['overBudgetNgwee'] ?? 0, recentBillPpNgwee: j['recentBillPpNgwee'],
        items: (j['bundle']['items'] as List).map((e) => BillLine.fromJson(Map<String, dynamic>.from(e))).toList(),
        totalNgwee: j['bundle']['totalNgwee'],
      );
}

class PlannerReply {
  PlannerReply({required this.filters, required this.message, required this.notes, required this.options, required this.remaining, this.needsBudget = false});
  final Map<String, dynamic> filters;
  final String message;
  final List<String> notes;
  final List<PlanOption> options;
  final int remaining;
  final bool needsBudget;
  factory PlannerReply.fromJson(Map<String, dynamic> j) => PlannerReply(
        filters: Map<String, dynamic>.from(j['filters']), message: j['message'], notes: (j['notes'] as List? ?? []).cast<String>(),
        options: (j['options'] as List).map((e) => PlanOption.fromJson(Map<String, dynamic>.from(e))).toList(),
        remaining: j['remaining'] ?? 0, needsBudget: j['needs'] == 'budget',
      );
}

class SavedPlanStop {
  SavedPlanStop({required this.name, required this.area, required this.totalNgwee, required this.items, required this.slug});
  final String name, area, slug;
  final int totalNgwee;
  final List<BillLine> items;
  factory SavedPlanStop.fromJson(Map<String, dynamic> j) => SavedPlanStop(
        name: j['name'], area: j['area'], slug: j['slug'], totalNgwee: j['totalNgwee'],
        items: (j['items'] as List).map((e) => BillLine.fromJson(Map<String, dynamic>.from(e))).toList(),
      );
}

class SavedPlan {
  SavedPlan({required this.id, required this.title, required this.groupSize, required this.budgetNgwee, required this.totalNgwee, required this.shareToken, required this.createdAt, required this.stops});
  final String id, title, shareToken;
  final int groupSize, budgetNgwee, totalNgwee;
  final DateTime createdAt;
  final List<SavedPlanStop> stops;
  factory SavedPlan.fromJson(Map<String, dynamic> j) => SavedPlan(
        id: j['id'], title: j['title'], groupSize: j['groupSize'], budgetNgwee: j['budgetNgwee'], totalNgwee: j['totalNgwee'], shareToken: j['shareToken'],
        createdAt: DateTime.parse(j['createdAt']), stops: (j['stops'] as List).map((e) => SavedPlanStop.fromJson(Map<String, dynamic>.from(e))).toList(),
      );
}

class LeaderRow {
  LeaderRow({required this.rank, required this.name, required this.points, required this.badges, required this.isMe});
  final int rank, points, badges;
  final String name;
  final bool isMe;
  factory LeaderRow.fromJson(Map<String, dynamic> j) =>
      LeaderRow(rank: j['rank'], name: j['name'], points: j['points'], badges: j['badges'] ?? 0, isMe: j['isMe'] ?? false);
}

class BadgeInfo {
  BadgeInfo({required this.name, required this.rule, required this.earned});
  final String name, rule;
  final bool earned;
  factory BadgeInfo.fromJson(Map<String, dynamic> j) => BadgeInfo(name: j['name'], rule: j['rule'], earned: j['earnedAt'] != null);
}
