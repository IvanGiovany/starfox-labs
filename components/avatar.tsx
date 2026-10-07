import Image from "next/image";
import { avatarUrl, initialOf } from "@/lib/avatars";

// A round profile picture, or the name's first letter on the raised card
// colour when there's no picture. Decorative (alt=""): the name is always
// written next to it or in its button's label.
export function Avatar({ name, path, size }: { name: string; path: string | null; size: number }) {
  const url = avatarUrl(path);
  const box = { width: size, height: size };
  if (url) {
    return <Image src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={box} />;
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-bg-raised font-medium text-fg"
      style={{ ...box, fontSize: Math.round(size * 0.45) }}
    >
      {initialOf(name)}
    </span>
  );
}
