import { HiArrowLeft } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
export default function BackButton({ fallback = "/home", label = "Back" }) { const navigate = useNavigate(); return <button className="back-button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate(fallback)}><HiArrowLeft /> {label}</button>; }
