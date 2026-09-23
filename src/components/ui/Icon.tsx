/** Renders a design-token icon: an array of SVG path `d` strings on a 24x24 viewBox, stroke-only — matches the approved design's icon markup exactly (dc.html's inline `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">`). */
export function Icon({ paths, size = 14 }: { paths: string[]; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
