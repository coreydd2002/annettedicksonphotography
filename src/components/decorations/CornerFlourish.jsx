const ORIENTATION = {
  "top-left": "none",
  "top-right": "scaleX(-1)",
  "bottom-left": "scaleY(-1)",
  "bottom-right": "scale(-1, -1)",
};

export default function CornerFlourish({
  corner = "top-left",
  size = 48,
  className = "",
}) {
  return (
    <svg
      className={`corner-flourish corner-flourish-${corner} ${className}`}
      style={{ transform: ORIENTATION[corner] }}
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4,4 C4,22 10,34 26,40 C36,44 44,42 52,46" />
      <path d="M10,16 C14,12 20,12 22,17 C20,22 14,22 10,16 Z" />
      <path d="M18,30 C22,26 28,27 29,32 C27,37 21,36 18,30 Z" />
    </svg>
  );
}
