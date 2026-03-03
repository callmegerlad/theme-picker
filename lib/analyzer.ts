export type ThemeAnalysis = {
  sourceUrl: string;
  title: string;
  domain: string;
  description: string | null;
  language: string | null;
  charset: string | null;
  viewport: string | null;
  canonicalUrl: string | null;
  stylesheetCount: number;
  inlineStyleBlockCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  scriptCount: number;
  hasOpenGraph: boolean;
  hasTwitterCards: boolean;
  generator: string | null;
  mobileFriendlySignals: string[];
  fonts: string[];
  fontDetails: Array<{ name: string; count: number }>;
  colors: string[];
  colorDetails: Array<{
    value: string;
    hex: string;
    count: number;
    category: string;
    tone: "light" | "mid" | "dark";
  }>;
  colorCategories: Array<{ category: string; count: number }>;
  mood: "light" | "dark" | "mixed";
  confidence: number;
};

const COLOR_PATTERN =
  /#(?:[a-fA-F0-9]{3,8})\b|rgba?\([^\)]*\)|hsla?\([^\)]*\)|\b(?:black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|aliceblue|antiquewhite|aquamarine|azure|beige|bisque|brown|chocolate|coral|crimson|cyan|gold|indigo|ivory|khaki|lavender|magenta|orchid|pink|plum|salmon|tan|tomato|turquoise|violet|wheat)\b/gi;
const COLOR_DECLARATION_PATTERN =
  /(?:^|[;{\s])(color|background(?:-color)?|border(?:-color)?|outline-color|fill|stroke|box-shadow|text-shadow)\s*:\s*([^;}{]+)/gi;
const LINK_STYLESHEET_PATTERN = /<link[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi;
const HREF_PATTERN = /href=["']([^"']+)["']/i;
const META_PATTERN = /<meta\s+[^>]*>/gi;
const CSS_VARIABLE_PATTERN = /(--[\w-]+)\s*:\s*([^;}{]+);/gi;
const FONT_FAMILY_PATTERN = /font-family\s*:\s*([^;}{]+)/gi;
const FONT_FACE_PATTERN = /@font-face\s*{[^}]*font-family\s*:\s*([^;}{]+)[^}]*}/gi;
const GENERIC_FONT_PATTERN =
  /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i;
const IGNORE_FONT_PATTERN =
  /^(inherit|initial|unset|revert|revert-layer|normal|none|auto)$/i;
const IGNORE_COLOR_TOKENS = new Set(["transparent", "currentcolor", "inherit", "initial", "unset", "none"]);
const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  silver: "#c0c0c0",
  gray: "#808080",
  white: "#ffffff",
  maroon: "#800000",
  red: "#ff0000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  green: "#008000",
  lime: "#00ff00",
  olive: "#808000",
  yellow: "#ffff00",
  navy: "#000080",
  blue: "#0000ff",
  teal: "#008080",
  aqua: "#00ffff",
  orange: "#ffa500",
  brown: "#a52a2a",
  cyan: "#00ffff",
  gold: "#ffd700",
  indigo: "#4b0082",
  magenta: "#ff00ff",
  pink: "#ffc0cb",
  salmon: "#fa8072",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
};

type RgbColor = { r: number; g: number; b: number };

