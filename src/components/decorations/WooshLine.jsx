export default function WooshLine({ className = "" }) {
  return (
    <svg
      className={`woosh-line ${className}`}
      viewBox="0 0 120 20"
      width="120"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2,14 C20,2 34,18 52,10 C68,3 84,17 98,9 C104,6 112,8 118,4" />
    </svg>
  );
}
