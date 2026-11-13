class Area {
  Area({required this.id, required this.name, required this.slug, required this.lat, required this.lng});
  final String id, name, slug;
  final double lat, lng;
  factory Area.fromJson(Map<String, dynamic> j) =>
      Area(id: j['id'], name: j['name'], slug: j['slug'], lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble());
}

class Named {
  Named({required this.id, required this.name, required this.slug, this.type});
  final String id, name, slug;
  final String? type;
  factory Named.fromJson(Map<String, dynamic> j) => Named(id: j['id'], name: j['name'], slug: j['slug'], type: j['type']);
}

class Meta {
  Meta({required this.areas, required this.categories, required this.tags});
  final List<Area> areas;
  final List<Named> categories, tags;
  factory Meta.fromJson(Map<String, dynamic> j) => Meta(
        areas: (j['areas'] as List).map((e) => Area.fromJson(e)).toList(),
        categories: (j['categories'] as List).map((e) => Named.fromJson(e)).toList(),
        tags: (j['tags'] as List).map((e) => Named.fromJson(e)).toList(),
      );
}

class PlaceSummary {
  PlaceSummary({
    required this.id, required this.name, required this.slug, required this.category, required this.area,
    required this.priceLevel, this.avgSpendPpNgwee, this.isFeatured = false, this.thumb, this.openNow,
    this.distanceM, this.rating, this.ratingCount = 0, this.tags = const [],
  });
  final String id, name, slug, category, area;
  final int priceLevel, ratingCount;
  final int? avgSpendPpNgwee, distanceM;
  final bool isFeatured;
  final String? thumb;
  final bool? openNow;
  final double? rating;
  final List<String> tags;

  factory PlaceSummary.fromJson(Map<String, dynamic> j) => PlaceSummary(
        id: j['id'], name: j['name'], slug: j['slug'], category: j['category'], area: j['area'],
        priceLevel: j['priceLevel'] ?? 1, avgSpendPpNgwee: j['avgSpendPpNgwee'], isFeatured: j['isFeatured'] ?? false,
        thumb: j['thumb'], openNow: j['openNow'], distanceM: j['distanceM'], rating: (j['rating'] as num?)?.toDouble(),
        ratingCount: j['ratingCount'] ?? 0, tags: (j['tags'] as List? ?? []).cast<String>(),
      );
}

class PlaceList {
  PlaceList(this.total, this.items);
  final int total;
  final List<PlaceSummary> items;
  factory PlaceList.fromJson(Map<String, dynamic> j) =>
      PlaceList(j['total'], (j['items'] as List).map((e) => PlaceSummary.fromJson(e)).toList());
}

class MenuItem {
  MenuItem({required this.id, required this.name, required this.priceNgwee, this.description});
  final String id, name;
  final int priceNgwee;
  final String? description;
  factory MenuItem.fromJson(Map<String, dynamic> j) =>
      MenuItem(id: j['id'], name: j['name'], priceNgwee: j['priceNgwee'], description: j['description']);
}

class MenuSection {
  MenuSection(this.id, this.name, this.items);
  final String id, name;
  final List<MenuItem> items;
  factory MenuSection.fromJson(Map<String, dynamic> j) =>
      MenuSection(j['id'], j['name'], (j['items'] as List).map((e) => MenuItem.fromJson(e)).toList());
}

class PlaceImage {
  PlaceImage({required this.thumb, required this.medium, required this.full, this.by});
  final String thumb, medium, full;
  final String? by;
  factory PlaceImage.fromJson(Map<String, dynamic> j) =>
      PlaceImage(thumb: j['thumb'], medium: j['medium'], full: j['full'], by: j['by']);
}

class Hours {
  Hours(this.weekday, this.opensAt, this.closesAt);
  final int weekday;
  final String opensAt, closesAt;
}

