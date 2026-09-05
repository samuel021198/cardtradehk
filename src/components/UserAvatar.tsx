type UserAvatarProps = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl sm:h-28 sm:w-28",
};

export function UserAvatar({ name, src, size = "md", className = "" }: UserAvatarProps) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent)] font-black text-black ${SIZES[size]} ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
