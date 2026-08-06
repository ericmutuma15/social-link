import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';

class CreatePostScreen extends ConsumerStatefulWidget { const CreatePostScreen({super.key}); @override ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState(); }
class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _content = TextEditingController(); PlatformFile? _file; var _sending = false; double? _progress;
  @override void dispose() { _content.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Create post')), body: SafeArea(child: ListView(padding: const EdgeInsets.all(16), children: [TextField(controller: _content, minLines: 5, maxLines: 10, maxLength: 5000, decoration: const InputDecoration(hintText: "What's on your mind?", border: OutlineInputBorder())), const SizedBox(height: 12), OutlinedButton.icon(onPressed: _sending ? null : _pick, icon: const Icon(Icons.perm_media_outlined), label: Text(_file == null ? 'Add photo or video' : _file!.name)), if (_file != null) Padding(padding: const EdgeInsets.only(top: 8), child: Row(children: [const Icon(Icons.attach_file), Expanded(child: Text(_file!.name, overflow: TextOverflow.ellipsis)), IconButton(onPressed: () => setState(() => _file = null), icon: const Icon(Icons.close), tooltip: 'Remove attachment')])), if (_progress != null) Padding(padding: const EdgeInsets.only(top: 16), child: LinearProgressIndicator(value: _progress)), const SizedBox(height: 24), FilledButton.icon(onPressed: _sending ? null : _submit, icon: _sending ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send), label: Text(_sending ? 'Publishing…' : 'Publish post'))])));
  Future<void> _pick() async { final result = await FilePicker.platform.pickFiles(type: FileType.media); if (result != null && mounted) setState(() => _file = result.files.single); }
  Future<void> _submit() async { if (_content.text.trim().isEmpty && _file == null) { _message('Add text or an attachment to publish your post.'); return; } setState(() => _sending = true); try { final data = FormData.fromMap({'content': _content.text.trim(), if (_file?.path != null) 'media': await MultipartFile.fromFile(_file!.path!, filename: _file!.name)}); await ref.read(apiProvider).post('/api/posts', data: data, onSendProgress: (sent, total) { if (mounted && total > 0) setState(() => _progress = sent / total); }); await ref.read(feedProvider.notifier).refresh(); if (mounted) { _message('Post published'); context.pop(); } } catch (_) { _message('Upload failed. Please try again.'); } finally { if (mounted) setState(() { _sending = false; _progress = null; }); } }
  void _message(String text) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text))); }
}
