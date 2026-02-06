// Keep this module free of heavy imports (e.g. @google/genai) so we can gate AI UX
// without bloating the initial JS bundle.
export const hasGeminiKey = Boolean(process.env.API_KEY);

