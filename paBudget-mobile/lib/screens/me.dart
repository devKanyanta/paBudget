import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/format.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/common.dart';

class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).value;
    final favs = ref.watch(favouritesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved places', style: TextStyle(fontWeight: FontWeight.w800))),
      body: user == null
          ? _LoginPrompt(text: 'Log in to save places and find them again quickly.')
          : favs.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorBox(e, onRetry: () => ref.invalidate(favouritesProvider)),
              data: (l) => l.isEmpty
                  ? const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Nothing saved yet.\nTap the heart on a place to keep it here.', textAlign: TextAlign.center)))
                  : ListView.separated(padding: const EdgeInsets.all(16), itemCount: l.length, separatorBuilder: (_, _) => const SizedBox(height: 10), itemBuilder: (_, i) => PlaceCard(l[i])),
            ),
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  const _LoginPrompt({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(text, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => context.push('/login'), child: const Text('Log in')),
            TextButton(onPressed: () => context.push('/register'), child: const Text('Create an account')),
          ]),
        ),
      );
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).value;
    final subs = ref.watch(mySubmissionsProvider).value;
    return Scaffold(
      appBar: AppBar(title: const Text('Me', style: TextStyle(fontWeight: FontWeight.w800))),
      body: user == null
          ? _LoginPrompt(text: 'Log in to contribute places, menus and reviews and earn points.')
          : ListView(padding: const EdgeInsets.all(16), children: [
              Card(child: ListTile(leading: const CircleAvatar(backgroundColor: Tokens.brandSoft, child: Icon(Icons.person, color: Tokens.brand)), title: Text(user.name, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(user.email ?? user.phone ?? ''))),
              if (subs?.stats != null)
                Padding(padding: const EdgeInsets.only(top: 12), child: Row(children: [
                  _Stat('${subs!.stats!['points']}', 'points'), const SizedBox(width: 8),
                  _Stat('${subs.stats!['approved']}', 'approved'), const SizedBox(width: 8),
                  _Stat(subs.stats!['trustLevel'] == 'TRUSTED' ? 'Trusted' : 'New', 'contributor'),
                ])),
              if (!user.phoneVerified)
                Padding(padding: const EdgeInsets.only(top: 12), child: Card(color: Tokens.brandSoft, child: ListTile(leading: const Icon(Icons.phone_android), title: const Text('Verify your phone to contribute'), trailing: const Icon(Icons.chevron_right), onTap: () => context.push('/verify')))),
              const SizedBox(height: 8),
              ListTile(leading: const Icon(Icons.list_alt), title: const Text('My contributions'), trailing: const Icon(Icons.chevron_right), onTap: () => context.push('/me/contributions')),
              ListTile(leading: const Icon(Icons.settings_outlined), title: const Text('Settings'), trailing: const Icon(Icons.chevron_right), onTap: () => context.push('/me/settings')),
              ListTile(leading: const Icon(Icons.logout), title: const Text('Log out'), onTap: () => ref.read(authProvider.notifier).logout()),
            ]),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label);
  final String value, label;
  @override
  Widget build(BuildContext context) => Expanded(child: Card(child: Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Column(children: [Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Tokens.brand)), Text(label, style: const TextStyle(fontSize: 12, color: Tokens.muted))]))));
}

const _typeLabel = {'NEW_PLACE': 'New place', 'MENU': 'Menu', 'PHOTOS': 'Photos', 'REVIEW': 'Review', 'EDIT': 'Edit', 'FLAG': 'Report', 'CLAIM': 'Ownership claim'};
const _kindLabel = {'place': 'New place', 'menu': 'Menu', 'photos': 'Photos', 'review': 'Review', 'edit': 'Edit', 'flag': 'Report'};

class ContributionsScreen extends ConsumerWidget {
  const ContributionsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subs = ref.watch(mySubmissionsProvider);
    final drafts = ref.watch(draftsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My contributions', style: TextStyle(fontWeight: FontWeight.w800))),
      body: RefreshIndicator(
        onRefresh: () async { await ref.read(draftsProvider.notifier).sync(); ref.invalidate(mySubmissionsProvider); },
        child: ListView(padding: const EdgeInsets.all(16), children: [
          if (drafts.isNotEmpty) ...[
            const Text('Waiting to send', style: TextStyle(fontWeight: FontWeight.w800)),
            for (final d in drafts)
              Card(child: ListTile(
                leading: Icon(d.error != null ? Icons.error_outline : Icons.cloud_upload_outlined, color: d.error != null ? Tokens.danger : Tokens.muted),
                title: Text('${_kindLabel[d.kind] ?? d.kind}${d.body['name'] != null ? ' · ${d.body['name']}' : ''}'),
                subtitle: Text(d.error ?? 'Will send when you’re online'),
                trailing: IconButton(icon: const Icon(Icons.delete_outline), tooltip: 'Discard', onPressed: () async { await ref.read(draftStoreProvider).remove(d.id); ref.read(draftsProvider.notifier).refresh(); }),
              )),
            const SizedBox(height: 12),
          ],
          subs.when(
            loading: () => const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
            error: (e, _) => SizedBox(height: 200, child: ErrorBox(e, onRetry: () => ref.invalidate(mySubmissionsProvider))),
            data: (s) => s.items.isEmpty
                ? const Padding(padding: EdgeInsets.all(32), child: Text('You haven’t contributed yet.\nAdd a place or review one you’ve visited.', textAlign: TextAlign.center))
                : Column(children: [
                    for (final i in s.items)
                      Card(child: ListTile(
                        title: Text('${_typeLabel[i.type] ?? i.type}${i.summary != null ? ' · ${i.summary}' : ''}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text(i.rejectReason != null ? 'Reason: ${i.rejectReason}' : timeAgo(i.createdAt), style: TextStyle(color: i.rejectReason != null ? Tokens.danger : null)),
                        trailing: Text(
                          switch (i.status) { 'PENDING' => 'In review', 'APPROVED' => 'Approved', 'AUTO_PUBLISHED' => 'Published', _ => 'Rejected' },
                          style: TextStyle(fontWeight: FontWeight.w700, color: switch (i.status) { 'PENDING' => Tokens.accent, 'REJECTED' => Tokens.danger, _ => Tokens.brand }),
                        ),
                      )),
                  ]),
          ),
        ]),
      ),
    );
  }
}

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final _name = TextEditingController(text: ref.read(authProvider).value?.name ?? '');
  final _budget = TextEditingController();
  String? _msg;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.w800))),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          TextField(controller: _budget, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Usual budget per person (K)')),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () async {
              try {
                await ref.read(apiProvider).patch('/me', body: {'name': _name.text.trim(), if (_budget.text.isNotEmpty) 'defaultBudgetNgwee': toNgwee(_budget.text)});
                ref.invalidate(authProvider);
                setState(() => _msg = 'Saved');
              } catch (e) { setState(() => _msg = errorText(e)); }
            },
            child: const Text('Save'),
          ),
          if (_msg != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_msg!, textAlign: TextAlign.center)),
          const Divider(height: 40),
          OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: Tokens.danger),
            onPressed: () async {
              final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
                title: const Text('Delete account?'),
                content: const Text('This removes your personal data and cannot be undone. Places and reviews you added stay, without your name.'),
                actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Tokens.danger)))],
              ));
              if (ok == true) { await ref.read(authProvider.notifier).deleteAccount(); if (context.mounted) context.go('/'); }
            },
            child: const Text('Delete my account'),
          ),
        ]),
      );
}
