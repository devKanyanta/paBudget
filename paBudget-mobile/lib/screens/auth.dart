import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/common.dart';

class _Scaffold extends StatelessWidget {
  const _Scaffold({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(),
        body: SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)), const SizedBox(height: 16), ...children])),
      );
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _id = TextEditingController(), _pw = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _go() async {
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).login(_id.text.trim(), _pw.text);
      if (mounted) context.pop();
    } catch (e) {
      setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _Scaffold(title: 'Log in', children: [
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Tokens.danger))),
        TextField(controller: _id, decoration: const InputDecoration(labelText: 'Email or phone'), autofillHints: const [AutofillHints.username], keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 12),
        TextField(controller: _pw, obscureText: true, decoration: const InputDecoration(labelText: 'Password'), autofillHints: const [AutofillHints.password], onSubmitted: (_) => _go()),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : _go, child: Text(_busy ? 'Logging in…' : 'Log in')),
        const SizedBox(height: 8),
        OutlinedButton(onPressed: () => context.push('/verify?signin=1'), child: const Text('Use a phone code instead')),
        TextButton(onPressed: () => context.pushReplacement('/register'), child: const Text('New here? Create an account')),
      ]);
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController(), _email = TextEditingController(), _phone = TextEditingController(), _pw = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _go() async {
    if (_name.text.trim().isEmpty || (_email.text.trim().isEmpty && _phone.text.trim().isEmpty) || _pw.text.length < 8) {
      setState(() => _error = 'Enter your name, an email or phone, and a password of at least 8 characters.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).register(name: _name.text.trim(), email: _email.text.trim(), phone: _phone.text.trim(), password: _pw.text);
      if (!mounted) return;
      if (_phone.text.trim().isNotEmpty) { context.pushReplacement('/verify'); } else { context.pop(); }
    } catch (e) {
      setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _Scaffold(title: 'Create account', children: [
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Tokens.danger))),
        TextField(controller: _name, decoration: const InputDecoration(labelText: 'Your name'), textCapitalization: TextCapitalization.words),
        const SizedBox(height: 12),
        TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 12),
        TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone number', helperText: 'Needed to add places, photos and reviews'), keyboardType: TextInputType.phone),
        const SizedBox(height: 12),
        TextField(controller: _pw, obscureText: true, decoration: const InputDecoration(labelText: 'Password', helperText: 'At least 8 characters')),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : _go, child: Text(_busy ? 'Creating…' : 'Sign up')),
        const Padding(padding: EdgeInsets.only(top: 12), child: Text('By signing up you accept our terms and privacy policy.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Tokens.muted))),
      ]);
}

class VerifyPhoneScreen extends ConsumerStatefulWidget {
  const VerifyPhoneScreen({super.key, this.signIn = false});
  final bool signIn;
  @override
  ConsumerState<VerifyPhoneScreen> createState() => _VerifyPhoneScreenState();
}

class _VerifyPhoneScreenState extends ConsumerState<VerifyPhoneScreen> {
  late final _phone = TextEditingController(text: ref.read(authProvider).value?.phone ?? '');
  final _code = TextEditingController(), _name = TextEditingController();
  bool _sent = false, _busy = false;
  String? _error;

  Future<void> _run(Future<void> Function() f) async {
    setState(() { _busy = true; _error = null; });
    try { await f(); } catch (e) { setState(() => _error = errorText(e)); } finally { if (mounted) setState(() => _busy = false); }
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = ref.watch(authProvider).value != null;
    return _Scaffold(title: loggedIn ? 'Verify your phone' : 'Sign in with a code', children: [
      if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Tokens.danger))),
      if (!_sent) ...[
        TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone number', helperText: 'We’ll text you a 6-digit code')),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : () => _run(() async { await ref.read(authProvider.notifier).requestOtp(_phone.text.trim()); setState(() => _sent = true); }), child: const Text('Send code')),
      ] else ...[
        TextField(controller: _code, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: '6-digit code'), autofocus: true),
        if (!loggedIn) TextField(controller: _name, decoration: const InputDecoration(labelText: 'Your name (new accounts)')),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : () => _run(() async { await ref.read(authProvider.notifier).verifyOtp(_phone.text.trim(), _code.text.trim(), name: _name.text.trim()); if (mounted) context.go('/'); }), child: const Text('Verify')),
        TextButton(onPressed: () => setState(() => _sent = false), child: const Text('Use a different number')),
      ],
    ]);
  }
}
