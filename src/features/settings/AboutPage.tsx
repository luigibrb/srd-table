/** About: what the app is, and the SRD's CC-BY-4.0 attribution (kept with any SRD text shown). */

import { PageTitle, Section } from "@/components/ui";
import { t } from "@/i18n";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageTitle sub={t("app.tagline")}>{t("about.title")}</PageTitle>
      <Section title={t("app.name")}>
        <p>{t("about.body")}</p>
      </Section>
      <Section title="SRD 5.2.1 · CC-BY-4.0">
        <p className="mb-2">{t("about.attribution")}</p>
        <p className="text-ink-muted">{t("about.notAffiliated")}</p>
      </Section>
    </div>
  );
}
