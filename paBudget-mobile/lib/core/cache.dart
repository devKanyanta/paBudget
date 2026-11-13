import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Small JSON cache so viewed places, menus and favourites open without data (NFR-03).
class JsonCache {
  JsonCache(this._p);
  final SharedPreferences _p;
  static const _prefix = 'cache:';
  static const _indexKey = 'cache:__index';
  static const maxEntries = 60;

  dynamic read(String key) {
    final s = _p.getString('$_prefix$key');
    return s == null ? null : jsonDecode(s);
  }

  Future<void> write(String key, dynamic value) async {
    await _p.setString('$_prefix$key', jsonEncode(value));
    final idx = (_p.getStringList(_indexKey) ?? [])..remove(key)..add(key);
    while (idx.length > maxEntries) {
      await _p.remove('$_prefix${idx.removeAt(0)}');
    }
    await _p.setStringList(_indexKey, idx);
  }

  Future<void> clear() async {
    for (final k in _p.getStringList(_indexKey) ?? <String>[]) {
      await _p.remove('$_prefix$k');
    }
    await _p.remove(_indexKey);
  }
}
