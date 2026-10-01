"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/badge";
import { deleteItem, reorderItems, setItemStatus, type ListActionResult } from "@/lib/admin/items/list-actions";
import type { ItemSectionKey } from "@/lib/admin/items/sections";
import { localToday } from "@/lib/format";
import { matchesAll, normalize, toTerms } from "@/lib/search";

// A section's items in the admin: search, a status filter, one-tap Publish /
// Unpublish / Delete, and (for sections ordered by hand) drag to reorder.
// Dragging uses a handle that works with a mouse, touch and the keyboard; the
// ↑ / ↓ buttons do the same in one tap.

export type ItemListRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  imageUrl: string | null;
  /** A short line under the title, e.g. a project's stack. */
  detail: string;
  badges: string[];
  showOnHome: boolean;
  cardSize: "small" | "wide";
  /** The section's own status, e.g. "READING" or "PLAYING". */
  stateBadge?: string;
  /** A one-tap next step, e.g. { label: "Mark as read", value: "read" }. */
  quickStep?: { label: string; value: string } | null;
};

/** Runs a row's quick step: a server action passed in by the section's page. */
export type QuickAction = (id: string, value: string, today: string) => Promise<ListActionResult>;

type Filter = "all" | "draft" | "published";

export function ItemList({
  sectionKey,
  singular,
  rows,
  order,
  quickAction,
}: {
  sectionKey: ItemSectionKey;
  singular: string;
  rows: ItemListRow[];
  order: "manual" | "automatic";
  quickAction?: QuickAction;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  // The order shown while a new order is being saved; null shows the server's order.
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dndId = useId(); // stable ids for dnd-kit's accessibility text, so server and browser agree

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      published: rows.filter((r) => r.status === "published").length,
    }),
    [rows],
  );

  const ordered = useMemo(() => {
    if (!pendingOrder) return rows;
    const byId = new Map(rows.map((r) => [r.id, r]));
    return pendingOrder.map((id) => byId.get(id)).filter((r): r is ItemListRow => Boolean(r));
  }, [rows, pendingOrder]);

  const terms = toTerms(query);
  const visible = ordered.filter(
    (row) =>
      (filter === "all" || row.status === filter) &&
      (terms.length === 0 || matchesAll(normalize(`${row.title} ${row.detail} ${row.badges.join(" ")}`), terms)),
  );
  // Reordering a filtered list would be ambiguous, so it's only offered on the full list.
  const canReorder = order === "manual" && filter === "all" && terms.length === 0 && rows.length > 1;

  function saveOrder(ids: string[]) {
    setPendingOrder(ids); // show it at once
    setOrderError(null);
    startTransition(async () => {
      const result = await reorderItems(sectionKey, ids);
      if (!result.ok) setOrderError(result.error);
      setPendingOrder(null); // the server's order now (the new one, or the old one on failure)
    });
  }

  function move(id: string, by: -1 | 1) {
    const ids = ordered.map((r) => r.id);
    const from = ids.indexOf(id);
    const to = from + by;
    if (from === -1 || to < 0 || to >= ids.length) return;
    saveOrder(arrayMove(ids, from, to));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = ordered.map((r) => r.id);
    saveOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // What a screen reader hears while dragging: titles and positions, not ids.
  const titleOf = (id: string | number) => ordered.find((r) => r.id === id)?.title ?? "Item";
  const positionOf = (id: string | number) => ordered.findIndex((r) => r.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${positionOf(active.id)} of ${ordered.length}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over position ${positionOf(over.id)} of ${ordered.length}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${titleOf(active.id)} dropped at position ${positionOf(over.id)} of ${ordered.length}.` : undefined),
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  return (
    <div className="pb-24 sm:pb-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show" className="flex gap-1">
          {(["all", "draft", "published"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="min-h-11 cursor-pointer rounded-lg px-3 text-sm text-fg-muted hover:text-fg aria-pressed:bg-bg-raised aria-pressed:text-fg"
            >
              {f === "all" ? "All" : f === "draft" ? "Drafts" : "Published"} <span className="text-fg-muted">({counts[f]})</span>
            </button>
          ))}
        </div>
        <label className="sm:w-72">
          <span className="sr-only">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles and badges" className="field" />
        </label>
      </div>

      {order === "manual" && rows.length > 1 && !canReorder && (
        <p className="mb-3 text-sm text-fg-muted">Show all and clear the search to change the order.</p>
      )}
      {orderError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {orderError}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl bg-bg-raised px-5 py-8 text-fg-muted">
          {rows.length === 0 ? `Nothing here yet. Add your first ${singular}.` : "Nothing matches."}
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "To move this item, press Space or Enter, use the up and down arrow keys, then press Space or Enter again to drop it, or Escape to cancel.",
            },
          }}
        >
          <SortableContext items={visible.map((r) => r.id)} strategy={verticalListSortingStrategy} disabled={!canReorder}>
            <ul className="divide-y divide-rule border-y border-rule">
              {visible.map((row, index) => (
                <ItemRow
                  key={row.id}
                  row={row}
                  sectionKey={sectionKey}
                  reorderable={canReorder}
                  isFirst={index === 0}
                  isLast={index === visible.length - 1}
                  onMove={(by) => move(row.id, by)}
                  quickAction={quickAction}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function ItemRow({
  row,
  sectionKey,
  reorderable,
  isFirst,
  isLast,
  onMove,
  quickAction,
}: {
  row: ItemListRow;
  sectionKey: ItemSectionKey;
  reorderable: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (by: -1 | 1) => void;
  quickAction?: QuickAction;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !reorderable,
  });
  const published = row.status === "published";
  const editHref = `/admin/${sectionKey}/${row.id}`;

  // The delete confirmation quietly cancels itself after a few seconds.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  function run(action: () => Promise<ListActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex flex-col gap-3 bg-bg py-3 sm:flex-row sm:items-center sm:gap-4 ${pending ? "opacity-60" : ""} ${
        isDragging ? "z-10 rounded-lg shadow-lg" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {reorderable && (
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Move ${row.title}`}
              className="flex min-h-11 min-w-9 cursor-grab touch-none items-center justify-center rounded-lg text-fg-muted hover:bg-bg-raised hover:text-fg active:cursor-grabbing"
            >
              <span aria-hidden className="text-lg leading-none">
                ⠿
              </span>
            </button>
          </div>
        )}

        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-bg-raised">
          {row.imageUrl && <Image src={row.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge toneKey={published ? "read" : "learning"}>{published ? "Published" : "Draft"}</Badge>
            {row.stateBadge && <Badge>{row.stateBadge}</Badge>}
            <Link href={editHref} className="font-serif text-lg leading-snug text-fg no-underline hover:text-accent">
              {row.title}
            </Link>
          </div>
          <p className="mt-0.5 truncate text-sm text-fg-muted">
            {[row.detail, row.badges.join(", "), row.showOnHome ? "On home" : "", row.cardSize === "wide" ? "Wide card" : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {error && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-sm sm:shrink-0">
        {reorderable && (
          <>
            <button type="button" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${row.title} up`} className="row-action disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${row.title} down`} className="row-action disabled:opacity-30">
              ↓
            </button>
          </>
        )}
        {row.quickStep && quickAction && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => quickAction(row.id, row.quickStep!.value, localToday()))}
            className="row-action border border-rule"
          >
            {row.quickStep.label}
          </button>
        )}
        <Link href={editHref} className="row-action no-underline">
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setItemStatus(sectionKey, row.id, published ? "draft" : "published"))}
          className="row-action"
        >
          {published ? "Unpublish" : "Publish"}
        </button>
        {confirmingDelete ? (
          <button type="button" disabled={pending} onClick={() => run(() => deleteItem(sectionKey, row.id))} className="row-action text-danger">
            Confirm delete
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => setConfirmingDelete(true)} className="row-action">
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
