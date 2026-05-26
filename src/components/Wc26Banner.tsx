import "./Wc26Banner.css";

const SRC: Record<"screen" | "hero", string> = {
  screen: "/banners/banner-3.webp",
  hero: "/banners/banner-2.png",
};

interface Props {
  variant?: "screen" | "hero";
}

export default function Wc26Banner({ variant = "screen" }: Props) {
  return (
    <div className={`wc26-banner wc26-banner--${variant}`}>
      <img src={SRC[variant]} alt="" aria-hidden="true" />
    </div>
  );
}
