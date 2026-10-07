/**
 * The encounter screen's own UI state (not a document): who's selected, the map tool, and an area
 * or square being aimed on the map for an action that's being composed.
 */

import type { SpellArea } from "srd-rules-engine";
import { create } from "zustand";

export type MapTool =
  | "select"
  | "move"
  | "place"
  | "measure"
  | "walls"
  | "difficult"
  | "blocked"
  | "clear"
  | "ping";

export interface Aiming {
  /** Who acts (the area's origin). */
  readonly actor: string;
  readonly area: SpellArea;
  /** Sphere, Cylinder and Cube take a point; Cone and Line a square to aim toward. */
  readonly mode: "point" | "toward";
  /** Pick grid corners instead of squares (a wall between squares). */
  readonly corner?: boolean;
  readonly onPick: (square: { x: number; y: number }) => void;
}

interface TableUi {
  selected: string | null;
  /** The user picked `selected` by hand; otherwise it follows whose turn it is. */
  pinned: boolean;
  tool: MapTool;
  aiming: Aiming | null;
  /** Squares to highlight (reach or range of the option being composed). */
  highlight: readonly string[];
  /** Combatants an option can target, highlighted on the map. */
  candidates: readonly string[];
  ping: { x: number; y: number; at: number } | null;
  /** While an action is being composed, clicking a token picks it as a target. */
  onToken: ((id: string) => void) | null;
  select(id: string | null, pinned?: boolean): void;
  setTool(tool: MapTool): void;
  aim(aiming: Aiming | null): void;
  setHighlight(squares: readonly string[], candidates?: readonly string[]): void;
  setPing(square: { x: number; y: number } | null): void;
}

export const useTableUi = create<TableUi>()((set) => ({
  selected: null,
  pinned: false,
  tool: "select",
  aiming: null,
  highlight: [],
  candidates: [],
  ping: null,
  onToken: null,
  select(id, pinned = true) {
    set({ selected: id, pinned });
  },
  setTool(tool) {
    set({ tool, aiming: null });
  },
  aim(aiming) {
    set({ aiming });
  },
  setHighlight(highlight, candidates = []) {
    set({ highlight, candidates });
  },
  setPing(square) {
    set({ ping: square ? { ...square, at: Date.now() } : null });
  },
}));

/**
 * Sides are colours: the sides the party's characters are on are drawn blue (allies), every
 * other side red. Only a colour: who may target whom is the engine's.
 */
export function alliedSides(view: {
  readonly combatants: readonly { readonly side: string; readonly character: string | null }[];
}): ReadonlySet<string> {
  return new Set(view.combatants.filter((c) => c.character !== null).map((c) => c.side));
}
