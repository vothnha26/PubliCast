import { useEffect, useRef } from "react";

/**
 * Returns a ref to attach to a dropdown/popover's wrapper element; calls
 * onOutsideClick when a mousedown lands outside that element while active
 * is true. Pass active (not just a static true) so the listener is only
 * registered while the panel is actually open — same pattern already used
 * ad-hoc in AccountMenu.jsx, PlannerLayout.jsx, etc., extracted here so new
 * dropdowns don't have to reimplement it.
 */
export function useClickOutside(active, onOutsideClick) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutsideClick();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active, onOutsideClick]);

  return ref;
}
