import { useState } from "react";
export default function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  });
  const update = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    setValue(resolved);
    try {
      localStorage.setItem(key, resolved);
    } catch {}
  };
  return [value, update];
}
