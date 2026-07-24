import { HiMoon, HiSun } from "react-icons/hi";
import { useTheme } from "../context/ThemeContext";
export default function ThemeToggle({ onToggle }) { const { theme, toggleTheme } = useTheme(); return <button className="icon-button theme-toggle" onClick={() => { onToggle?.(); toggleTheme(); }} aria-label="Toggle colour theme">{theme === "dark" ? <HiSun /> : <HiMoon />}</button>; }
