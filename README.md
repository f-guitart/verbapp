# Irregular Verbs Game

A browser-based game to practice **past tense** forms of English irregular verbs. Inspired by [musicapp](https://github.com/f-guitart/musicapp): static files, profiles, local progress, no backend.

## Features

- **3 levels** (short verb list friendly):
  - Level 1: multiple choice (3 options)
  - Level 2: mix of multiple choice and typing
  - Level 3: typing only
- **One question per verb** each level (count follows your admin list); **80%** correct to pass
- **Optional timer** (10s → 8s → 6s when enabled)
- **Player profiles** with saved level and per-verb stats
- **Admin**: add/edit/delete verbs, **export/import JSON**
- **verbs.json** in the project root (loaded on first visit; edit this file to change the default list)
- Fallback embedded seed if `verbs.json` is missing or invalid

## Verb fields (admin)

| Field | Purpose |
|-------|---------|
| Base | Infinitive shown in the prompt |
| Past | Correct past tense |
| Wrong 1 & 2 | Distractors for multiple choice |
| Extra spellings | Optional aliases for typing (e.g. `burnt` for `burned`) |

Typing answers: trim whitespace, ignore case, strict match against past + aliases.

## Run locally

Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` (ES modules require http on some browsers).

## Deploy (GitHub Pages)

Push the repo and enable Pages on the `main` branch, root folder.

## File structure

```
index.html    UI screens
main.js       Game flow and timer
gameLogic.js  Levels, question types, scoring
verbs.js      Validation, MC options, import/export
storage.js    localStorage
profiles.js   Profile UI
admin.js      Verb management
verbs.json     Default verb list (fetched on first load)
seedVerbs.js   Fallback if verbs.json unavailable
style.css
```
