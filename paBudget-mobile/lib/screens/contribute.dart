import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../core/api.dart';
import '../core/format.dart';
import '../models.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/menu_editor.dart';
import '../widgets/photo_picker.dart';

/// Uploads photos, posts the submission, and if the network is down saves it as a draft to send later (FR-79).
Future<bool> submitOrQueue(BuildContext context, WidgetRef ref, String kind, Map<String, dynamic> body, {List<File> photos = const []}) async {
  final api = ref.read(apiProvider);
  try {
    final ids = <String>[];
    for (final f in photos) {
      ids.add(await api.uploadImage(f));
    }
    final sub = await api.post('/submissions/$kind', body: {...body, if (ids.isNotEmpty) 'imageIds': ids});
    ref.invalidate(mySubmissionsProvider);
    if (context.mounted) {
      showSnack(context, switch (sub['status']) { 'AUTO_PUBLISHED' => 'Published — thank you!', 'REJECTED' => 'Not accepted: ${sub['rejectReason']}', _ => 'Thanks! We’ll review it shortly.' });
    }
    return true;
  } on ApiException catch (e) {
    if (e.isOffline) {
      await ref.read(draftStoreProvider).add(kind, body, photos: photos);
      ref.read(draftsProvider.notifier).refresh();
      if (context.mounted) showSnack(context, 'You’re offline — saved to send when you’re back online.');
      return true;
    }
    if (context.mounted) showSnack(context, e.toString());
    return false;
  }
}

class _FormPage extends StatelessWidget {
  const _FormPage({required this.title, required this.children});
  final String title;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800))),
        body: SafeArea(child: ListView(padding: const EdgeInsets.all(16), children: children)),
      );
}

class AddPlaceScreen extends ConsumerStatefulWidget {
  const AddPlaceScreen({super.key});
  @override
  ConsumerState<AddPlaceScreen> createState() => _AddPlaceScreenState();
}

class _AddPlaceScreenState extends ConsumerState<AddPlaceScreen> {
  final _name = TextEditingController(), _address = TextEditingController(), _phone = TextEditingController(), _desc = TextEditingController();
  String? _areaId, _categoryId;
  double? _lat, _lng;
  TimeOfDay? _opens, _closes;
  final _tags = <String>{};
  List<File> _photos = [];
  final List<DraftSection> _menu = emptyDraftMenu();
  List<Map<String, dynamic>> _dups = [];
  bool _notDup = false, _busy = false;

