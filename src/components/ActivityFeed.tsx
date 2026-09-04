import { formatClock } from "@/lib/game";
import type { FeedEntry } from "@/lib/types";

/* El registro de imprenta: qué se ha marcado y qué ha entrado en caja. */

export default function ActivityFeed({
  entries,
  timeZone,
}: {
  entries: FeedEntry[];
  timeZone: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-ink-60">
        Aquí saldrá cada marca del grupo, con su hora y lo que aportó.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-baseline gap-2.5 border-b border-[var(--ink-12)] py-2 last:border-0"
        >
          <span className="num shrink-0 text-xs text-ink-35">{formatClock(entry.created_at, timeZone)}</span>
          <span aria-hidden="true">{entry.habitEmoji}</span>
          <span className="min-w-0 flex-1 text-sm">
            <span className={entry.isMe ? "font-semibold" : ""}>{entry.personName}</span>
            <span className="text-ink-60"> · {entry.habitName}</span>
            {entry.streak > 1 ? <span className="num text-xs text-ink-35"> ×{entry.streak}</span> : null}
          </span>
          <span className="num shrink-0 text-xs text-[var(--green)]">+{entry.coins_awarded}</span>
        </li>
      ))}
    </ul>
  );
}
