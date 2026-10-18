# Irregular Verbs Game

A browser-based game to practice **past tense** forms of English irregular verbs. Inspired by [musicapp](https://github.com/f-guitart/musicapp): static files, profiles, local progress, no backend.

## Features

- **Levels** (2 per block of 5 verbs): **Level 1** MC on verbs 1–5 · **Level 2** typing on verbs 1–5 · **Level 3** MC on verbs 6–10 plus 5 random from 1–5 · **Level 4** typing same pattern · and so on
- **Questions per level**: **10** by default, **+2** for each new 5-verb block (level 1–2 → 10, 3–4 → 12, 5–6 → 14, …). Each new verb appears at least once; later levels add random review from earlier verbs
- **80%** correct to pass; optional timer (longer on bigger pools)
- **Player profiles** with saved level and per-verb stats
- **Admin**: add/edit/delete verbs, **export/import JSON**
- **verbs.json** in the project root (loaded on first visit; edit this file to change the default list)
- Fallback embedded seed if `verbs.json` is missing or invalid

## `verbs.json` format (catalog)

```json
{
  "version": 2,
  "verbs": [
    {
      "id": 1,
      "verb": "be",
      "past_simple": "was/were",
      "translation": "ser / estar"
    }
  ]
}
```

- **`id`**: list order (1, 2, 3…); the app uses the **verb** as the internal key (`be`, `go`, …).
- **`past_simple`**: use `/` for alternates (`was/were`).
- **`translation`**: use `/` or `,` for acceptable typing variants.
- **Wrong MC options** are generated automatically on import (not required in JSON).

Export from Admin uses the same catalog shape. **Reload verbs.json** applies the file to local storage.

## Verb fields (admin)

| Field | Purpose |
|-------|---------|
| Base | Infinitive shown in the prompt |
| Past | Correct past tense |
| Translation | Catalan (required) |
| Wrong 1 & 2 | Optional; auto-generated if empty |
| Extra past forms | Optional (`were`, etc.) |

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
