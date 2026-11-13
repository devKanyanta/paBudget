import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

/// An offline submission waiting to be sent (FR-79). Photos are copied into app storage so they survive restarts.
class Draft {
  Draft({required this.id, required this.kind, required this.body, this.photoPaths = const [], this.photoField = 'imageIds', this.error});
  final String id, kind, photoField;
  final Map<String, dynamic> body;
  final List<String> photoPaths;
  String? error;

  Map<String, dynamic> toJson() => {'id': id, 'kind': kind, 'body': body, 'photoPaths': photoPaths, 'photoField': photoField, 'error': error};
  factory Draft.fromJson(Map<String, dynamic> j) => Draft(
        id: j['id'], kind: j['kind'], body: Map<String, dynamic>.from(j['body']),
        photoPaths: (j['photoPaths'] as List).cast<String>(), photoField: j['photoField'] ?? 'imageIds', error: j['error']);
}

class DraftStore {
  DraftStore(this._p);
  final SharedPreferences _p;
  static const _key = 'drafts';

  List<Draft> all() => (_p.getStringList(_key) ?? []).map((s) => Draft.fromJson(jsonDecode(s))).toList();

  Future<void> _save(List<Draft> l) => _p.setStringList(_key, l.map((d) => jsonEncode(d.toJson())).toList());

  Future<Draft> add(String kind, Map<String, dynamic> body, {List<File> photos = const [], String photoField = 'imageIds'}) async {
    final dir = Directory('${(await getApplicationDocumentsDirectory()).path}/drafts')..createSync(recursive: true);
    final id = DateTime.now().microsecondsSinceEpoch.toString();
    final paths = <String>[];
    for (var i = 0; i < photos.length; i++) {
      final ext = photos[i].path.split('.').last;
      paths.add((await photos[i].copy('${dir.path}/$id-$i.$ext')).path);
    }
    final d = Draft(id: id, kind: kind, body: body, photoPaths: paths, photoField: photoField);
    await _save([...all(), d]);
    return d;
  }

  Future<void> remove(String id) async {
    final l = all();
    for (final d in l.where((d) => d.id == id)) {
      for (final p in d.photoPaths) {
        try { File(p).deleteSync(); } catch (_) {}
      }
    }
    await _save(l.where((d) => d.id != id).toList());
  }

  Future<void> update(Draft d) async => _save(all().map((x) => x.id == d.id ? d : x).toList());
}

/// Sends queued drafts. A network failure keeps the draft; a server rejection (4xx) records the reason and keeps it for editing/discard.
Future<int> syncDrafts(DraftStore store, ApiClient api) async {
  var sent = 0;
  for (final d in store.all()) {
    try {
      final ids = <String>[];
      for (final p in d.photoPaths) {
        ids.add(await api.uploadImage(File(p)));
      }
      final body = {...d.body, if (ids.isNotEmpty) d.photoField: ids};
      await api.post('/submissions/${d.kind}', body: body);
      await store.remove(d.id);
      sent++;
    } on ApiException catch (e) {
      if (e.isOffline) break; // try again later
      d.error = e.message;
      await store.update(d);
    }
  }
  return sent;
}
