import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api.dart';
import 'core/cache.dart';
import 'core/drafts.dart';
import 'models.dart';

final sharedPrefsProvider = Provider<SharedPreferences>((_) => throw UnimplementedError('override in main'));
final tokenStoreProvider = Provider<TokenStore>((_) => const SecureTokenStore());

final apiProvider = Provider<ApiClient>((ref) {
  final c = ApiClient(tokens: ref.watch(tokenStoreProvider));
  c.onSignedOut = () => ref.invalidate(authProvider);
  return c;
});
final cacheProvider = Provider<JsonCache>((ref) => JsonCache(ref.watch(sharedPrefsProvider)));
final draftStoreProvider = Provider<DraftStore>((ref) => DraftStore(ref.watch(sharedPrefsProvider)));

/// Network first, falling back to the last cached copy when offline.
Future<T> cached<T>(Ref ref, String key, Future<dynamic> Function() fetch, T Function(dynamic) parse) async {
  final cache = ref.read(cacheProvider);
  try {
    final raw = await fetch();
    await cache.write(key, raw);
    return parse(raw);
  } on ApiException catch (e) {
    final hit = cache.read(key);
    if (e.isOffline && hit != null) return parse(hit);
    rethrow;
  }
}

final metaProvider = FutureProvider<Meta>((ref) =>
    cached(ref, 'meta', () => ref.read(apiProvider).get('/meta', auth: false), (j) => Meta.fromJson(Map<String, dynamic>.from(j))));

class PlaceFilters {
  const PlaceFilters({this.q, this.area, this.category, this.tags = const [], this.maxPpNgwee, this.totalBudgetNgwee, this.groupSize, this.openNow = false, this.lat, this.lng, this.sort});
  final String? q, area, category, sort;
  final List<String> tags;
  final int? maxPpNgwee, totalBudgetNgwee, groupSize;
  final bool openNow;
  final double? lat, lng;

  PlaceFilters copyWith({
    Object? q = _keep, Object? area = _keep, Object? category = _keep, List<String>? tags, Object? maxPpNgwee = _keep,
    Object? totalBudgetNgwee = _keep, Object? groupSize = _keep, bool? openNow, Object? lat = _keep, Object? lng = _keep, Object? sort = _keep,
  }) =>
      PlaceFilters(
        q: q == _keep ? this.q : q as String?, area: area == _keep ? this.area : area as String?,
        category: category == _keep ? this.category : category as String?, tags: tags ?? this.tags,
        maxPpNgwee: maxPpNgwee == _keep ? this.maxPpNgwee : maxPpNgwee as int?,
        totalBudgetNgwee: totalBudgetNgwee == _keep ? this.totalBudgetNgwee : totalBudgetNgwee as int?,
        groupSize: groupSize == _keep ? this.groupSize : groupSize as int?, openNow: openNow ?? this.openNow,
        lat: lat == _keep ? this.lat : lat as double?, lng: lng == _keep ? this.lng : lng as double?, sort: sort == _keep ? this.sort : sort as String?,
      );
  static const _keep = Object();

  Map<String, dynamic> toQuery() => {
        if (q != null && q!.isNotEmpty) 'q': q,
        if (area != null) 'area': area,
        if (category != null) 'category': category,
        if (tags.isNotEmpty) 'tags': tags.join(','),
        if (maxPpNgwee != null) 'maxPp': maxPpNgwee,
        if (totalBudgetNgwee != null && groupSize != null) ...{'totalBudget': totalBudgetNgwee, 'groupSize': groupSize},
        if (openNow) 'openNow': 'true',
        if (lat != null && lng != null) ...{'lat': lat, 'lng': lng},
        if (sort != null) 'sort': sort,
      };

  @override
  bool operator ==(Object other) => other is PlaceFilters && other.toQuery().toString() == toQuery().toString();
  @override
  int get hashCode => toQuery().toString().hashCode;
  bool get isEmpty => toQuery().isEmpty;
}

final placeListProvider = FutureProvider.family<PlaceList, PlaceFilters>((ref, f) {
  final q = {...f.toQuery(), 'limit': 30};
  return cached(ref, 'list:${q.toString()}', () => ref.read(apiProvider).get('/places', query: q, auth: false), (j) => PlaceList.fromJson(Map<String, dynamic>.from(j)));
});

final placeDetailProvider = FutureProvider.family<PlaceDetail, String>((ref, slug) =>
    cached(ref, 'place:$slug', () => ref.read(apiProvider).get('/places/$slug', auth: false), (j) => PlaceDetail.fromJson(Map<String, dynamic>.from(j))));

