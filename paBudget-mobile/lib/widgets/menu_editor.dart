import 'package:flutter/material.dart';
import '../core/format.dart';
import '../models.dart';

/// Editable menu draft: sections of (name, price). Prices typed in kwacha, stored as ngwee.
class MenuEditorWidget extends StatefulWidget {
  const MenuEditorWidget({super.key, required this.sections, required this.onChanged});
  final List<DraftSection> sections;
  final VoidCallback onChanged;
  @override
  State<MenuEditorWidget> createState() => _MenuEditorWidgetState();
}

class _MenuEditorWidgetState extends State<MenuEditorWidget> {
  @override
  Widget build(BuildContext context) {
    final s = widget.sections;
    void change(VoidCallback f) { setState(f); widget.onChanged(); }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      for (var si = 0; si < s.length; si++)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(children: [
              Row(children: [
                Expanded(child: TextFormField(key: ValueKey('sec-$si-${s[si].name.isEmpty}'), initialValue: s[si].name, decoration: const InputDecoration(hintText: 'Section (e.g. Mains)'), onChanged: (v) { s[si].name = v; widget.onChanged(); })),
                IconButton(tooltip: 'Remove section', icon: const Icon(Icons.close), onPressed: () => change(() => s.removeAt(si))),
              ]),
              for (var ii = 0; ii < s[si].items.length; ii++)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(children: [
                    Expanded(child: TextFormField(key: ValueKey('item-$si-$ii-${s[si].items[ii].name.isEmpty}'), initialValue: s[si].items[ii].name, decoration: const InputDecoration(hintText: 'Item'), onChanged: (v) { s[si].items[ii].name = v; widget.onChanged(); })),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 92,
                      child: TextFormField(
                        key: ValueKey('price-$si-$ii-${s[si].items[ii].priceNgwee == 0}'),
                        initialValue: s[si].items[ii].priceNgwee == 0 ? '' : (s[si].items[ii].priceNgwee / 100).toString().replaceAll(RegExp(r'\.0$'), ''),
                        decoration: const InputDecoration(hintText: 'K'),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        onChanged: (v) { s[si].items[ii].priceNgwee = toNgwee(v); widget.onChanged(); },
                      ),
                    ),
                    IconButton(tooltip: 'Remove item', icon: const Icon(Icons.remove_circle_outline, size: 20), onPressed: () => change(() => s[si].items.removeAt(ii))),
                  ]),
                ),
              Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: () => change(() => s[si].items.add(DraftItem('', 0))), icon: const Icon(Icons.add), label: const Text('Add item'))),
            ]),
          ),
        ),
      const SizedBox(height: 8),
      OutlinedButton.icon(onPressed: () => change(() => s.add(DraftSection('', [DraftItem('', 0)]))), icon: const Icon(Icons.add), label: const Text('Add section')),
    ]);
  }
}

List<DraftSection> emptyDraftMenu() => [DraftSection('Mains', [DraftItem('', 0)]), DraftSection('Drinks', [DraftItem('', 0)])];

/// Drops blank rows and converts to the API payload.
List<Map<String, dynamic>> menuPayload(List<DraftSection> s) => [
      for (final sec in s)
        if (sec.name.trim().isNotEmpty && sec.items.any((i) => i.name.trim().isNotEmpty && i.priceNgwee > 0))
          {
            'name': sec.name.trim(),
            'items': [for (final i in sec.items) if (i.name.trim().isNotEmpty && i.priceNgwee > 0) {'name': i.name.trim(), 'priceNgwee': i.priceNgwee}],
          }
    ];
