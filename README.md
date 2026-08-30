# Dayframe

A personal character diary PWA.

Current app version: **V3**

## V3

- GitHub Pages PWA frontend
- Cloudflare Worker AI proxy
- OpenAI API key kept in a Worker runtime secret (`OPENAI_API_KEY`)
- Character reference image analysis → reusable Character DNA
- Single-scene / 4-panel diary image generation using the saved reference images and DNA
- Visible AI connection status and PWA build version

Frontend: `https://continuingrace.github.io/dayframe/`

Worker: `https://dayframe.continuingrace.workers.dev/`

This repository is designed for GitHub Pages and iPhone Home Screen use. Never commit API keys to this repository.
