import { useTheme } from "../theme";

/**
 * Decorative "water" background for the Monet theme: a handful of large,
 * blurred, slowly drifting color blobs, evoking light moving across water.
 * Purely decorative (aria-hidden, no pointer events), renders nothing for
 * every other theme. Must be mounted inside a `relative z-0` ancestor so
 * its negative z-index is scoped to that ancestor's own background rather
 * than escaping to the document root.
 */
export default function WaterOverlay() {
  const { theme } = useTheme();
  if (theme !== "monet") return null;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="water-blob water-blob-a" />
      <div className="water-blob water-blob-b" />
      <div className="water-blob water-blob-c" />
      <div className="water-blob water-blob-d" />
    </div>
  );
}
