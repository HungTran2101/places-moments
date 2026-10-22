"use client";

import { Languages } from "lucide-react";
import { Locale, locales } from "@/i18n/config";
import { setLocale } from "@/services/locale";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { RefractiveGlass } from "@/components/ui/refractive-glass";

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
        <RefractiveGlass>
          {/* Menu chỉ có một bản trên trang; dùng ID cố định để tránh lỗi useId khi hydrate ở Next.js 16.1. */}
          <DropdownMenuTrigger asChild id="languages-menu-trigger" aria-controls="languages-menu-content">
            <Button variant={"link"}>
              <Languages />
            </Button>
          </DropdownMenuTrigger>
        </RefractiveGlass>
        <RefractiveGlass>
          <DropdownMenuContent id="languages-menu-content" aria-labelledby="languages-menu-trigger" align="end">
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
        </RefractiveGlass>
      </DropdownMenu>
    </div>
  );
};

export default LanguagesDropdown;
