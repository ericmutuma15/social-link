import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../utils/profile_image.dart';

class PostMedia extends StatelessWidget {
  const PostMedia({super.key, required this.url, this.type});
  final String url;
  final String? type;

  bool get _video => type == 'video' || RegExp(r'\.(mp4|mov|webm)(\?|$)', caseSensitive: false).hasMatch(url);

  @override
  Widget build(BuildContext context) {
    final resolved = resolveProfileImageUrl(url);
    if (_video) return _Video(url: resolved ?? url);
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => _ImageViewer(url: resolved ?? url))),
      child: Hero(
        tag: resolved ?? url,
        child: CachedNetworkImage(
          imageUrl: resolved ?? '',
          fit: BoxFit.cover,
          placeholder: (_, _) => const AspectRatio(aspectRatio: 4 / 3, child: Center(child: CircularProgressIndicator())),
          errorWidget: (_, _, _) => const AspectRatio(aspectRatio: 4 / 3, child: Center(child: Icon(Icons.broken_image_outlined))),
        ),
      ),
    );
  }
}

class _Video extends StatefulWidget { const _Video({required this.url}); final String url; @override State<_Video> createState() => _VideoState(); }
class _VideoState extends State<_Video> {
  late final VideoPlayerController _controller;
  @override void initState() { super.initState(); _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))..initialize().then((_) { if (mounted) setState(() {}); }); }
  @override void dispose() { _controller.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    if (!_controller.value.isInitialized) return const AspectRatio(aspectRatio: 16 / 9, child: Center(child: CircularProgressIndicator()));
    return Stack(alignment: Alignment.center, children: [AspectRatio(aspectRatio: _controller.value.aspectRatio, child: VideoPlayer(_controller)), IconButton.filledTonal(onPressed: () { setState(() => _controller.value.isPlaying ? _controller.pause() : _controller.play()); }, icon: Icon(_controller.value.isPlaying ? Icons.pause : Icons.play_arrow), tooltip: _controller.value.isPlaying ? 'Pause video' : 'Play video')]);
  }
}

class _ImageViewer extends StatelessWidget { const _ImageViewer({required this.url}); final String url; @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.black, appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white), body: Center(child: InteractiveViewer(child: Hero(tag: url, child: CachedNetworkImage(imageUrl: url, fit: BoxFit.contain, errorWidget: (_, _, _) => const Icon(Icons.broken_image, color: Colors.white)))))); }
