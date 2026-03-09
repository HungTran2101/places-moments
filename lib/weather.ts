export interface WeatherResult {
  summary: string;
  code: number;
}

// WMO Weather Interpretation Codes → atmospheric prose
const WEATHER_PROSE: Record<number, string> = {
  0: "on a clear, still day",
  1: "on a mostly clear day",
  2: "on a partly cloudy afternoon",
  3: "beneath heavy overcast skies",
  45: "in a soft fog",
  48: "in a thick, icy fog",
  51: "in a gentle drizzle",
  53: "in a steady drizzle",
  55: "in a dense drizzle",
  61: "during a light rain shower",
  63: "during a steady rain",
  65: "during a heavy downpour",
  71: "in light snowfall",
  73: "in steady snow",
  75: "in a heavy snowstorm",
  80: "during a brief rain shower",
  81: "during passing showers",
  82: "during a heavy rain burst",
  95: "during a thunderstorm",
  99: "during a violent storm",
};

function weatherCodeToProse(code: number): string {
  return WEATHER_PROSE[code] ?? "on an ordinary day";
}

/**
 * Fetches weather data from the Open-Meteo API (free, no key required).
 * Returns an atmospheric narrative string and the raw WMO code.
 */
export async function fetchWeatherAtmosphere(
  lat: number,
  lng: number
): Promise<WeatherResult> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toFixed(6));
    url.searchParams.set("longitude", lng.toFixed(6));
    url.searchParams.set("current", "weather_code");
    url.searchParams.set("forecast_days", "1");

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });

    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

    const data = await res.json();
    const code: number = data?.current?.weather_code ?? 0;
    const summary = `Posted ${weatherCodeToProse(code)}.`;

    return { summary, code };
  } catch {
    return { summary: "Posted on a quiet day.", code: 0 };
  }
}
