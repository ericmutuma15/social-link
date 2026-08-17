import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_thumbnail/video_thumbnail.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../features/feeds/presentation/feed_controller.dart';
import 'package:dio/dio.dart';

class StoryCameraExplorer extends ConsumerStatefulWidget {
  const StoryCameraExplorer({super.key});

  @override
  ConsumerState<StoryCameraExplorer> createState() => _StoryCameraExplorerState();
}

class _StoryCameraExplorerState extends ConsumerState<StoryCameraExplorer> {
  XFile? _file;
  String? _thumbPath;
  double? _progress;
  var _uploading = false;
  final _text = TextEditingController();
  Color _background = const Color(0xff2E7D32);

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _pickMedia(ImageSource source, {required bool video}) async {
    final picker = ImagePicker();
    final XFile? file = video
        ? await picker.pickVideo(source: source, maxDuration: const Duration(seconds: 60))
        : await picker.pickImage(source: source, imageQuality: 85, maxWidth: 1920);
    if (file == null) return;
    String? thumb;
    if (video) {
      final tmpDir = await getTemporaryDirectory();
      thumb = await VideoThumbnail.thumbnailFile(video: file.path, thumbnailPath: tmpDir.path, imageFormat: ImageFormat.JPEG, maxHeight: 200, quality: 75);
    }
    if (!mounted) return;
    setState(() {
      _file = file;
      _thumbPath = thumb;
    });
    await _showPreview();
  }

  Future<void> _publishText() async {
    final content = _text.text.trim();
    if (content.isEmpty || _uploading) return;
    setState(() => _uploading = true);
    try {
      await ref.read(apiProvider).post('/api/stories', data: {'content': content, 'media_type': 'text'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Story published')));
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to publish your story. Please try again.')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _showPreview() async {
    if (!mounted) return;
    final thumb = _thumbPath;
    final filename = _file?.name ?? '';
    await showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text('Preview'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            if (thumb != null) Image.file(File(thumb)),
            if (thumb == null && _file != null) Image.file(File(_file!.path)),
            const SizedBox(height: 8),
            Text('Captured: $filename'),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
            ElevatedButton(onPressed: () async {
              Navigator.of(context).pop();
              await _upload();
            }, child: const Text('Publish')),
          ],
        );
      },
    );
  }

  Future<void> _upload() async {
    if (_file == null || _uploading) return;
    setState(() => _uploading = true);
    final api = ref.read(apiProvider);
    final messenger = ScaffoldMessenger.of(context);
    if (!mounted) return;
    try {
      final form = FormData();
      form.fields.add(MapEntry('content', ''));
      form.files.add(MapEntry(
        'media',
        await MultipartFile.fromFile(_file!.path, filename: _file!.name),
      ));
      if (_thumbPath != null) {
        form.files.add(MapEntry('thumbnail', await MultipartFile.fromFile(_thumbPath!, filename: 'thumb.jpg')));
      }
      await api.post('/api/stories', data: form, onSendProgress: (sent, total) {
        if (mounted && total > 0) setState(() => _progress = sent / total);
      });
      if (mounted) {
        messenger.showSnackBar(const SnackBar(content: Text('Story uploaded')));
        setState(() { _file = null; _thumbPath = null; _progress = null; });
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) messenger.showSnackBar(const SnackBar(content: Text('Upload failed. Check your connection and try again.')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create story')),
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.camera_alt, size: 72),
          const SizedBox(height: 12),
          const Text('Share a moment with your friends for 24 hours.'),
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
            FilledButton.icon(onPressed: _uploading ? null : () => _pickMedia(ImageSource.camera, video: false), icon: const Icon(Icons.camera_alt_outlined), label: const Text('Camera')),
            FilledButton.icon(onPressed: _uploading ? null : () => _pickMedia(ImageSource.camera, video: true), icon: const Icon(Icons.videocam_outlined), label: const Text('Video')),
            OutlinedButton.icon(onPressed: _uploading ? null : () => _pickMedia(ImageSource.gallery, video: false), icon: const Icon(Icons.photo_library_outlined), label: const Text('Photo')),
            OutlinedButton.icon(onPressed: _uploading ? null : () => _pickMedia(ImageSource.gallery, video: true), icon: const Icon(Icons.video_library_outlined), label: const Text('Gallery video')),
          ]),
          const SizedBox(height: 20),
          Container(width: 300, padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: _background, borderRadius: BorderRadius.circular(20)), child: TextField(controller: _text, maxLength: 500, maxLines: 4, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 20), decoration: const InputDecoration(hintText: 'Write a text story…', hintStyle: TextStyle(color: Colors.white70), border: InputBorder.none))),
          Wrap(spacing: 8, children: [for (final color in [const Color(0xff2E7D32), const Color(0xff1565C0), const Color(0xff6A1B9A), const Color(0xffC62828)]) GestureDetector(onTap: () => setState(() => _background = color), child: CircleAvatar(backgroundColor: color, radius: 14))]),
          const SizedBox(height: 10),
          FilledButton(onPressed: _uploading ? null : _publishText, child: const Text('Post text story')),
          if (_progress != null) Padding(padding: const EdgeInsets.all(12), child: LinearProgressIndicator(value: _progress)),
        ]),
      ),
    );
  }
}
