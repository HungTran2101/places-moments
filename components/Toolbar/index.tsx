"use client";

import { Locale, locales } from "@/i18n/config";
import { setLocale } from "@/services/locale";
import { useSystemStore } from "@/store/systemStore";
import { Clock3, Languages, Moon, Sun, Sunset } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Toolbar as ToolbarPrimitive } from "radix-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RefractiveGlass } from "../ui/refractive-glass";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const TIME_ACTIONS = [
  { value: "auto", icon: Clock3 },
  { value: "daytime", icon: Sun },
  { value: "evening", icon: Sunset },
  { value: "nighttime", icon: Moon },
] as const;

export default function Toolbar() {
  const t = useTranslations("toolbar");
  const nav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const mapTimeMode = useSystemStore((state) => state.mapTimeMode);
  const setMapTimeMode = useSystemStore((state) => state.setMapTimeMode);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const SelectedTimeIcon = TIME_ACTIONS.find((action) => action.value === mapTimeMode)?.icon ?? Clock3;

  const handleChangeLanguage = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    await setLocale(nextLocale);
    router.refresh();
  };

  return (
    <RefractiveGlass
      glassThickness={50}
      bezelWidth={10}
    >
      <ToolbarPrimitive.Root
        className="Toolbar"
        orientation="vertical"
        aria-label={t("label")}
        data-sidebar-open={sidebarOpen}
        loop
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* ID cố định cho menu duy nhất để giữ liên kết ARIA ổn định khi hydrate. */}
              <DropdownMenuTrigger asChild id="languages-menu-trigger" aria-controls="languages-menu-content">
                <ToolbarPrimitive.Button className="Toolbar-action" aria-label={t("language")}>
                  <Languages aria-hidden="true" />
                </ToolbarPrimitive.Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10}>{t("language")}</TooltipContent>
          </Tooltip>
          <RefractiveGlass>
            <DropdownMenuContent
              id="languages-menu-content"
              aria-labelledby="languages-menu-trigger"
              className="Toolbar-menu"
              side="left"
              align="start"
              sideOffset={10}
            >
              {locales.map((itemLocale) => (
                <DropdownMenuItem
                  key={itemLocale}
                  active={locale === itemLocale}
                  onClick={() => handleChangeLanguage(itemLocale)}
                >
                  <span aria-hidden="true">{itemLocale === "vi" ? "🇻🇳" : "🇺🇸"}</span>
                  <span>{nav(itemLocale)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </RefractiveGlass>
        </DropdownMenu>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild id="time-menu-trigger" aria-controls="time-menu-content">
                <ToolbarPrimitive.Button className="Toolbar-action" aria-label={t("time")}>
                  <SelectedTimeIcon aria-hidden="true" />
                </ToolbarPrimitive.Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10}>{t("time")}: {t(mapTimeMode)}</TooltipContent>
          </Tooltip>
          <RefractiveGlass>
            <DropdownMenuContent
              id="time-menu-content"
              aria-labelledby="time-menu-trigger"
              className="Toolbar-menu"
              side="left"
              align="start"
              sideOffset={10}
            >
              <DropdownMenuRadioGroup
                value={mapTimeMode}
                onValueChange={(value) => {
                  const action = TIME_ACTIONS.find((item) => item.value === value);
                  if (action) setMapTimeMode(action.value);
                }}
              >
                {TIME_ACTIONS.map(({ value, icon: Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon aria-hidden="true" />
                    <span>{t(value)}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </RefractiveGlass>
        </DropdownMenu>
      </ToolbarPrimitive.Root>
    </RefractiveGlass>
  );
}
