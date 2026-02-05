<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1W-uqzstekK9uORCRLjJ_3jVGCY5uh0My

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (not committed) with:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (required for login)
   - `GEMINI_API_KEY` (optional, only if you are using a shared Gemini key)
3. Run the app:
   `npm run dev`
