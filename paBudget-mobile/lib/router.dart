import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'screens/auth.dart';
import 'screens/contribute.dart';
import 'screens/explore.dart';
import 'screens/me.dart';
import 'screens/place_detail.dart';
import 'widgets/common.dart';

class Shell extends ConsumerStatefulWidget {
  const Shell({super.key});
  @override
  ConsumerState<Shell> createState() => _ShellState();
}

class _ShellState extends ConsumerState<Shell> {
  int _tab = 0;
  @override
  Widget build(BuildContext context) {
    final pages = const [ExploreScreen(), SavedScreen(), SizedBox.shrink(), ProfileScreen()];
    return Scaffold(
      body: IndexedStack(index: _tab == 2 ? 0 : _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab == 2 ? 0 : _tab,
        onDestinationSelected: (i) {
          if (i == 2) { requireContributor(context, ref, () => context.push('/contribute/place')); return; }
          setState(() => _tab = i);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Explore'),
          NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Saved'),
          NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Add'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) => GoRouter(
      routes: [
        GoRoute(path: '/', builder: (_, _) => const Shell()),
        GoRoute(path: '/place/:slug', builder: (_, s) => PlaceDetailScreen(slug: s.pathParameters['slug']!)),
        GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
        GoRoute(path: '/me/contributions', builder: (_, _) => const ContributionsScreen()),
        GoRoute(path: '/me/settings', builder: (_, _) => const SettingsScreen()),
        GoRoute(path: '/contribute/place', builder: (_, _) => const AddPlaceScreen()),
        GoRoute(path: '/contribute/:slug/review', builder: (_, s) => ReviewScreen(slug: s.pathParameters['slug']!)),
        GoRoute(path: '/contribute/:slug/menu', builder: (_, s) => MenuUpdateScreen(slug: s.pathParameters['slug']!)),
        GoRoute(path: '/contribute/:slug/photos', builder: (_, s) => PhotosScreen(slug: s.pathParameters['slug']!)),
        GoRoute(path: '/contribute/:slug/edit', builder: (_, s) => EditPlaceScreen(slug: s.pathParameters['slug']!)),
      ],
    ));
