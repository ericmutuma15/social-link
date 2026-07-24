export default function StoryCard({ name, image, active = false, onClick }) {
  return (
    <button className="story-card" onClick={onClick} aria-label={`View ${name}'s story`}>
      <span className={active ? "story-ring active" : "story-ring"}>
        {image ? <img src={image} alt="" /> : name[0]}
      </span>
      <small>{name}</small>
    </button>
  );
}
