/**
 * A decision after a roll (`encounter.pending`): Bardic Inspiration, Legendary Resistance, Uncanny
 * Dodge, a forced zone save. The question shows the roll; the engine's recommendation is
 * pre-selected, never applied on its own. Whoever controls that combatant answers (`decide`);
 * everyone else sees that the table is waiting.
 */

import { useState } from "react";
import type { Pending } from "srd-rules-engine";
import { Icon } from "@/components/Icon";
import { Button, Dialog, Reasons } from "@/components/ui";
import { t } from "@/i18n";
import { useDocuments } from "@/store/documents";

export function DecisionDialog({
  encounterId,
  pending,
  who,
  canAnswer,
}: {
  encounterId: string;
  pending: Pending;
  who: string;
  canAnswer: boolean;
}) {
  const send = useDocuments((s) => s.encounterAction);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(use: boolean) {
    setBusy(true);
    try {
      const result = await send(encounterId, { type: "decide", use });
      setReasons(result.ok ? null : result.reasons);
    } finally {
      setBusy(false);
    }
  }

  if (!canAnswer) {
    return (
      <div role="status" className="panel flex items-center gap-2 border-l-4 border-l-orange p-3">
        <Icon name="hourglass" className="text-orange" />
        <span>
          {t("table.pending")} · {t("table.decisionFor", { name: who })}
        </span>
      </div>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={() => undefined}
      title={t("table.decisionFor", { name: who })}
      footer={
        <>
          <Button
            autoFocus={!pending.recommended}
            on={!pending.recommended}
            disabled={busy}
            onClick={() => void decide(false)}
          >
            {t("table.decisionSkip")}
            {!pending.recommended && (
              <span className="text-[13px] text-ink-muted">· {t("table.recommended")}</span>
            )}
          </Button>
          <Button
            variant="primary"
            icon="check"
            autoFocus={pending.recommended}
            disabled={busy}
            onClick={() => void decide(true)}
          >
            {t("table.decisionUse")}
            {pending.recommended && <span className="text-[13px]">· {t("table.recommended")}</span>}
          </Button>
        </>
      }
    >
      <p className="font-display text-lg">{pending.question}</p>
      <Reasons reasons={reasons} className="mt-2" />
    </Dialog>
  );
}