function cleanFontToken(token: string): string {
  return token
    .trim()
    .replace(/^['\"]+|['\"]+$/g, "")
    .replace(/\s+/g, " ");
}

function cleanColorToken(token: string): string {
  return token.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractMetaAttribute(tag: string, key: "name" | "property" | "content" | "charset"): string | null {
  const match = tag.match(new RegExp(`${key}=["']([^"']+)["']`, "i"));
  if (match?.[1]) return match[1].trim();
  if (key === "charset") {
    const charsetMatch = tag.match(/charset=([\w-]+)/i);
    if (charsetMatch?.[1]) return charsetMatch[1].trim();
  }
  return null;
}

function splitCsvValues(input: string): string[] {
  const values: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(depth - 1, 0);
    if (char === "," && depth === 0) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) values.push(current);
  return values;
}

function parseRgbPart(part: string): number | null {
  const value = part.trim();
  if (value.endsWith("%")) {
    const num = Number.parseFloat(value.slice(0, -1));
    if (Number.isNaN(num)) return null;
    return Math.min(255, Math.max(0, Math.round((num / 100) * 255)));
  }

  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return null;
  return Math.min(255, Math.max(0, Math.round(num)));
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: RgbColor = { r: 0, g: 0, b: 0 };

  if (h < 60) rgb = { r: c, g: x, b: 0 };
  else if (h < 120) rgb = { r: x, g: c, b: 0 };
  else if (h < 180) rgb = { r: 0, g: c, b: x };
  else if (h < 240) rgb = { r: 0, g: x, b: c };
  else if (h < 300) rgb = { r: x, g: 0, b: c };
  else rgb = { r: c, g: 0, b: x };

  return {
    r: Math.round((rgb.r + m) * 255),
    g: Math.round((rgb.g + m) * 255),
    b: Math.round((rgb.b + m) * 255),
  };
}

function toHex({ r, g, b }: RgbColor): string {
  const toPart = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toPart(r)}${toPart(g)}${toPart(b)}`;
}

function parseColorToRgb(input: string): RgbColor | null {
  const color = cleanColorToken(input);
  if (NAMED_COLORS[color]) {
    return parseColorToRgb(NAMED_COLORS[color]);
  }

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = hex.split("").map((x) => Number.parseInt(`${x}${x}`, 16));
      return { r, g, b };
    }

    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some(Number.isNaN)) return null;
      return { r, g, b };
    }
  }

  if (color.startsWith("rgb(") || color.startsWith("rgba(")) {
    const raw = color.slice(color.indexOf("(") + 1, -1).replace(/\//g, ",");
    const [rRaw, gRaw, bRaw] = splitCsvValues(raw);
    if (!rRaw || !gRaw || !bRaw) return null;
    const r = parseRgbPart(rRaw);
    const g = parseRgbPart(gRaw);
    const b = parseRgbPart(bRaw);
    if (r === null || g === null || b === null) return null;
    return { r, g, b };
  }

  if (color.startsWith("hsl(") || color.startsWith("hsla(")) {
    const raw = color.slice(color.indexOf("(") + 1, -1).replace(/\//g, ",");
    const [hRaw, sRaw, lRaw] = splitCsvValues(raw);
    if (!hRaw || !sRaw || !lRaw) return null;

    const h = ((Number.parseFloat(hRaw) % 360) + 360) % 360;
    const s = Number.parseFloat(sRaw) / 100;
    const l = Number.parseFloat(lRaw) / 100;
    if ([h, s, l].some(Number.isNaN)) return null;
    return hslToRgb(h, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l)));
  }

  return null;
}

function rgbToHsl({ r, g, b }: RgbColor): { h: number; s: number; l: number } {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) h = 60 * (((ng - nb) / delta) % 6);
    else if (max === ng) h = 60 * ((nb - nr) / delta + 2);
    else h = 60 * ((nr - ng) / delta + 4);
  }
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function categorizeColor(rgb: RgbColor): string {
  const { h, s, l } = rgbToHsl(rgb);
  if (s < 0.12 || l < 0.08 || l > 0.94) return "neutral";
  if (h < 15 || h >= 345) return "red";
  if (h < 40) return l < 0.6 ? "brown" : "orange";
  if (h < 65) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return "pink";
}

function colorTone(rgb: RgbColor): "light" | "mid" | "dark" {
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  if (luminance < 90) return "dark";
  if (luminance > 180) return "light";
  return "mid";
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

function resolveCssVar(value: string, variables: Map<string, string>, depth = 0): string {
  if (depth > 4 || !value.includes("var(")) return value;

  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_full, varName: string, fallback: string) => {
    const resolved = variables.get(varName);
    if (resolved) return resolveCssVar(resolved, variables, depth + 1);
    return fallback ? resolveCssVar(fallback, variables, depth + 1) : "";
  });
}

function extractFonts(cssText: string): { fonts: string[]; details: Array<{ name: string; count: number }> } {
  const fontCounts = new Map<string, number>();
  const cssVariables = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = CSS_VARIABLE_PATTERN.exec(cssText)) !== null) {
    const variableName = cleanFontToken(match[1]);
    const variableValue = cleanFontToken(match[2]);
    if (variableName && variableValue) cssVariables.set(variableName, variableValue);
  }

  const addFontCandidates = (rawValue: string, weight = 1) => {
    const resolved = resolveCssVar(rawValue, cssVariables);
    const candidates = splitCsvValues(resolved).map(cleanFontToken);

    for (const font of candidates) {
      const lower = font.toLowerCase();
      if (!font) continue;
      if (GENERIC_FONT_PATTERN.test(font)) continue;
      if (IGNORE_FONT_PATTERN.test(font)) continue;
      if (lower.includes("var(") || lower.startsWith("--")) continue;
      if (lower.includes("!important")) continue;

      const score = fontCounts.get(font) ?? 0;
      fontCounts.set(font, score + weight);
    }
  };

  while ((match = FONT_FACE_PATTERN.exec(cssText)) !== null) {
    addFontCandidates(match[1], 3);
  }

  while ((match = FONT_FAMILY_PATTERN.exec(cssText)) !== null) {
    addFontCandidates(match[1], 1);
  }

  const ranked = [...fontCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    fonts: ranked.map((item) => item.name),
    details: ranked,
  };
}

function extractColors(cssText: string): {
  colors: string[];
  details: ThemeAnalysis["colorDetails"];
  categories: ThemeAnalysis["colorCategories"];
} {
  const colorCounts = new Map<string, number>();
  const declarations = [...cssText.matchAll(COLOR_DECLARATION_PATTERN)];

  for (const [, , declarationValue] of declarations) {
    const tokens = declarationValue.match(COLOR_PATTERN) ?? [];
    for (const token of tokens) {
      const normalized = cleanColorToken(token);
      if (!normalized || IGNORE_COLOR_TOKENS.has(normalized)) continue;
      colorCounts.set(normalized, (colorCounts.get(normalized) ?? 0) + 1);
    }
  }

  if (colorCounts.size === 0) {
    const fallbackTokens = cssText.match(COLOR_PATTERN) ?? [];
    for (const token of fallbackTokens) {
      const normalized = cleanColorToken(token);
      if (!normalized || IGNORE_COLOR_TOKENS.has(normalized)) continue;
      colorCounts.set(normalized, (colorCounts.get(normalized) ?? 0) + 1);
    }
  }

  const groupedByHex = new Map<
    string,
    {
      hex: string;
      count: number;
      category: string;
      tone: "light" | "mid" | "dark";
    }
  >();

  for (const [value, count] of colorCounts.entries()) {
    const rgb = parseColorToRgb(value);
    if (!rgb) continue;
    const hex = toHex(rgb);
    const existing = groupedByHex.get(hex);

    if (existing) {
      existing.count += count;
      continue;
    }

    groupedByHex.set(hex, {
      hex,
      count,
      category: categorizeColor(rgb),
      tone: colorTone(rgb),
    });
  }

  const colorDetails = [...groupedByHex.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map((entry) => ({
      value: entry.hex,
      hex: entry.hex,
      count: entry.count,
      category: entry.category,
      tone: entry.tone,
    }));

  const categoryCounts = new Map<string, number>();
  for (const color of colorDetails) {
    categoryCounts.set(color.category, (categoryCounts.get(color.category) ?? 0) + color.count);
  }

  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return {
    colors: colorDetails.slice(0, 12).map((entry) => entry.value),
    details: colorDetails,
    categories,
  };
}

function inferMood(colors: string[]): { mood: ThemeAnalysis["mood"]; confidence: number } {
  if (colors.length === 0) {
    return { mood: "mixed", confidence: 0.2 };
  }

  let darkCount = 0;
  let lightCount = 0;

  for (const color of colors) {
    const rgb = parseColorToRgb(color);
    if (!rgb) continue;
    const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    if (luminance < 96) darkCount += 1;
    if (luminance > 180) lightCount += 1;
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

function extractWebsiteDetails(sourceUrl: URL, html: string, stylesheetCount: number, combinedCssSource: string) {
  const metaTags = html.match(META_PATTERN) ?? [];
  let description: string | null = null;
  let viewport: string | null = null;
  let charset: string | null = null;
  let generator: string | null = null;
  let hasOpenGraph = false;
  let hasTwitterCards = false;

  for (const tag of metaTags) {
    const name = extractMetaAttribute(tag, "name")?.toLowerCase() ?? "";
    const property = extractMetaAttribute(tag, "property")?.toLowerCase() ?? "";
    const content = extractMetaAttribute(tag, "content");

    if (!charset) charset = extractMetaAttribute(tag, "charset");
    if (!description && (name === "description" || property === "og:description")) description = content;
    if (!viewport && name === "viewport") viewport = content;
    if (!generator && name === "generator") generator = content;
    if (property.startsWith("og:")) hasOpenGraph = true;
    if (name.startsWith("twitter:")) hasTwitterCards = true;
  }

  const htmlLang = html.match(/<html[^>]*\slang=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() ?? null;
  const canonicalHref = html.match(
    /<link[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i
  )?.[1];

  let canonicalUrl: string | null = null;
  if (canonicalHref) {
    try {
      canonicalUrl = new URL(canonicalHref, sourceUrl.toString()).toString();
    } catch {
      canonicalUrl = null;
    }
  }

  const linkMatches = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  let internalLinkCount = 0;
  let externalLinkCount = 0;

  for (const [, href] of linkMatches) {
    try {
      const resolved = new URL(href, sourceUrl.toString());
      if (resolved.hostname === sourceUrl.hostname) internalLinkCount += 1;
      else externalLinkCount += 1;
    } catch {
      continue;
    }
  }

  const inlineStyleBlockCount = (html.match(/<style[\s>]/gi) ?? []).length;
  const imageCount = (html.match(/<img[\s>]/gi) ?? []).length;
  const scriptCount = (html.match(/<script[\s>]/gi) ?? []).length;
  const hasResponsiveCssHints = /@media\s*\((?:max|min)-width|clamp\(|vw|vh/i.test(combinedCssSource);

  const mobileFriendlySignals: string[] = [];
  if (viewport && /width\s*=\s*device-width/i.test(viewport)) mobileFriendlySignals.push("viewport-meta");
  if (hasResponsiveCssHints) mobileFriendlySignals.push("responsive-css");
  if ((html.match(/srcset=/gi) ?? []).length > 0) mobileFriendlySignals.push("responsive-images");

  return {
    domain: sourceUrl.hostname,
    description,
    language: htmlLang,
    charset,
    viewport,
    canonicalUrl,
    stylesheetCount,
    inlineStyleBlockCount,
    internalLinkCount,
    externalLinkCount,
    imageCount,
    scriptCount,
    hasOpenGraph,
    hasTwitterCards,
    generator,
    mobileFriendlySignals,
  };
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
  const fontAnalysis = extractFonts(combinedCssSource);
  const colorAnalysis = extractColors(combinedCssSource);
  const { mood, confidence } = inferMood(colorAnalysis.colors);
  const websiteDetails = extractWebsiteDetails(parsedUrl, html, stylesheetUrls.length, combinedCssSource);

  return {
    sourceUrl: parsedUrl.toString(),
    title: extractTitle(html),
    ...websiteDetails,
    fonts: fontAnalysis.fonts,
    fontDetails: fontAnalysis.details,
    colors: colorAnalysis.colors,
    colorDetails: colorAnalysis.details,
    colorCategories: colorAnalysis.categories,
    mood,
    confidence: Number(confidence.toFixed(2)),
  };
}
