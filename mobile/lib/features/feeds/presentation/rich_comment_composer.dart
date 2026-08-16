import 'package:flutter/material.dart';

class RichCommentComposer extends StatelessWidget {
  const RichCommentComposer({super.key, required this.onSend});

  final Future<void> Function(String content, {List<String>? attachments}) onSend;

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController();
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(children: [
        Expanded(
          child: TextField(
            controller: controller,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Add a thoughtful reply…', border: OutlineInputBorder()),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(onPressed: () async {
          final text = controller.text.trim();
          if (text.isNotEmpty) {
            await onSend(text);
            controller.clear();
          }
        }, icon: const Icon(Icons.send)),
      ]),
    );
  }
}
