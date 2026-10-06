/** The sheet's tabs, in order (the route validates `?tab=` against them). */
export const SHEET_TABS = ["overview", "combat", "spells", "inventory", "features"] as const;
export type SheetTab = (typeof SHEET_TABS)[number];
