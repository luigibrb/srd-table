/**
 * Choices you can change after a rest (prepared spells, Weapon Mastery…): today's picks live in
 * the play state (`set_choice`, `reset_choice`) and replace the build's while playing.
 */

import { Button, Reasons, Section } from "@/components/ui";
import type { ChoiceView } from "@/engine/facade";
import { t } from "@/i18n";
import { useBuildView } from "@/queries";
import { useDocuments } from "@/store/documents";
import { ChoiceCard } from "../builder/ChoiceCard";
import { usePlay } from "./usePlay";

export function RestChoices({ id }: { id: string }) {
  const { data: view } = useBuildView(id);
  const state = useDocuments((s) => s.characters[id]?.state);
  const { act, reasons } = usePlay(id);
  if (!view || !state) return null;
  const choices = view.choices.filter((c) => c.rest_change !== null);
  if (choices.length === 0) return null;
  return (
    <Section
      title={t("sheet.prepared")}
      actions={<span className="text-[13px] text-ink-muted">{t("sheet.preparedHint")}</span>}
    >
      <Reasons reasons={reasons} className="mb-2" />
      <div className="space-y-3">
        {choices.map((c) => {
          const today = state.choices[c.key];
          const choice: ChoiceView = today ? { ...c, selected: today } : c;
          return (
            <div key={c.key}>
              <ChoiceCard
                choice={choice}
                onPick={async (values) => {
                  // A refusal shows above, with the section's other reasons.
                  await act({ type: "set_choice", key: c.key, values: [...values] });
                  return null;
                }}
              />
              {today && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="undo"
                  className="mt-1"
                  onClick={() => void act({ type: "reset_choice", key: c.key })}
                >
                  {t("sheet.resetPicks")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
