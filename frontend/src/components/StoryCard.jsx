export default function StoryCard({ name, image, active = false }) {
  return (
    <button className="story-card">
      <span className={active ? "story-ring active" : "story-ring"}>
        {image ? <img src={image} alt="" /> : name[0]}
      </span>
      <small>{name}</small>
    </button>
  );
}
