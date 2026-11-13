import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers.dart';
import 'router.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(ProviderScope(overrides: [sharedPrefsProvider.overrideWithValue(prefs)], child: const PaBudgetApp()));
}

class PaBudgetApp extends ConsumerStatefulWidget {
  const PaBudgetApp({super.key});
  @override
  ConsumerState<PaBudgetApp> createState() => _PaBudgetAppState();
}

class _PaBudgetAppState extends ConsumerState<PaBudgetApp> {
  @override
  void initState() {
    super.initState();
    // Send queued offline contributions whenever connectivity returns, and once at start-up.
    Connectivity().onConnectivityChanged.listen((r) {
      if (!r.contains(ConnectivityResult.none)) ref.read(draftsProvider.notifier).sync();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(draftsProvider.notifier).sync());
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: 'paBudget',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: ref.watch(routerProvider),
      );
}
