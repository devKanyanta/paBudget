import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pabudget/core/api.dart';

class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter(this.handler);
  final ResponseBody Function(RequestOptions) handler;
  final seen = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    seen.add(o);
    return handler(o);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody json(int status, Object body) => ResponseBody.fromString(jsonEncode(body), status, headers: {Headers.contentTypeHeader: ['application/json']});

void main() {
  test('refreshes an expired access token once and retries the request', () async {
    final tokens = MemoryTokenStore();
    await tokens.write('old-access', 'refresh-1');
    final main = ScriptedAdapter((o) => o.headers['Authorization'] == 'Bearer new-access' ? json(200, {'id': 'u1'}) : json(401, {'message': 'Unauthorized'}));
    final refresh = ScriptedAdapter((o) => o.path == '/auth/refresh' && o.data['refreshToken'] == 'refresh-1' ? json(200, {'accessToken': 'new-access', 'refreshToken': 'refresh-2'}) : json(401, {}));
    final api = ApiClient(
      tokens: tokens, baseUrl: 'http://x',
      dio: Dio(BaseOptions(baseUrl: 'http://x'))..httpClientAdapter = main,
      plain: Dio(BaseOptions(baseUrl: 'http://x'))..httpClientAdapter = refresh,
    );
    final me = await api.get('/me');
    expect(me['id'], 'u1');
    expect(main.seen.length, 2); // original + one retry
    expect(refresh.seen.length, 1);
    expect((await tokens.read())!.refresh, 'refresh-2');
  });

  test('a failed refresh signs the user out', () async {
    final tokens = MemoryTokenStore();
    await tokens.write('old', 'bad-refresh');
    var signedOut = false;
    final api = ApiClient(
      tokens: tokens, baseUrl: 'http://x',
      dio: Dio(BaseOptions(baseUrl: 'http://x'))..httpClientAdapter = ScriptedAdapter((_) => json(401, {'message': 'Unauthorized'})),
      plain: Dio(BaseOptions(baseUrl: 'http://x'))..httpClientAdapter = ScriptedAdapter((_) => json(401, {'message': 'Invalid refresh token'})),
    )..onSignedOut = () => signedOut = true;
    await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)));
    expect(signedOut, isTrue);
    expect(await tokens.read(), isNull);
  });

  test('maps validation errors and offline failures', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://x'));
    dio.httpClientAdapter = ScriptedAdapter((o) => o.path == '/bad'
        ? json(400, {'error': 'validation_failed', 'message': 'Invalid input', 'issues': [{'path': 'rating', 'message': 'Too big'}]})
        : throw DioException.connectionError(requestOptions: o, reason: 'down'));
    final api = ApiClient(tokens: MemoryTokenStore(), dio: dio, baseUrl: 'http://x');
    await expectLater(api.post('/bad', body: {}), throwsA(isA<ApiException>().having((e) => e.issues, 'issues', ['rating: Too big']).having((e) => e.status, 'status', 400)));
    await expectLater(api.get('/anything'), throwsA(isA<ApiException>().having((e) => e.isOffline, 'offline', true)));
  });

  test('attaches the bearer token', () async {
    final tokens = MemoryTokenStore();
    await tokens.write('abc', 'r');
    final dio = Dio(BaseOptions(baseUrl: 'http://x'));
    final adapter = ScriptedAdapter((o) => json(200, {'ok': true}));
    dio.httpClientAdapter = adapter;
    final api = ApiClient(tokens: tokens, dio: dio, baseUrl: 'http://x');
    await api.get('/me');
    await api.get('/meta', auth: false);
    expect(adapter.seen[0].headers['Authorization'], 'Bearer abc');
    expect(adapter.seen[1].headers['Authorization'], isNull);
  });
}
