"use client";

import { Languages } from "lucide-react";
import { Locale, locales } from "@/i18n/config";
import { setLocale } from "@/services/locale";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

const LanguagesDropdown = () => {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const handleChangeLanguage = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    await setLocale(nextLocale);

    router.refresh();
  };

  return (
    <div className="fixed z-10 top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"link"} className="liquid-glass2">
            <Languages />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-transparent liquid-glass2">
          {locales.map((itemLocale) => (
            <DropdownMenuItem
              key={itemLocale}
              active={locale === itemLocale}
              className="text-[12px] cursor-pointer"
              onClick={() => handleChangeLanguage(itemLocale)}
            >
              {itemLocale === "vi" ? "🇻🇳" : "🇺🇸"} <span>{t(itemLocale)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LanguagesDropdown;
