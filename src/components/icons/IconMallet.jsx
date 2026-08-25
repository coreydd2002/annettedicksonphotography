export default function IconMallet(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="2.5"
        y="2.5"
        width="10"
        height="7"
        rx="1.4"
        transform="rotate(-45 7.5 6)"
      />
      <line x1="11" y1="9.5" x2="21" y2="19.5" />
    </svg>
  );
}
