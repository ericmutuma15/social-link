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

  Future<void> _capture() async {
    final picker = ImagePicker();
    final XFile? file = await picker.pickVideo(source: ImageSource.camera);
    if (file == null) return;
    final tmpDir = await getTemporaryDirectory();
    final thumb = await VideoThumbnail.thumbnailFile(
      video: file.path,
      thumbnailPath: tmpDir.path,
      imageFormat: ImageFormat.JPEG,
      maxHeight: 200,
      quality: 75,
    );
    if (!mounted) return;
    setState(() {
      _file = file;
      _thumbPath = thumb;
    });
    await _showPreview();
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
      }
    } catch (e) {
      if (mounted) messenger.showSnackBar(SnackBar(content: Text('Upload failed: ${e.toString()}')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Story Camera Explorer')),
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.camera_alt, size: 72),
          const SizedBox(height: 12),
          const Text('Prototype: open camera, capture, preview, publish'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _capture, child: const Text('Capture')),
          if (_progress != null) Padding(padding: const EdgeInsets.all(12), child: LinearProgressIndicator(value: _progress)),
        ]),
      ),
    );
  }
}
