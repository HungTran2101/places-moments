"use client";

import { GlassButton } from "@/components/ui/glass-button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";

const ruleKeys = ["personal", "feelings", "place", "care"] as const;
const avoidKeys = ["privacy", "attacks", "harm", "spam"] as const;

export default function ThoughtGuidelines() {
  const t = useTranslations("guidance");

  return (
    <Dialog.Root>
      <p className="sidebar-guidance-care">
        {t.rich("care", {
          purpose: (chunks) => (
            <Dialog.Trigger asChild>
              <button type="button" className="thoughtGuidelines-trigger">{chunks}</button>
            </Dialog.Trigger>
          ),
        })}
      </p>
      <Dialog.Portal>
        <Dialog.Overlay className="thoughtGuidelines-overlay" />
        <Dialog.Content className="thoughtGuidelines-content liquid-glass2">
          <div className="thoughtGuidelines-header">
            <Dialog.Title className="thoughtGuidelines-title">{t("rules.title")}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="thoughtGuidelines-close" aria-label={t("rules.close")}>
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className="thoughtGuidelines-body">
            <Dialog.Description className="thoughtGuidelines-description">{t("rules.description")}</Dialog.Description>
            <section aria-labelledby="thought-guidelines-should">
              <h3 id="thought-guidelines-should">{t("rules.shouldTitle")}</h3>
              <ul>
                {ruleKeys.map((key) => <li key={key}>{t(`rules.should.${key}`)}</li>)}
              </ul>
            </section>
            <section aria-labelledby="thought-guidelines-avoid">
              <h3 id="thought-guidelines-avoid">{t("rules.avoidTitle")}</h3>
              <ul>
                {avoidKeys.map((key) => <li key={key}>{t(`rules.avoid.${key}`)}</li>)}
              </ul>
            </section>
          </div>
          <div className="thoughtGuidelines-footer">
            <Dialog.Close asChild>
              <GlassButton type="button" primaryColor="darkBlue">{t("rules.dismiss")}</GlassButton>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
