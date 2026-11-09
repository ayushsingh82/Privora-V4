/** Two tokens trading; the overlap is cut out, the part kept private. */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#ccff00" />
      <circle cx="12.2" cy="16" r="7.6" fill="#000"/>
      <circle cx="19.8" cy="16" r="7.6" fill="#000"/>
      <path d="M16 9.42A7.6 7.6 0 0 1 16 22.58A7.6 7.6 0 0 1 16 9.42Z" fill="#ccff00"/>
    </svg>
  );
}
