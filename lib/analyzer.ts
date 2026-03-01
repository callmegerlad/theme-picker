export type ThemeAnalysis = {
  sourceUrl: string;
  title: string;
  fonts: string[];
  colors: string[];
  mood: "light" | "dark" | "mixed";
  confidence: number;
};

const COLOR_PATTERN = /#(?:[a-fA-F0-9]{3,8})\b|rgba?\([^\)]*\)|hsla?\([^\)]*\)/g;
const LINK_STYLESHEET_PATTERN = /<link[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi;
const HREF_PATTERN = /href=["']([^"']+)["']/i;

function cleanFontToken(token: string): string {
  return token
    .trim()
    .replace(/^['\"]+|['\"]+$/g, "")
    .replace(/\s+/g, " ");
}

function normalizeColor(color: string): string {
  return color.trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueTop(values: string[], cap = 10): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= cap) break;
  }

  return result;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || "Untitled Website";
}

function extractFonts(cssText: string): string[] {
  const fonts: string[] = [];
  const fontFamilyPattern = /font-family\s*:\s*([^;}{]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = fontFamilyPattern.exec(cssText)) !== null) {
    const fontList = match[1]
      .split(",")
      .map(cleanFontToken)
      .filter(Boolean)
      .filter((font) => !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(font));

    fonts.push(...fontList);
  }

  return uniqueTop(fonts, 8);
}

function extractColors(cssText: string): string[] {
  const colors = cssText.match(COLOR_PATTERN)?.map(normalizeColor) ?? [];
  return uniqueTop(colors, 12);
}

function inferMood(colors: string[]): { mood: ThemeAnalysis["mood"]; confidence: number } {
  if (colors.length === 0) {
    return { mood: "mixed", confidence: 0.2 };
  }

  let darkCount = 0;
  let lightCount = 0;

  for (const color of colors) {
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const expanded =
        hex.length === 3
          ? hex
              .split("")
              .map((x) => x + x)
              .join("")
          : hex.slice(0, 6);

      if (expanded.length !== 6) continue;

      const r = Number.parseInt(expanded.slice(0, 2), 16);
      const g = Number.parseInt(expanded.slice(2, 4), 16);
      const b = Number.parseInt(expanded.slice(4, 6), 16);
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luminance < 96) darkCount += 1;
      if (luminance > 180) lightCount += 1;
    }
  }

  const total = darkCount + lightCount;
  if (total === 0) return { mood: "mixed", confidence: 0.35 };

  const balance = Math.abs(darkCount - lightCount) / total;

  if (darkCount > lightCount) return { mood: "dark", confidence: 0.45 + balance * 0.5 };
  if (lightCount > darkCount) return { mood: "light", confidence: 0.45 + balance * 0.5 };

  return { mood: "mixed", confidence: 0.5 };
}

function resolveStylesheetUrls(baseUrl: string, html: string): string[] {
  const links = html.match(LINK_STYLESHEET_PATTERN) ?? [];
  const resolved: string[] = [];

  for (const link of links) {
    const href = link.match(HREF_PATTERN)?.[1];
    if (!href) continue;

    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.protocol === "http:" || absolute.protocol === "https:") {
        resolved.push(absolute.toString());
      }
    } catch {
      continue;
    }
  }

  return uniqueTop(resolved, 6);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ThemeSnapshotBot/1.0)",
      Accept: "text/html,text/css,application/xhtml+xml"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  return response.text();
}

export async function analyzeWebsiteTheme(rawUrl: string): Promise<ThemeAnalysis> {
  const parsedUrl = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("URL must start with http:// or https://");
  }

  const html = await fetchText(parsedUrl.toString());
  const stylesheetUrls = resolveStylesheetUrls(parsedUrl.toString(), html);

  const externalStyles = await Promise.all(
    stylesheetUrls.map(async (sheetUrl) => {
      try {
        return await fetchText(sheetUrl);
      } catch {
        return "";
      }
    })
  );

  const combinedCssSource = [html, ...externalStyles].join("\n");
  const fonts = extractFonts(combinedCssSource);
  const colors = extractColors(combinedCssSource);
  const { mood, confidence } = inferMood(colors);

  return {
    sourceUrl: parsedUrl.toString(),
    title: extractTitle(html),
    fonts,
    colors,
    mood,
    confidence: Number(confidence.toFixed(2))
  };
}
