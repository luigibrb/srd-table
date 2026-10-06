/**
 * Play actions from one part of the sheet: send them through the store (the engine's
 * `applyAction`), and keep the refusal reasons to show right there.
 */

import { useState } from "react";
import type { PlayAction } from "srd-rules-engine";
import { useDocuments } from "@/store/documents";

export function usePlay(id: string) {
  const playAction = useDocuments((s) => s.playAction);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function act(action: PlayAction | readonly PlayAction[]): Promise<boolean> {
    setBusy(true);
    try {
      const result = await playAction(id, action);
      setReasons(result.ok ? null : result.reasons);
      return result.ok;
    } finally {
      setBusy(false);
    }
  }
  return { act, reasons, busy, clear: () => setReasons(null) };
}
