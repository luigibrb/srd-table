/** A virtualized list for long catalog lists (spells, monsters, items). */

import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";
import { cx } from "./ui";

export function VirtualList<T>({
  items,
  estimate = 44,
  render,
  getKey,
  className,
  label,
}: {
  items: readonly T[];
  estimate?: number;
  render: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
  label?: string;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    estimateSize: () => estimate,
    overscan: 8,
    // Before the first measurement (and in tests), assume a screenful.
    initialRect: { width: 800, height: 900 },
    getItemKey: (index) => getKey(items[index] as T, index),
  });
  return (
    <div ref={parent} className={cx("overflow-y-auto", className)}>
      <ul aria-label={label} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <li
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            {render(items[row.index] as T, row.index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