final reviewsProvider = FutureProvider.family<List<Review>, String>((ref, placeId) =>
    cached(ref, 'reviews:$placeId', () => ref.read(apiProvider).get('/places/$placeId/reviews', auth: false), (j) => (j as List).map((e) => Review.fromJson(Map<String, dynamic>.from(e))).toList()));

class AuthNotifier extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final api = ref.read(apiProvider);
    if (await ref.read(tokenStoreProvider).read() == null) return null;
    try {
      return AppUser.fromJson(Map<String, dynamic>.from(await api.get('/me')));
    } on ApiException catch (e) {
      if (e.isOffline) return null; // keep tokens; user can still browse cached data
      await ref.read(tokenStoreProvider).clear();
      return null;
    }
  }

  Future<void> _setSession(Map<String, dynamic> r) async {
    await ref.read(tokenStoreProvider).write(r['accessToken'], r['refreshToken']);
    state = AsyncData(AppUser.fromJson(Map<String, dynamic>.from(r['user'])));
    ref.invalidate(favouritesProvider);
    ref.invalidate(mySubmissionsProvider);
  }

  Future<void> login(String id, String password) async {
    final body = id.contains('@') ? {'email': id, 'password': password} : {'phone': id, 'password': password};
    await _setSession(Map<String, dynamic>.from(await ref.read(apiProvider).post('/auth/login', body: body, auth: false)));
  }

  Future<void> register({required String name, String? email, String? phone, required String password}) async {
    await _setSession(Map<String, dynamic>.from(await ref.read(apiProvider).post('/auth/register',
        body: {'name': name, if (email != null && email.isNotEmpty) 'email': email, if (phone != null && phone.isNotEmpty) 'phone': phone, 'password': password}, auth: false)));
  }

  Future<void> logout() async {
    final t = await ref.read(tokenStoreProvider).read();
    if (t != null) {
      try { await ref.read(apiProvider).post('/auth/logout', body: {'refreshToken': t.refresh}, auth: false); } catch (_) {}
    }
    await ref.read(tokenStoreProvider).clear();
    await ref.read(cacheProvider).clear();
    state = const AsyncData(null);
    ref.invalidate(favouritesProvider);
  }

  Future<void> deleteAccount() async {
    await ref.read(apiProvider).delete('/me');
    await logout();
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AppUser?>(AuthNotifier.new);

final favouritesProvider = FutureProvider<List<PlaceSummary>>((ref) async {
  final user = ref.watch(authProvider).value;
  if (user == null) return [];
  return cached(ref, 'favourites', () => ref.read(apiProvider).get('/me/favourites'), (j) => (j as List).map((e) => PlaceSummary.fromJson(Map<String, dynamic>.from(e))).toList());
});

final mySubmissionsProvider = FutureProvider<({Map<String, dynamic>? stats, List<MySubmission> items})>((ref) async {
  if (ref.watch(authProvider).value == null) return (stats: null, items: <MySubmission>[]);
  final j = Map<String, dynamic>.from(await ref.read(apiProvider).get('/submissions/mine'));
  return (stats: j['stats'] == null ? null : Map<String, dynamic>.from(j['stats']), items: (j['items'] as List).map((e) => MySubmission.fromJson(Map<String, dynamic>.from(e))).toList());
});

final draftsProvider = NotifierProvider<DraftsNotifier, List<Draft>>(DraftsNotifier.new);

class DraftsNotifier extends Notifier<List<Draft>> {
  @override
  List<Draft> build() => ref.read(draftStoreProvider).all();
  void refresh() => state = ref.read(draftStoreProvider).all();
  Future<int> sync() async {
    final n = await syncDrafts(ref.read(draftStoreProvider), ref.read(apiProvider));
    refresh();
    if (n > 0) ref.invalidate(mySubmissionsProvider);
    return n;
  }
}

Future<void> toggleFavourite(WidgetRef ref, String placeId, bool isFav) async {
  final api = ref.read(apiProvider);
  if (isFav) { await api.delete('/places/$placeId/favourite'); } else { await api.put('/places/$placeId/favourite'); }
  ref.invalidate(favouritesProvider);
}

void trackEvent(WidgetRef ref, String placeId, String type) {
  ref.read(apiProvider).post('/places/$placeId/events', body: {'type': type}, auth: false).catchError((_) {});
}
