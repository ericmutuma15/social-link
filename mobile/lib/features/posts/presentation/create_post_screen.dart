import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:video_player/video_player.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:video_thumbnail/video_thumbnail.dart';

import '../../feeds/presentation/feed_controller.dart';

class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key});

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _content = TextEditingController();
  PlatformFile? _file;
  VideoPlayerController? _videoController;
  Uint8List? _thumbnailBytes;
  var _sending = false;
  double? _progress;

  @override
  void dispose() {
    _content.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.media);
    if (result != null && mounted) {
      final file = result.files.single;
      setState(() => _file = file);
      if (file.path != null && (file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov') || file.name.toLowerCase().endsWith('.avi'))) {
        await _initVideoController(file.path!);
        try {
          _thumbnailBytes = await VideoThumbnail.thumbnailData(video: file.path!, imageFormat: ImageFormat.JPEG, maxWidth: 400, quality: 75);
          setState(() {});
        } catch (_) {
          _thumbnailBytes = null;
        }
      }
    }
  }

  Future<void> _capture() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, maxWidth: 2000, imageQuality: 85);
    if (picked != null && mounted) {
      final file = PlatformFile(name: picked.name, path: picked.path, size: 0);
      setState(() => _file = file);
      if (file.path != null && (file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov') || file.name.toLowerCase().endsWith('.avi'))) {
        await _initVideoController(file.path!);
        try {
          _thumbnailBytes = await VideoThumbnail.thumbnailData(video: file.path!, imageFormat: ImageFormat.JPEG, maxWidth: 400, quality: 75);
          setState(() {});
        } catch (_) {
          _thumbnailBytes = null;
        }
      }
    }
  }

  Future<void> _initVideoController(String path) async {
    try {
      _videoController?.dispose();
      _videoController = VideoPlayerController.file(File(path));
      await _videoController!.initialize();
      _videoController!.setLooping(true);
      setState(() {});
    } catch (_) {
      _videoController = null;
    }
  }

  Future<void> _submit() async {
    if (_sending) return;
    final confirmed = await _confirmPublish();
    if (!confirmed) return;
    setState(() => _sending = true);
    try {
      Object body;
      if (_file?.path != null) {
        final map = {'content': _content.text.trim(), 'media': await MultipartFile.fromFile(_file!.path!, filename: _file!.name)};
        if (_thumbnailBytes != null) {
          map['thumbnail'] = MultipartFile.fromBytes(_thumbnailBytes!, filename: 'thumbnail.jpg', contentType: MediaType('image', 'jpeg'));
        }
        body = FormData.fromMap(map);
      } else {
        body = {'content': _content.text.trim()};
      }

      await ref.read(apiProvider).post('/api/posts', data: body, onSendProgress: (sent, total) {
        if (mounted && total > 0) {
          setState(() => _progress = sent / total);
        }
      });

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not publish post.')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
          _progress = null;
        });
      }
    }
  }

  Future<bool> _confirmPublish() async {
    if (!mounted) return false;
    return await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Confirm publish'),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (_content.text.trim().isNotEmpty) Text(_content.text.trim(), maxLines: 5, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                if (_file != null)
                  SizedBox(
                    height: 200,
                    child: _file!.path != null && (_file!.name.toLowerCase().endsWith('.mp4') || _file!.name.toLowerCase().endsWith('.mov') || _file!.name.toLowerCase().endsWith('.avi'))
                        ? (_videoController != null && _videoController!.value.isInitialized ? AspectRatio(aspectRatio: _videoController!.value.aspectRatio, child: VideoPlayer(_videoController!)) : const Center(child: Icon(Icons.videocam_outlined)))
                        : (_file!.path != null ? Image.file(File(_file!.path!), fit: BoxFit.cover) : const SizedBox.shrink()),
                  ),
              ]),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Publish')),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Create post')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(controller: _content, minLines: 5, maxLines: 10, maxLength: 5000, decoration: const InputDecoration(hintText: "What's on your mind?", border: OutlineInputBorder())),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: OutlinedButton.icon(onPressed: _sending ? null : _pick, icon: const Icon(Icons.perm_media_outlined), label: Text(_file == null ? 'Add photo or video' : _file!.name))),
                const SizedBox(width: 8),
                OutlinedButton.icon(onPressed: _sending ? null : _capture, icon: const Icon(Icons.camera_alt_outlined), label: const Text('Camera')),
              ]),
              if (_file != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_file!.path != null && (_file!.name.toLowerCase().endsWith('.jpg') || _file!.name.toLowerCase().endsWith('.jpeg') || _file!.name.toLowerCase().endsWith('.png') || _file!.name.toLowerCase().endsWith('.gif')))
                        ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(File(_file!.path!), width: double.infinity, height: 200, fit: BoxFit.cover)),
                      if (_file!.path != null && (_file!.name.toLowerCase().endsWith('.mp4') || _file!.name.toLowerCase().endsWith('.mov') || _file!.name.toLowerCase().endsWith('.avi')))
                        _videoController != null && _videoController!.value.isInitialized
                            ? GestureDetector(
                                onTap: () {
                                  if (_videoController!.value.isPlaying) {
                                    _videoController!.pause();
                                  } else {
                                    _videoController!.play();
                                  }
                                  setState(() {});
                                },
                                child: AspectRatio(aspectRatio: _videoController!.value.aspectRatio, child: VideoPlayer(_videoController!)),
                              )
                            : (_thumbnailBytes != null
                                ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.memory(_thumbnailBytes!, width: double.infinity, height: 200, fit: BoxFit.cover))
                                : Container(height: 200, width: double.infinity, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Center(child: Icon(Icons.videocam_outlined, size: 48)))),
                      const SizedBox(height: 8),
                      Row(children: [
                        Expanded(child: Text(_file!.name, overflow: TextOverflow.ellipsis)),
                        IconButton(onPressed: () => setState(() => _file = null), icon: const Icon(Icons.close), tooltip: 'Remove attachment'),
                        const SizedBox.shrink()
                      ])
                    ],
                  ),
                ),
              if (_progress != null) Padding(padding: const EdgeInsets.only(top: 16), child: LinearProgressIndicator(value: _progress)),
              const SizedBox(height: 24),
              FilledButton.icon(onPressed: _sending ? null : _submit, icon: _sending ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send), label: Text(_sending ? 'Publishing…' : 'Publish post'))
            ],
          ),
        ),
      );
}
