import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../feeds/presentation/feed_controller.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _bio = TextEditingController();
  final _location = TextEditingController();
  final _website = TextEditingController();
  final _phone = TextEditingController();
  final _occupation = TextEditingController();
  final _company = TextEditingController();
  final _timezone = TextEditingController();
  final _language = TextEditingController();
  final _socialLinks = TextEditingController();
  PlatformFile? _avatar;
  PlatformFile? _cover;
  var _loading = true;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _username.dispose();
    _bio.dispose();
    _location.dispose();
    _website.dispose();
    _phone.dispose();
    _occupation.dispose();
    _company.dispose();
    _timezone.dispose();
    _language.dispose();
    _socialLinks.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final user = await ref.read(apiProvider).get('/api/current_user');
      if (!mounted) return;
      _name.text = user['name'] as String? ?? '';
      _username.text = user['username'] as String? ?? '';
      _bio.text = user['description'] as String? ?? '';
      _location.text = user['location'] as String? ?? '';
      _website.text = user['website'] as String? ?? '';
      _phone.text = user['phone_number'] as String? ?? '';
      _occupation.text = user['occupation'] as String? ?? '';
      _company.text = user['company'] as String? ?? '';
      _timezone.text = user['timezone'] as String? ?? 'UTC';
      _language.text = user['language'] as String? ?? 'en';
      final socialLinks = user['social_links'] as Map<String, dynamic>? ?? const {};
      _socialLinks.text = socialLinks.isEmpty ? '' : socialLinks.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return _notice('Name cannot be empty.');
    setState(() => _saving = true);
    try {
      final data = FormData.fromMap({
        'name': _name.text.trim(),
        'username': _username.text.trim(),
        'description': _bio.text.trim(),
        'location': _location.text.trim(),
        'website': _website.text.trim(),
        'phone_number': _phone.text.trim(),
        'occupation': _occupation.text.trim(),
        'company': _company.text.trim(),
        'timezone': _timezone.text.trim(),
        'language': _language.text.trim(),
        'social_links': _socialLinks.text.trim(),
        if (_avatar?.path != null) 'picture': await MultipartFile.fromFile(_avatar!.path!, filename: _avatar!.name),
        if (_cover?.path != null) 'cover_photo': await MultipartFile.fromFile(_cover!.path!, filename: _cover!.name),
      });
      await ref.read(apiProvider).post('/api/profile', data: data);
      if (mounted) {
        _notice('Profile updated');
        context.pop();
      }
    } catch (_) {
      _notice('Profile update failed. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAvatar() async {
    final file = await FilePicker.platform.pickFiles(type: FileType.image);
    if (file != null && mounted) setState(() => _avatar = file.files.single);
  }

  Future<void> _pickCover() async {
    final file = await FilePicker.platform.pickFiles(type: FileType.image);
    if (file != null && mounted) setState(() => _cover = file.files.single);
  }

  void _notice(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Center(child: OutlinedButton.icon(onPressed: _pickAvatar, icon: const Icon(Icons.photo_camera_outlined), label: Text(_avatar == null ? 'Change profile photo' : _avatar!.name))),
                const SizedBox(height: 12),
                Center(child: OutlinedButton.icon(onPressed: _pickCover, icon: const Icon(Icons.image_outlined), label: Text(_cover == null ? 'Change cover photo' : _cover!.name))),
                const SizedBox(height: 16),
                TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _bio, maxLines: 4, maxLength: 500, decoration: const InputDecoration(labelText: 'Bio', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _website, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'Website', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone number', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _occupation, decoration: const InputDecoration(labelText: 'Occupation', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _company, decoration: const InputDecoration(labelText: 'Company', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _timezone, decoration: const InputDecoration(labelText: 'Timezone', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _language, decoration: const InputDecoration(labelText: 'Language', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _socialLinks, maxLines: 3, decoration: const InputDecoration(labelText: 'Social links JSON', border: OutlineInputBorder())),
                const SizedBox(height: 24),
                FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving…' : 'Save changes')),
              ],
            ),
    );
  }
}