  Future<void> _locate() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) { if (mounted) showSnack(context, 'Location permission is needed to drop a pin.'); return; }
      final p = await Geolocator.getCurrentPosition();
      setState(() { _lat = p.latitude; _lng = p.longitude; });
      _checkDups();
    } catch (_) { if (mounted) showSnack(context, 'Couldn’t get your location.'); }
  }

  Future<void> _checkDups() async {
    _notDup = false;
    if (_name.text.trim().length < 3 || _lat == null) { setState(() => _dups = []); return; }
    try {
      final r = await ref.read(apiProvider).get('/submissions/duplicates', query: {'name': _name.text.trim(), 'lat': _lat, 'lng': _lng});
      if (mounted) setState(() => _dups = List<Map<String, dynamic>>.from((r as List).map((e) => Map<String, dynamic>.from(e))));
    } catch (_) { /* offline: skip the check, moderators will catch duplicates */ }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    String hh(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    final menu = menuPayload(_menu);
    final body = <String, dynamic>{
      'name': _name.text.trim(), 'areaId': _areaId, 'categoryId': _categoryId, 'lat': _lat, 'lng': _lng,
      if (_address.text.isNotEmpty) 'address': _address.text.trim(), if (_phone.text.isNotEmpty) 'phone': _phone.text.trim(),
      if (_desc.text.isNotEmpty) 'description': _desc.text.trim(), if (_tags.isNotEmpty) 'tagSlugs': _tags.toList(),
      if (_opens != null && _closes != null) 'hours': [for (var d = 0; d < 7; d++) {'weekday': d, 'opensAt': hh(_opens!), 'closesAt': hh(_closes!)}],
      if (menu.isNotEmpty) 'menu': {'mode': 'merge', 'sections': menu},
      if (_notDup) 'confirmNotDuplicate': true,
    };
    final ok = await submitOrQueue(context, ref, 'place', body, photos: _photos);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final meta = ref.watch(metaProvider).value;
    final canSubmit = !_busy && _name.text.trim().length >= 2 && _areaId != null && _categoryId != null && _lat != null && _photos.isNotEmpty && (_dups.isEmpty || _notDup);
    return _FormPage(title: 'Add a place', children: [
      const Text('Thanks for helping others plan! Every submission is checked before it goes public.', style: TextStyle(color: Tokens.muted)),
      const SizedBox(height: 16),
      TextField(controller: _name, decoration: const InputDecoration(labelText: 'Place name'), textCapitalization: TextCapitalization.words, onChanged: (_) { setState(() {}); _checkDups(); }),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: DropdownButtonFormField<String>(initialValue: _areaId, isExpanded: true, decoration: const InputDecoration(labelText: 'Area'), items: [for (final a in meta?.areas ?? []) DropdownMenuItem(value: a.id, child: Text(a.name))], onChanged: (v) => setState(() => _areaId = v))),
        const SizedBox(width: 8),
        Expanded(child: DropdownButtonFormField<String>(initialValue: _categoryId, isExpanded: true, decoration: const InputDecoration(labelText: 'Type'), items: [for (final c in meta?.categories ?? []) DropdownMenuItem(value: c.id, child: Text(c.name))], onChanged: (v) => setState(() => _categoryId = v))),
      ]),
      const SizedBox(height: 12),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Location', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: _locate, icon: const Icon(Icons.my_location), label: Text(_lat == null ? 'I’m at the place — drop a pin' : 'Pin set (${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)})')),
        if (_lat == null && _areaId != null && meta != null)
          TextButton(onPressed: () { final a = meta.areas.firstWhere((a) => a.id == _areaId); setState(() { _lat = a.lat; _lng = a.lng; }); _checkDups(); }, child: const Text('Use the centre of the area instead')),
        const SizedBox(height: 8),
        TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address / landmark')),
      ]))),
      if (_dups.isNotEmpty)
        Padding(padding: const EdgeInsets.only(top: 12), child: Card(color: const Color(0xFFFFF6E0), child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Is it one of these?', style: TextStyle(fontWeight: FontWeight.w800)),
          for (final d in _dups) InkWell(onTap: () => context.push('/place/${d['slug']}'), child: Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('${d['name']} · ${d['distanceM']} m away', style: const TextStyle(color: Tokens.brand, decoration: TextDecoration.underline)))),
          CheckboxListTile(contentPadding: EdgeInsets.zero, value: _notDup, onChanged: (v) => setState(() => _notDup = v ?? false), title: const Text('No, this is a different place'), controlAffinity: ListTileControlAffinity.leading),
        ])))),
      const SectionTitle('Photos (at least 1)'),
      PhotoPicker(files: _photos, onChanged: (f) => setState(() => _photos = f)),
      const SizedBox(height: 12),
      TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone (optional)')),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: _opens ?? const TimeOfDay(hour: 8, minute: 0)); if (t != null) setState(() => _opens = t); }, child: Text(_opens == null ? 'Opens' : 'Opens ${_opens!.format(context)}'))),
        const SizedBox(width: 8),
        Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: _closes ?? const TimeOfDay(hour: 22, minute: 0)); if (t != null) setState(() => _closes = t); }, child: Text(_closes == null ? 'Closes' : 'Closes ${_closes!.format(context)}'))),
      ]),
      const SizedBox(height: 12),
      TextField(controller: _desc, maxLines: 2, maxLength: 1000, decoration: const InputDecoration(labelText: 'Short description (optional)')),
      Wrap(spacing: 8, children: [for (final t in meta?.tags ?? []) FilterChip(label: Text(t.name), selected: _tags.contains(t.slug), onSelected: (s) => setState(() => s ? _tags.add(t.slug) : _tags.remove(t.slug)))]),
      const SectionTitle('Menu & prices (optional)'),
      MenuEditorWidget(sections: _menu, onChanged: () {}),
      const SizedBox(height: 20),
      FilledButton(onPressed: canSubmit ? _submit : null, child: Text(_busy ? 'Submitting…' : 'Submit for review')),
      if (!canSubmit && !_busy) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Add a name, area, type, pin and at least one photo.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Tokens.muted))),
    ]);
  }
}

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.slug});
  final String slug;
  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  int _rating = 0;
  final _body = TextEditingController(), _items = TextEditingController(), _paid = TextEditingController(), _group = TextEditingController();
  List<File> _photos = [];
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final place = ref.watch(placeDetailProvider(widget.slug)).value;
    if (place == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return _FormPage(title: 'Review ${place.name}', children: [
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        for (var n = 1; n <= 5; n++) IconButton(iconSize: 38, tooltip: '$n stars', onPressed: () => setState(() => _rating = n), icon: Icon(n <= _rating ? Icons.star : Icons.star_border, color: n <= _rating ? Tokens.accent : Tokens.border)),
      ]),
      TextField(controller: _items, decoration: const InputDecoration(labelText: 'What did you order?', hintText: '2 burgers, 2 Cokes')),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TextField(controller: _paid, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Total paid (K)', helperText: 'Helps others budget'))),
        const SizedBox(width: 8),
        Expanded(child: TextField(controller: _group, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'People'))),
      ]),
      const SizedBox(height: 12),
      TextField(controller: _body, maxLines: 4, maxLength: 1500, decoration: const InputDecoration(labelText: 'Your review')),
      const SectionTitle('Photos (optional)'),
      PhotoPicker(files: _photos, max: 4, onChanged: (f) => setState(() => _photos = f)),
      const SizedBox(height: 20),
      FilledButton(
        onPressed: _rating == 0 || _busy ? null : () async {
          setState(() => _busy = true);
          final ok = await submitOrQueue(context, ref, 'review', {
            'placeId': place.id, 'rating': _rating, if (_body.text.isNotEmpty) 'body': _body.text.trim(), if (_items.text.isNotEmpty) 'itemsOrdered': _items.text.trim(),
            if (_paid.text.isNotEmpty) 'amountPaidNgwee': toNgwee(_paid.text), if (_group.text.isNotEmpty) 'groupSize': int.tryParse(_group.text),
          }, photos: _photos);
          if (!mounted) return;
          setState(() => _busy = false);
          if (ok) context.pop();
        },
        child: Text(_busy ? 'Submitting…' : 'Submit review'),
      ),
    ]);
  }
}

