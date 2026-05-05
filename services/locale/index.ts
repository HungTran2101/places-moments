import { Locale } from "@/i18n/config";
import { ApiRequestOptions, apiRequest } from "@/services/shared/api";

export interface SetLocaleResponse {
  ok: boolean;
}

export function setLocale(locale: Locale, options?: ApiRequestOptions) {
  return apiRequest<SetLocaleResponse>("/api/locale", {
    ...options,
    method: "POST",
    body: { locale },
  });
}
