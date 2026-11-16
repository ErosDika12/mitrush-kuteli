/** Tiny helpers to keep filter state in the URL query string. */
export function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function writeParams(values: Record<string, string>, push = false): void {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) p.set(k, v);
  const qs = p.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  if (url === window.location.pathname + window.location.search + window.location.hash) return;
  (push ? history.pushState : history.replaceState).call(history, null, '', url);
}
