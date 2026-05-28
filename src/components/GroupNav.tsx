import "./GroupNav.css";
import { useEffect, useRef, useState } from "react";

interface Props {
  groups: string[];
}

export default function GroupNav({ groups }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const entries = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          const id = entry.target.id.replace("group-", "");
          entries.set(id, entry.intersectionRatio);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of entries) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      { threshold: [0, 0.1, 0.3, 0.5], rootMargin: "-64px 0px 0px 0px" },
    );

    for (const g of groups) {
      const el = document.getElementById(`group-${g}`);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [groups]);

  const scrollTo = (g: string) => {
    const el = document.getElementById(`group-${g}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(g);
    }
  };

  return (
    <div className="group-nav">
      <div className="group-nav__inner">
        {groups.map((g) => (
          <button
            key={g}
            className={`group-nav__chip${active === g ? " group-nav__chip--active" : ""}`}
            onClick={() => scrollTo(g)}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
