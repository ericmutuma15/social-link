import { useMemo, useState } from "react";

const groups = {
  Recent: ["😀", "😂", "❤️", "👍", "🎉", "🙏", "🔥", "✨"],
  Smileys: ["😊", "😍", "🥳", "😢", "😮", "😎", "🤔", "🙌"],
  Gestures: ["👍", "👎", "👏", "🤝", "💪", "👋", "✌️", "🙏"],
  Nature: ["🌞", "🌈", "🌸", "🌍", "🐶", "🐱", "🍕", "☕"],
};

export default function EmojiPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => Object.entries(groups).map(([name, emojis]) => [name, emojis.filter((emoji) => !query || emoji.includes(query))]), [query]);
  return <div className="emoji-picker" role="dialog" aria-label="Choose an emoji">
    <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emoji" aria-label="Search emoji" />
    {items.map(([name, emojis]) => emojis.length > 0 && <section key={name}><strong>{name}</strong><div>{emojis.map((emoji) => <button key={`${name}-${emoji}`} type="button" onClick={() => onSelect(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div></section>)}
  </div>;
}
