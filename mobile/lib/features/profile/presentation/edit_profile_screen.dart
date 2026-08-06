import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';

class EditProfileScreen extends ConsumerStatefulWidget { const EditProfileScreen({super.key}); @override ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState(); }
class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _name = TextEditingController(), _bio = TextEditingController(), _location = TextEditingController(), _website = TextEditingController(); PlatformFile? _avatar; var _loading = true; var _saving = false;
  @override void initState() { super.initState(); _load(); }
  @override void dispose() { _name.dispose(); _bio.dispose(); _location.dispose(); _website.dispose(); super.dispose(); }
  Future<void> _load() async { try { final user = await ref.read(apiProvider).get('/api/current_user'); _name.text = user['name'] as String? ?? ''; _bio.text = user['description'] as String? ?? ''; _location.text = user['location'] as String? ?? ''; _website.text = user['website'] as String? ?? ''; } finally { if (mounted) setState(() => _loading = false); } }
  Future<void> _save() async { if (_name.text.trim().isEmpty) return _notice('Name cannot be empty.'); setState(() => _saving = true); try { final data = FormData.fromMap({'name': _name.text.trim(), 'description': _bio.text.trim(), 'location': _location.text.trim(), 'website': _website.text.trim(), if (_avatar?.path != null) 'picture': await MultipartFile.fromFile(_avatar!.path!, filename: _avatar!.name)}); await ref.read(apiProvider).post('/api/profile', data: data); if (mounted) { _notice('Profile updated'); context.pop(); } } catch (_) { _notice('Profile update failed. Please try again.'); } finally { if (mounted) setState(() => _saving = false); } }
  Future<void> _pick() async { final file = await FilePicker.platform.pickFiles(type: FileType.image); if (file != null && mounted) setState(() => _avatar = file.files.single); }
  void _notice(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Edit profile')), body: _loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(16), children: [Center(child: OutlinedButton.icon(onPressed: _pick, icon: const Icon(Icons.photo_camera_outlined), label: Text(_avatar == null ? 'Change profile photo' : _avatar!.name))), const SizedBox(height: 12), TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder())), const SizedBox(height: 12), TextField(controller: _bio, maxLines: 4, maxLength: 500, decoration: const InputDecoration(labelText: 'Bio', border: OutlineInputBorder())), const SizedBox(height: 12), TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder())), const SizedBox(height: 12), TextField(controller: _website, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'Website', border: OutlineInputBorder())), const SizedBox(height: 24), FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving…' : 'Save changes'))]));
}
