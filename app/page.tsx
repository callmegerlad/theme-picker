"use client";

import { FormEvent, useState } from "react";

type ThemeAnalysis = {
  sourceUrl: string;
  title: string;
  fonts: string[];
  colors: string[];
  mood: "light" | "dark" | "mixed";
  confidence: number;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThemeAnalysis | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16">
      <section className="rounded-2xl border border-gray-200 bg-white/85 p-8 shadow-sm backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Theme Picker</h1>
        <p className="mt-2 text-sm text-gray-600">
          Paste a website URL to inspect fonts, colors, and overall theme direction.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            inputMode="url"
            placeholder="https://example.com"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-gray-500"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {result && (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Website</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">{result.title}</h2>
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-sm text-gray-600 underline"
            >
              {result.sourceUrl}
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Detected Fonts</h3>
              <ul className="mt-3 space-y-2">
                {(result.fonts.length ? result.fonts : ["No specific fonts detected"]).map((font) => (
                  <li key={font} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {font}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Theme Direction</h3>
              <p className="mt-3 text-3xl font-semibold capitalize text-gray-900">{result.mood}</p>
              <p className="mt-2 text-sm text-gray-600">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Primary Colors</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(result.colors.length ? result.colors : ["No colors detected"]).map((color) => {
                const isColor = /^(#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(color);
                return (
                  <div key={color} className="rounded-xl border border-gray-200 p-2">
                    <div
                      className="h-10 rounded-md border border-gray-200"
                      style={{ background: isColor ? color : "#f3f4f6" }}
                    />
                    <p className="mt-2 truncate text-xs text-gray-700">{color}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
