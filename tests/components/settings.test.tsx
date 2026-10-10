import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "../../src/i18n";
import { useSettings } from "../../src/store/settings";
import { installTestEngine, renderApp, resetStores } from "../helpers/app";

installTestEngine(3);
beforeEach(resetStores);
afterEach(() => setLocale("en"));

describe("settings", () => {
  it("switches the app's language, and the whole app follows", async () => {
    await renderApp("/settings");
    await userEvent.click(
      await screen.findByRole("button", { name: "Italiano" }, { timeout: 10_000 }),
    );
    expect(useSettings.getState().settings.locale).toBe("it");
    expect(await screen.findByRole("heading", { name: "Impostazioni" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Personaggi" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });
});
