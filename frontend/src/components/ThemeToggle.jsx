import { HiMoon, HiSun } from "react-icons/hi";
import { useTheme } from "../context/ThemeContext";
export default function ThemeToggle() { const { theme, toggleTheme } = useTheme(); return <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label="Toggle colour theme">{theme === "dark" ? <HiSun /> : <HiMoon />}</button>; }
