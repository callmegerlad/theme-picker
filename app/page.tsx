"use client";

import { FormEvent, useState } from "react";

type ThemeAnalysis = {
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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThemeAnalysis | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to analyze this site");
      }

      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyHexToClipboard(hex: string) {
    const copyWithFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = hex;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    };

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(hex);
      } else {
        const successful = copyWithFallback();
        if (!successful) {
          throw new Error("Fallback copy failed");
        }
      }

      setCopiedHex(hex);
      setError(null);
      window.setTimeout(() => {
        setCopiedHex((current) => (current === hex ? null : current));
      }, 1200);
    } catch {
      setError("Unable to copy automatically. Try HTTPS/localhost, then tap and hold the hex to copy.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Theme Snapshot</h1>
        <p className="mt-2 text-sm text-gray-600">
          Paste a website URL to inspect fonts, colors, and overall theme direction!
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            placeholder="https://example.com"
            className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-gray-500"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {result && (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs uppercase tracking-wide text-gray-500">Website</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">{result.title}</h2>
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block break-all text-sm text-gray-600 underline"
            >
              {result.sourceUrl}
            </a>

            {result.description && <p className="mt-3 text-sm text-gray-700">{result.description}</p>}

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Domain</dt>
                <dd className="mt-1 text-gray-900">{result.domain}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Language</dt>
                <dd className="mt-1 text-gray-900">{result.language || "Unknown"}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Charset</dt>
                <dd className="mt-1 text-gray-900">{result.charset || "Unknown"}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Stylesheets</dt>
                <dd className="mt-1 text-gray-900">{result.stylesheetCount}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Links</dt>
                <dd className="mt-1 text-gray-900">
                  {result.internalLinkCount} internal / {result.externalLinkCount} external
                </dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Assets</dt>
                <dd className="mt-1 text-gray-900">
                  {result.imageCount} images / {result.scriptCount} scripts
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-gray-600">
              SEO signals: {result.hasOpenGraph ? "Open Graph" : "No Open Graph"},{" "}
              {result.hasTwitterCards ? "Twitter Cards" : "No Twitter Cards"}
              {result.generator ? `, generator: ${result.generator}` : ""}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Mobile signals: {result.mobileFriendlySignals.length ? result.mobileFriendlySignals.join(", ") : "None"}
            </p>
            {result.canonicalUrl && (
              <p className="mt-1 break-all text-xs text-gray-600">Canonical: {result.canonicalUrl}</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-medium text-gray-500">Detected Fonts</h3>
              <ul className="mt-3 space-y-2">
                {(result.fontDetails.length ? result.fontDetails : [{ name: "No specific fonts detected", count: 0 }]).map(
                  (font) => (
                    <li key={font.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <span className="truncate text-gray-800">{font.name}</span>
                      {font.count > 0 && (
                        <span className="ml-3 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">{font.count}</span>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-medium text-gray-500">Theme Direction</h3>
              <p className="mt-3 text-3xl font-semibold capitalize text-gray-900">{result.mood}</p>
              <p className="mt-2 text-sm text-gray-600">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
              {Boolean(result.colorCategories.length) && (
                <ul className="mt-4 space-y-2">
                  {result.colorCategories.map((bucket) => (
                    <li key={bucket.category} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <span className="capitalize text-gray-700">{bucket.category}</span>
                      <span className="font-medium text-gray-900">{bucket.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-medium text-gray-500">Tech Snapshot</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="rounded-lg bg-gray-50 px-3 py-2">Viewport: {result.viewport || "Not declared"}</li>
                <li className="rounded-lg bg-gray-50 px-3 py-2">Inline style blocks: {result.inlineStyleBlockCount}</li>
                <li className="rounded-lg bg-gray-50 px-3 py-2">Canonical: {result.canonicalUrl ? "Present" : "Missing"}</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-medium text-gray-500">Theme Colors</h3>
            <p className="mt-2 text-sm text-gray-600">Click on any color to copy its hex value to your clipboard!</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(result.colorDetails.length
                ? result.colorDetails
                : [
                    {
                      value: "No colors detected",
                      hex: "#f3f4f6",
                      count: 0,
                      category: "neutral",
                      tone: "light" as const,
                    },
                  ]
              ).map((color) => {
                const isColor = /^(#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(color.value) || Boolean(color.hex);
                const wasCopied = copiedHex === color.hex;
                return (
                  <div key={color.value} className="rounded-xl border border-gray-200 p-2">
                    <button
                      type="button"
                      onClick={() => copyHexToClipboard(color.hex)}
                      className={`relative h-12 w-full overflow-hidden rounded-md border border-gray-200 transition duration-200 ${
                        wasCopied ? "scale-[1.02] ring-2 ring-emerald-400" : "hover:scale-[1.01]"
                      }`}
                      title={`Copy ${color.hex}`}
                      aria-label={`Copy ${color.hex} to clipboard`}
                    >
                      <span className="absolute inset-0" style={{ background: isColor ? color.hex : "#f3f4f6" }} />
                      <span
                        className={`absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white transition ${
                          wasCopied ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                        }`}
                      >
                        Copied
                      </span>
                    </button>
                    <p className="mt-2 truncate text-xs font-medium text-gray-800">{color.value}</p>
                    <p className="mt-1 truncate text-[11px] text-gray-600">
                      {color.hex} • {color.category} • {color.tone}
                    </p>
                    {color.count > 0 && <p className="mt-1 text-[11px] text-gray-500">Used {color.count}x</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-gray-200 pt-8 pb-4 text-center">
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="https://github.com/callmegerlad/theme-picker" target="_blank" className="text-gray-600 hover:text-gray-900 transition">GitHub</a>
            <span className="text-gray-300">•</span>
            <a href="https://www.geraldkjk.com/" target="_blank" className="text-gray-600 hover:text-gray-900 transition">Portfolio</a>
            <span className="text-gray-300">•</span>
            <a href="https://www.linkedin.com/in/geraldkjk/" target="_blank" className="text-gray-600 hover:text-gray-900 transition">LinkedIn</a>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Gerald Koh. Built w/ Next.js & Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
