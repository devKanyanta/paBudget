import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../theme.dart';

/// Picks photos from camera/gallery, downscaled on-device (max 1600px, q82) to save the user's data.
class PhotoPicker extends StatelessWidget {
  const PhotoPicker({super.key, required this.files, required this.onChanged, this.max = 10, this.label = 'Add photos'});
  final List<File> files;
  final ValueChanged<List<File>> onChanged;
  final int max;
  final String label;

  Future<void> _pick(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(leading: const Icon(Icons.photo_camera), title: const Text('Take a photo'), onTap: () => Navigator.pop(context, ImageSource.camera)),
        ListTile(leading: const Icon(Icons.photo_library), title: const Text('Choose from gallery'), onTap: () => Navigator.pop(context, ImageSource.gallery)),
      ])),
    );
    if (source == null) return;
    final picker = ImagePicker();
    if (source == ImageSource.camera) {
      final x = await picker.pickImage(source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 82);
      if (x != null) onChanged([...files, File(x.path)]);
    } else {
      final xs = await picker.pickMultiImage(maxWidth: 1600, maxHeight: 1600, imageQuality: 82, limit: max - files.length);
      onChanged([...files, ...xs.map((x) => File(x.path))].take(max).toList());
    }
  }

  @override
  Widget build(BuildContext context) => Wrap(spacing: 8, runSpacing: 8, children: [
        for (final f in files)
          Stack(children: [
            ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(f, width: 84, height: 84, fit: BoxFit.cover, cacheWidth: 200)),
            Positioned(right: 2, top: 2, child: InkWell(onTap: () => onChanged(files.where((x) => x != f).toList()), child: const CircleAvatar(radius: 11, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 14, color: Colors.white)))),
          ]),
        if (files.length < max)
          InkWell(
            onTap: () => _pick(context),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 84, height: 84,
              decoration: BoxDecoration(border: Border.all(color: Tokens.border, width: 2), borderRadius: BorderRadius.circular(12)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(Icons.photo_camera_outlined, color: Tokens.muted), Text(label, style: const TextStyle(fontSize: 11, color: Tokens.muted), textAlign: TextAlign.center)]),
            ),
          ),
      ]);
}
