import { useEffect, useState } from "react";

/* A list kept in localStorage — stand-in storage for master data that has no
   backend endpoint yet. Swap for apiFetch calls once the API exists. */
export default function useLocalList(key, seed = []) {
  const [list, setList] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      /* storage unavailable or corrupt — fall back to the seed */
    }
    return typeof seed === "function" ? seed() : seed;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* storage full or blocked — keep working in memory */
    }
  }, [key, list]);

  return [list, setList];
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
