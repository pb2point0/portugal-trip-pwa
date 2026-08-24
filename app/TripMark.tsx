type TripMarkProps = { className?: string };

export default function TripMark({ className = 'trip-mark' }: TripMarkProps) {
  return <span className={className} aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <circle className="trip-mark-sun" cx="31.5" cy="16.5" r="4.5"/>
      <path className="trip-mark-ray" d="M31.5 7.5v3M31.5 22.5v3M22.5 16.5h3M37.5 16.5h3"/>
      <path className="trip-mark-wave" d="M7 27c5-5 10-5 15 0s10 5 19-1"/>
      <path className="trip-mark-wave trip-mark-wave-soft" d="M7 34c5-4 10-4 15 0s10 4 19-1"/>
    </svg>
  </span>;
}
