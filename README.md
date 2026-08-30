# Dayframe

A local-first personal character diary prompt maker.

Current app version: **V5**

## V5

- GitHub Pages PWA frontend only
- No Cloudflare Worker dependency
- No OpenAI API key
- No external AI API calls from Dayframe
- Character reference images, notes, diary text, highlights and prompts are stored locally in the browser
- Diary text is distilled locally into editable visual highlights
- Generates a reusable final prompt for 1-scene or 4-panel character diary images
- Final image generation is intentionally performed by the user in ChatGPT with the saved reference images
- Previous local `dayframe.appToken` and `dayframe.characterDNA` values are removed when V5 loads

Frontend: `https://continuingrace.github.io/dayframe/`

This repository is designed for GitHub Pages and iPhone Home Screen use. V5 intentionally contains no API credentials or server-side AI integration.
