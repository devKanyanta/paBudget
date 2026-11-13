import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000');

class ApiException implements Exception {
  ApiException(this.status, this.message, {this.issues = const []});
  final int status;
  final String message;
  final List<String> issues;
  bool get isOffline => status == 0;
  @override
  String toString() => issues.isEmpty ? message : '$message\n${issues.join('\n')}';
}

abstract class TokenStore {
  Future<({String access, String refresh})?> read();
  Future<void> write(String access, String refresh);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  const SecureTokenStore([this._s = const FlutterSecureStorage()]);
  final FlutterSecureStorage _s;
  @override
  Future<({String access, String refresh})?> read() async {
    final a = await _s.read(key: 'access');
    final r = await _s.read(key: 'refresh');
    return a == null || r == null ? null : (access: a, refresh: r);
  }

  @override
  Future<void> write(String access, String refresh) async {
    await _s.write(key: 'access', value: access);
    await _s.write(key: 'refresh', value: refresh);
  }

  @override
  Future<void> clear() async {
    await _s.delete(key: 'access');
    await _s.delete(key: 'refresh');
  }
}

class MemoryTokenStore implements TokenStore {
  ({String access, String refresh})? _t;
  @override
  Future<({String access, String refresh})?> read() async => _t;
  @override
  Future<void> write(String access, String refresh) async => _t = (access: access, refresh: refresh);
  @override
  Future<void> clear() async => _t = null;
}

class ApiClient {
  ApiClient({required this.tokens, Dio? dio, Dio? plain, String? baseUrl})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl ?? apiUrl, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 30))),
        _plain = plain ?? Dio(BaseOptions(baseUrl: baseUrl ?? apiUrl)) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) async {
        final t = await tokens.read();
        if (t != null && o.extra['auth'] != false) o.headers['Authorization'] = 'Bearer ${t.access}';
        h.next(o);
      },
      onError: (e, h) async {
        if (e.response?.statusCode == 401 && e.requestOptions.extra['retried'] != true && e.requestOptions.extra['auth'] != false && await _refresh()) {
          final o = e.requestOptions..extra['retried'] = true;
          try {
            h.resolve(await _dio.fetch(o));
          } on DioException catch (e2) {
            h.next(e2);
          }
          return;
        }
        h.next(e);
      },
    ));
  }

  final TokenStore tokens;
  final Dio _dio;
  final Dio _plain;
  Future<bool>? _refreshing;
  void Function()? onSignedOut;

  Future<bool> _refresh() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final t = await tokens.read();
    if (t == null) return false;
    try {
      final r = await _plain.post('/auth/refresh', data: {'refreshToken': t.refresh});
      await tokens.write(r.data['accessToken'], r.data['refreshToken']);
      return true;
    } catch (_) {
      await tokens.clear();
      onSignedOut?.call();
      return false;
    }
  }

  ApiException _wrap(DioException e) {
    final d = e.response?.data;
    if (e.response == null) return ApiException(0, 'No internet connection');
    if (d is Map) {
      final issues = ((d['issues'] as List?) ?? []).map((i) => '${i['path']}: ${i['message']}').toList().cast<String>();
      return ApiException(e.response!.statusCode ?? 500, (d['message'] ?? 'Something went wrong').toString(), issues: issues);
    }
    return ApiException(e.response!.statusCode ?? 500, 'Something went wrong');
  }

  Future<dynamic> request(String method, String path, {Object? body, Map<String, dynamic>? query, bool auth = true}) async {
    try {
      final r = await _dio.request(path, data: body, queryParameters: query, options: Options(method: method, extra: {'auth': auth}));
      return r.data;
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool auth = true}) => request('GET', path, query: query, auth: auth);
  Future<dynamic> post(String path, {Object? body, bool auth = true}) => request('POST', path, body: body, auth: auth);
  Future<dynamic> put(String path, {Object? body}) => request('PUT', path, body: body);
  Future<dynamic> patch(String path, {Object? body}) => request('PATCH', path, body: body);
  Future<dynamic> delete(String path) => request('DELETE', path);

  /// presign -> PUT -> complete. Returns the image id to attach to a submission.
  Future<String> uploadImage(File file, {String purpose = 'photo'}) async {
    final bytes = await file.readAsBytes();
    final lower = file.path.toLowerCase();
    final type = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    final p = await post('/uploads/presign', body: {'contentType': type, 'size': bytes.length, 'purpose': purpose});
    try {
      await _plain.put(p['uploadUrl'], data: Stream.fromIterable([bytes]),
          options: Options(headers: {...Map<String, dynamic>.from(p['headers']), Headers.contentLengthHeader: bytes.length}));
    } on DioException catch (e) {
      throw _wrap(e);
    }
    await post('/uploads/${p['imageId']}/complete');
    return p['imageId'] as String;
  }
}

String prettyJson(Object? o) => const JsonEncoder.withIndent('  ').convert(o);
