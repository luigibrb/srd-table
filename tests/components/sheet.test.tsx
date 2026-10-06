import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocuments } from "../../src/store/documents";
import { fighter } from "../fixtures/characters";
import { installTestEngine, renderApp, resetStores } from "../helpers/app";

const engine = installTestEngine(9);
beforeEach(resetStores);

async function storedFighter() {
  const result = await useDocuments.getState().importCharacter(await fighter(engine, 3));
  if (!result.ok) throw new Error(result.reasons.join("; "));
  return result.id;
}

describe("sheet", () => {
  it("explains its numbers", async () => {
    const id = await storedFighter();
    await renderApp(`/characters/${id}/sheet`);
    const ac = await screen.findByRole("button", { name: /^AC 16 = / }, { timeout: 10_000 });
    expect(ac.getAttribute("aria-label")).toMatch(/Chain Mail/);
  });

  it("applies damage through the engine and shows the new HP", async () => {
    const id = await storedFighter();
    await renderApp(`/characters/${id}/sheet`);
    const hp = await screen.findByRole("region", { name: "Hit Points" }, { timeout: 10_000 });
    await userEvent.type(within(hp).getByPlaceholderText("Amount"), "5");
    await userEvent.click(within(hp).getByRole("button", { name: "Damage" }));
    await waitFor(() => expect(useDocuments.getState().characters[id]?.state.hp.current).toBe(23));
    expect(await within(hp).findByText("23")).toBeInTheDocument();
  });

  it("shows the engine's refusal where the player acted", async () => {
    const id = await storedFighter();
    await renderApp(`/characters/${id}/sheet?tab=combat`);
    const features = await screen.findByRole(
      "region",
      { name: "Features used in turns" },
      { timeout: 10_000 },
    );
    const surge = within(features).getAllByRole("button", { name: "Use" })[1] as HTMLElement;
    await userEvent.click(surge);
    await waitFor(() =>
      expect(useDocuments.getState().characters[id]?.state.uses_spent["fighter:action-surge"]).toBe(
        1,
      ),
    );
    await userEvent.click(surge);
    expect(await within(features).findByRole("alert")).toHaveTextContent(/Action Surge/);
    expect(useDocuments.getState().characters[id]?.state.uses_spent["fighter:action-surge"]).toBe(
      1,
    );
  });

  it("takes a Short Rest spending Hit Point Dice the engine rolls", async () => {
    const id = await storedFighter();
    await useDocuments.getState().playAction(id, { type: "damage", amount: 10 });
    await renderApp(`/characters/${id}/sheet`);
    await userEvent.click(
      await screen.findByRole("button", { name: "Short Rest" }, { timeout: 10_000 }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Spend a d10" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(useDocuments.getState().characters[id]?.state.hit_dice_spent["10"]).toBe(1),
    );
    expect(useDocuments.getState().characters[id]?.state.hp.current).toBeGreaterThan(18);
  });
});