class MenuUpdateScreen extends ConsumerStatefulWidget {
  const MenuUpdateScreen({super.key, required this.slug});
  final String slug;
  @override
  ConsumerState<MenuUpdateScreen> createState() => _MenuUpdateScreenState();
}

class _MenuUpdateScreenState extends ConsumerState<MenuUpdateScreen> {
  List<DraftSection>? _menu;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final place = ref.watch(placeDetailProvider(widget.slug)).value;
    if (place == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    _menu ??= place.menu.isEmpty ? emptyDraftMenu() : [for (final s in place.menu) DraftSection(s.name, [for (final i in s.items) DraftItem(i.name, i.priceNgwee)])];
    final payload = menuPayload(_menu!);
    return _FormPage(title: 'Menu for ${place.name}', children: [
      const Text('Edit prices or add items. Only change what’s different today.', style: TextStyle(color: Tokens.muted)),
      const SizedBox(height: 12),
      _ScanMenu(onDraft: (d) => setState(() => _menu = d)),
      MenuEditorWidget(sections: _menu!, onChanged: () => setState(() {})),
      const SizedBox(height: 20),
      FilledButton(
        onPressed: payload.isEmpty || _busy ? null : () async {
          setState(() => _busy = true);
          final ok = await submitOrQueue(context, ref, 'menu', {'placeId': place.id, 'mode': 'merge', 'sections': payload});
          if (!mounted) return;
          setState(() => _busy = false);
          if (ok) context.pop();
        },
        child: Text(_busy ? 'Submitting…' : 'Submit menu'),
      ),
    ]);
  }
}

/// Photo of a printed menu -> AI draft the user then corrects (FR-72). Falls back to manual entry.
class _ScanMenu extends ConsumerStatefulWidget {
  const _ScanMenu({required this.onDraft});
  final void Function(List<DraftSection>) onDraft;
  @override
  ConsumerState<_ScanMenu> createState() => _ScanMenuState();
}

class _ScanMenuState extends ConsumerState<_ScanMenu> {
  bool _busy = false;
  String? _msg;
  List<File> _shots = [];

