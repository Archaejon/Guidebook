import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageTitle } from '../lib/pageTitle';

/**
 * Keeps the browser tab in step with the page heading, so several open pages
 * are distinguishable in a tab strip. Mounted once in `App` rather than in
 * `Layout`, because the reader view renders outside the layout and still needs
 * a title.
 */
export function RouteTitle() {
  const location = useLocation();
  useEffect(() => {
    const apply = () => {
      document.title = pageTitle(document.querySelector('h1')?.textContent);
    };
    apply();
    // Headings that depend on loaded records land one frame after the route change.
    const frame = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search]);
  return null;
}
