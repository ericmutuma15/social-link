import 'dart:convert';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:dio/dio.dart';
import 'package:cached_network_image/cached_network_image.dart';
// dio imported previously for MultipartFile usage in comments; not needed now
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../feeds/presentation/rich_comment_composer.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'feed_controller.dart';

class CommentsSheet extends ConsumerStatefulWidget {
  const CommentsSheet({super.key, required this.postId});
  final int postId;

  @override
  ConsumerState<CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends ConsumerState<CommentsSheet> {
  final _text = TextEditingController();
  final _storage = const FlutterSecureStorage();
  static const _pendingKey = 'pending_comments';

  List<Map<String, dynamic>> _comments = [];
  List<Map<String, dynamic>> _pending = [];
  var _loading = true;
  var _sending = false;
  double? _progress;
  PlatformFile? _attachment;

  @override
  void initState() {
    super.initState();
    _load();
    _loadPending();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final result = await ref.read(apiProvider).get('/api/posts/${widget.postId}/comments');
      final data = result['data'] as List<dynamic>? ?? const [];
      if (mounted) {
        setState(() {
          _comments = data.cast<Map<String, dynamic>>();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadPending() async {
    final raw = await _storage.read(key: _pendingKey);
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List<dynamic>).cast<Map<String, dynamic>>();
      if (mounted) {
        setState(() {
          _pending = list.where((p) => p['postId'] == widget.postId).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _savePending(Map<String, dynamic> item) async {
    final raw = await _storage.read(key: _pendingKey);
    List<dynamic> list = [];
    if (raw != null) {
      try {
        list = jsonDecode(raw) as List<dynamic>;
      } catch (_) {}
    }
    list.add(item);
    await _storage.write(key: _pendingKey, value: jsonEncode(list));
    if (mounted) {
      setState(() {
        _pending = [..._pending, item];
      });
    }
  }

  // Track retry attempts per pending item to improve retry UX (P4.3)
  Future<void> _incrementRetry(Map<String, dynamic> item) async {
    final raw = await _storage.read(key: _pendingKey);
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List<dynamic>).cast<Map<String, dynamic>>();
      for (final m in list) {
        if (m['timestamp'] == item['timestamp'] && m['postId'] == item['postId']) {
          m['retries'] = ((m['retries'] as int?) ?? 0) + 1;
          break;
        }
      }
      await _storage.write(key: _pendingKey, value: jsonEncode(list));
      if (mounted) _loadPending();
    } catch (_) {}
  }

  Future<void> _removePending(Map<String, dynamic> item) async {
    final raw = await _storage.read(key: _pendingKey);
    if (raw == null) return;
    try {
      final list = (jsonDecode(raw) as List<dynamic>).cast<Map<String, dynamic>>();
      list.removeWhere((m) => m['timestamp'] == item['timestamp'] && m['postId'] == item['postId']);
      await _storage.write(key: _pendingKey, value: jsonEncode(list));
      if (mounted) {
        setState(() {
          _pending = _pending.where((p) => p['timestamp'] != item['timestamp']).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _retryPending(Map<String, dynamic> item) async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      Object data;
      if ((item['attachmentPath'] as String?)?.isNotEmpty == true) {
        data = FormData.fromMap({
          'content': item['content'] ?? '',
          'attachment': await MultipartFile.fromFile(item['attachmentPath'] as String, filename: item['attachmentName'] as String? ?? 'attachment'),
        });
      } else {
        data = {'content': item['content'] ?? ''};
      }
      final result = await ref.read(apiProvider).post('/api/posts/${widget.postId}/comments', data: data);
      if (mounted) {
        setState(() {
          _comments = [..._comments, result['data'] as Map<String, dynamic>];
        });
      }
      await _removePending(item);
      _notice('Comment posted');
    } catch (_) {
      _notice('Retry failed');
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  // Attachment picking moved into the rich composer; keep storage and send logic.

  Future<void> _send() async {
    final content = _text.text.trim();
    if ((content.isEmpty && _attachment == null) || _sending) return;
    setState(() => _sending = true);
    try {
      Object data;
      if (_attachment?.path != null) {
        final bytes = await _attachment!.readStream!.fold<Uint8List>(Uint8List(0), (prev, elem) => Uint8List.fromList([...prev, ...elem]));
        data = FormData.fromMap({
          'content': content,
          'attachment': MultipartFile.fromBytes(bytes, filename: _attachment!.name, contentType: MediaType('application', 'octet-stream')),
        });
      } else {
        data = {'content': content};
      }
      final result = await ref.read(apiProvider).post('/api/posts/${widget.postId}/comments', data: data, onSendProgress: (sent, total) {
        if (mounted && total > 0) {
          setState(() {
            _progress = sent / total;
          });
        }
      });
      if (mounted) {
        setState(() {
          _comments = [..._comments, result['data'] as Map<String, dynamic>];
          _text.clear();
          _attachment = null;
          _progress = null;
        });
      }
    } catch (_) {
      _notice('Your comment could not be posted. Saved for retry.');
      await _savePending({'postId': widget.postId, 'content': content, 'attachmentPath': _attachment?.path, 'attachmentName': _attachment?.name, 'timestamp': DateTime.now().toIso8601String()});
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  Future<void> _delete(Map<String, dynamic> comment) async {
    try {
      await ref.read(apiProvider).delete('/api/comments/${comment['id']}');
      if (mounted) {
        setState(() {
          _comments = _comments.where((item) => item['id'] != comment['id']).toList();
        });
      }
    } catch (_) {
      _notice('Could not delete this comment.');
    }
  }

  void _notice(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * .72,
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Theme.of(context).colorScheme.outlineVariant, borderRadius: BorderRadius.circular(8))),
              const SizedBox(height: 12),
              Text('Comments', style: Theme.of(context).textTheme.titleLarge),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _comments.isEmpty && _pending.isEmpty
                        ? const Center(child: Text('Be the first to comment.'))
                        : ListView.builder(
                            itemCount: _comments.length + _pending.length,
                            itemBuilder: (_, idx) {
                              if (idx < _comments.length) {
                                final comment = _comments[idx];
                                final photo = comment['user_photo'] as String?;
                                final userId = comment['user_id'];
                                return ListTile(
                                  leading: GestureDetector(onTap: userId == null ? null : () => context.push('/profile/$userId'), child: CircleAvatar(backgroundImage: photo == null ? null : CachedNetworkImageProvider(photo), child: photo == null ? Text((comment['user_name'] as String? ?? 'U').substring(0, 1)) : null)),
                                  title: Text(comment['user_name'] as String? ?? 'User'),
                                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(comment['content'] as String? ?? ''),
                                    if ((comment['attachment_url'] as String?).isNotNullAndNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: GestureDetector(onTap: () => context.push('/posts/${comment['post_id']}', extra: comment), child: Text('View attachment', style: TextStyle(color: Theme.of(context).colorScheme.primary)))),
                                    Text(_time(comment['timestamp'] as String?), style: Theme.of(context).textTheme.labelSmall)
                                  ]),
                                  trailing: comment['is_owner'] == true ? IconButton(onPressed: () => _delete(comment), icon: const Icon(Icons.delete_outline), tooltip: 'Delete comment') : null,
                                );
                              }
                              final pending = _pending[idx - _comments.length];
                              return ListTile(
                                leading: const CircleAvatar(child: Icon(Icons.hourglass_top)),
                                title: Text(pending['content'] as String? ?? ''),
                                subtitle: Text('Pending — ${pending['timestamp'] as String? ?? ''}'),
                                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                  if ((pending['retries'] as int?) != null)
                                    Padding(padding: const EdgeInsets.only(right: 8), child: Text('Retries: ${pending['retries']}', style: Theme.of(context).textTheme.labelSmall)),
                                  IconButton(onPressed: () async { await _incrementRetry(pending); await _retryPending(pending); }, icon: const Icon(Icons.refresh), tooltip: 'Retry'),
                                  IconButton(onPressed: () => _removePending(pending), icon: const Icon(Icons.delete_outline), tooltip: 'Remove'),
                                ]),
                              );
                            }),
              ),
              if (_progress != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: LinearProgressIndicator(value: _progress)),
              RichCommentComposer(onSend: (content, {attachments}) async {
                // use existing send flow; attach any picked file
                setState(() {
                  _text.text = content;
                });
                await _send();
              }),
            ],
          ),
        ),
      ),
    );
  }

  String _time(String? value) {
    final date = DateTime.tryParse(value ?? '');
    if (date == null) return 'Now';
    final local = date.toLocal();
    final diff = DateTime.now().toLocal().difference(local);
    return diff.inMinutes < 1 ? 'Now' : diff.inHours < 1 ? '${diff.inMinutes}m' : diff.inDays < 1 ? '${diff.inHours}h' : '${diff.inDays}d';
  }
}

extension on String? {
  bool get isNotNullAndNotEmpty => this != null && this!.isNotEmpty;
}