class PlaceDetail {
  PlaceDetail({
    required this.id, required this.name, required this.slug, required this.category, required this.area,
    required this.lat, required this.lng, required this.priceLevel, this.description, this.address, this.phone,
    this.whatsapp, this.avgSpendPpNgwee, this.menuUpdatedAt, this.menuAddedBy, this.openNow, this.rating,
    this.ratingCount = 0, this.closedPermanently = false, this.hours = const [], this.tags = const [],
    this.images = const [], this.menu = const [],
  });
  final String id, name, slug, category, area;
  final double lat, lng;
  final int priceLevel, ratingCount;
  final String? description, address, phone, whatsapp, menuAddedBy;
  final int? avgSpendPpNgwee;
  final DateTime? menuUpdatedAt;
  final bool? openNow;
  final double? rating;
  final bool closedPermanently;
  final List<Hours> hours;
  final List<String> tags;
  final List<PlaceImage> images;
  final List<MenuSection> menu;

  factory PlaceDetail.fromJson(Map<String, dynamic> j) => PlaceDetail(
        id: j['id'], name: j['name'], slug: j['slug'], category: j['category'], area: j['area'],
        lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble(), priceLevel: j['priceLevel'] ?? 1,
        description: j['description'], address: j['address'], phone: j['phone'], whatsapp: j['whatsapp'],
        avgSpendPpNgwee: j['avgSpendPpNgwee'], menuAddedBy: j['menuAddedBy'],
        menuUpdatedAt: j['menuUpdatedAt'] != null ? DateTime.parse(j['menuUpdatedAt']) : null,
        openNow: j['openNow'], rating: (j['rating'] as num?)?.toDouble(), ratingCount: j['ratingCount'] ?? 0,
        closedPermanently: j['closedPermanently'] ?? false,
        hours: (j['hours'] as List).map((h) => Hours(h['weekday'], h['opensAt'], h['closesAt'])).toList(),
        tags: (j['tags'] as List).map((t) => t['name'] as String).toList(),
        images: (j['images'] as List).map((e) => PlaceImage.fromJson(e)).toList(),
        menu: (j['menu'] as List).map((e) => MenuSection.fromJson(e)).toList(),
      );
}

class Review {
  Review({required this.id, required this.rating, required this.author, required this.createdAt, this.body, this.amountPaidNgwee, this.groupSize, this.itemsOrdered, this.ownerReply});
  final String id, author;
  final int rating;
  final DateTime createdAt;
  final String? body, itemsOrdered, ownerReply;
  final int? amountPaidNgwee, groupSize;
  factory Review.fromJson(Map<String, dynamic> j) => Review(
        id: j['id'], rating: j['rating'], author: j['author'], createdAt: DateTime.parse(j['createdAt']), body: j['body'],
        amountPaidNgwee: j['amountPaidNgwee'], groupSize: j['groupSize'], itemsOrdered: j['itemsOrdered'], ownerReply: j['ownerReply'],
      );
}

class AppUser {
  AppUser({required this.id, required this.name, required this.role, required this.phoneVerified, this.email, this.phone});
  final String id, name, role;
  final bool phoneVerified;
  final String? email, phone;
  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'], name: j['name'], role: j['role'], phoneVerified: j['phoneVerified'] ?? false, email: j['email'], phone: j['phone']);
}

class MySubmission {
  MySubmission({required this.id, required this.type, required this.status, required this.createdAt, this.rejectReason, this.summary});
  final String id, type, status;
  final DateTime createdAt;
  final String? rejectReason, summary;
  factory MySubmission.fromJson(Map<String, dynamic> j) => MySubmission(
        id: j['id'], type: j['type'], status: j['status'], createdAt: DateTime.parse(j['createdAt']), rejectReason: j['rejectReason'], summary: j['summary']);
}

class DraftItem {
  DraftItem(this.name, this.priceNgwee);
  String name;
  int priceNgwee;
}

class DraftSection {
  DraftSection(this.name, this.items);
  String name;
  List<DraftItem> items;
}
