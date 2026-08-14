export default function FloralDivider({ className = "" }) {
  return (
    <svg
      className={`floral-divider ${className}`}
      viewBox="0 0 160 40"
      width="160"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8,20 C40,6 60,34 80,20 C100,6 120,34 152,20" />
      <path
        d="M32,13 C35,8 41,8 44,13 C41,18 35,18 32,13 Z"
        transform="rotate(-18 38 13)"
      />
      <path
        d="M116,13 C119,8 125,8 128,13 C125,18 119,18 116,13 Z"
        transform="rotate(18 122 13)"
      />
      <circle cx="80" cy="20" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