  Future<void> _extract(List<File> files) async {
    setState(() { _shots = files; });
    if (files.isEmpty) return;
    setState(() { _busy = true; _msg = null; });
    try {
      final api = ref.read(apiProvider);
      final id = await api.uploadImage(files.last, purpose: 'menu-scan');
      final d = Map<String, dynamic>.from(await api.post('/submissions/menu-extract', body: {'imageId': id}));
      final sections = [for (final s in d['sections'] as List) DraftSection(s['name'], [for (final i in s['items'] as List) DraftItem(i['name'], i['priceNgwee'])])];
      if (sections.isEmpty) { _msg = 'We couldn’t read prices from that photo. Try a clearer shot, or type the menu below.'; } else { widget.onDraft(sections); _msg = 'Draft ready — please check every price before submitting.'; }
    } on ApiException catch (e) {
      _msg = e.isOffline ? 'You’re offline. Type the menu below.' : 'Automatic reading isn’t available right now. Please type the menu below.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          PhotoPicker(files: _shots, max: 1, label: 'Scan menu', onChanged: _extract),
          if (_busy) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
          if (_msg != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_msg!, style: const TextStyle(color: Tokens.muted))),
        ]),
      );
}

class PhotosScreen extends ConsumerStatefulWidget {
  const PhotosScreen({super.key, required this.slug});
  final String slug;
  @override
  ConsumerState<PhotosScreen> createState() => _PhotosScreenState();
}

class _PhotosScreenState extends ConsumerState<PhotosScreen> {
  List<File> _photos = [];
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final place = ref.watch(placeDetailProvider(widget.slug)).value;
    if (place == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return _FormPage(title: 'Photos of ${place.name}', children: [
      const Text('Only upload photos you took yourself. By submitting you let paBudget display them. Please avoid photos where people are the main subject.', style: TextStyle(color: Tokens.muted)),
      const SizedBox(height: 12),
      PhotoPicker(files: _photos, onChanged: (f) => setState(() => _photos = f)),
      const SizedBox(height: 20),
      FilledButton(
        onPressed: _photos.isEmpty || _busy ? null : () async {
          setState(() => _busy = true);
          final ok = await submitOrQueue(context, ref, 'photos', {'placeId': place.id}, photos: _photos);
          if (!mounted) return;
          setState(() => _busy = false);
          if (ok) context.pop();
        },
        child: Text(_busy ? 'Submitting…' : 'Submit photos'),
      ),
    ]);
  }
}

class EditPlaceScreen extends ConsumerStatefulWidget {
  const EditPlaceScreen({super.key, required this.slug});
  final String slug;
  @override
  ConsumerState<EditPlaceScreen> createState() => _EditPlaceScreenState();
}

class _EditPlaceScreenState extends ConsumerState<EditPlaceScreen> {
  TextEditingController? _phone, _address;
  TimeOfDay? _opens, _closes;
  bool _closed = false, _busy = false;

  @override
  Widget build(BuildContext context) {
    final place = ref.watch(placeDetailProvider(widget.slug)).value;
    if (place == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    _phone ??= TextEditingController(text: place.phone ?? '');
    _address ??= TextEditingController(text: place.address ?? '');
    String hh(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return _FormPage(title: 'Suggest an edit', children: [
      TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
      const SizedBox(height: 12),
      TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address / landmark')),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 8, minute: 0)); if (t != null) setState(() => _opens = t); }, child: Text(_opens == null ? 'New opening time' : _opens!.format(context)))),
        const SizedBox(width: 8),
        Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 22, minute: 0)); if (t != null) setState(() => _closes = t); }, child: Text(_closes == null ? 'New closing time' : _closes!.format(context)))),
      ]),
      CheckboxListTile(contentPadding: EdgeInsets.zero, value: _closed, onChanged: (v) => setState(() => _closed = v ?? false), title: const Text('This place has permanently closed'), controlAffinity: ListTileControlAffinity.leading),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: _busy ? null : () async {
          final body = <String, dynamic>{'placeId': place.id};
          if (_phone!.text.isNotEmpty && _phone!.text != (place.phone ?? '')) body['phone'] = _phone!.text.trim();
          if (_address!.text.isNotEmpty && _address!.text != (place.address ?? '')) body['address'] = _address!.text.trim();
          if (_opens != null && _closes != null) body['hours'] = [for (var d = 0; d < 7; d++) {'weekday': d, 'opensAt': hh(_opens!), 'closesAt': hh(_closes!)}];
          if (_closed) body['closedPermanently'] = true;
          if (body.length == 1) { showSnack(context, 'Change something first.'); return; }
          setState(() => _busy = true);
          final ok = await submitOrQueue(context, ref, 'edit', body);
          if (!mounted) return;
          setState(() => _busy = false);
          if (ok) context.pop();
        },
        child: Text(_busy ? 'Submitting…' : 'Submit suggestion'),
      ),
    ]);
  }
}
