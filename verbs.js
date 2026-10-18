import Storage from './storage.js';
import { SEED_VERBS } from './seedVerbs.js';

const VERBS_JSON_URL = 'verbs.json';

export function normalizeAnswer(text) {
    return text.trim().toLowerCase();
}

export function getAcceptedPastForms(verb) {
    const forms = [verb.past, ...(verb.pastAliases || [])];
    return [...new Set(forms.map(normalizeAnswer).filter(Boolean))];
}

export function isPastAnswerCorrect(verb, userInput) {
    const normalized = normalizeAnswer(userInput);
    if (!normalized) {
        return false;
    }
    return getAcceptedPastForms(verb).includes(normalized);
}

export function getPrimaryPastDisplay(verb) {
    return verb.past;
}

export function getAllVerbs() {
    return Storage.getVerbs();
}

export function getVerbById(id) {
    return getAllVerbs().find((v) => v.id === id) || null;
}

export function validateVerb(verb, existingIds = []) {
    const base = (verb.base || '').trim();
    const past = (verb.past || '').trim();
    const wrong1 = (verb.wrong1 || '').trim();
    const wrong2 = (verb.wrong2 || '').trim();

    if (!base || !past || !wrong1 || !wrong2) {
        return { valid: false, message: 'Base, past, and both wrong options are required.' };
    }

    const pastNorm = normalizeAnswer(past);
    const w1 = normalizeAnswer(wrong1);
    const w2 = normalizeAnswer(wrong2);

    if (w1 === pastNorm || w2 === pastNorm) {
        return { valid: false, message: 'Wrong options must differ from the correct past tense.' };
    }
    if (w1 === w2) {
        return { valid: false, message: 'Wrong options must be different from each other.' };
    }

    const id = (verb.id || base).trim().toLowerCase().replace(/\s+/g, '-');
    if (existingIds.includes(id) && verb._originalId !== id) {
        return { valid: false, message: 'A verb with this base form already exists.' };
    }

    return { valid: true, verb: { ...verb, id, base, past, wrong1, wrong2 } };
}

export function saveVerb(verbInput) {
    const verbs = getAllVerbs();
    const editingId = verbInput._originalId || verbInput.id;
    const existingIds = verbs.filter((v) => v.id !== editingId).map((v) => v.id);

    const aliases = (verbInput.pastAliases || [])
        .map((a) => a.trim())
        .filter(Boolean);

    const check = validateVerb(
        { ...verbInput, pastAliases: aliases, id: verbInput.id || verbInput.base },
        existingIds
    );
    if (!check.valid) {
        return check;
    }

    const saved = {
        id: check.verb.id,
        base: check.verb.base,
        past: check.verb.past,
        wrong1: check.verb.wrong1,
        wrong2: check.verb.wrong2,
        pastAliases: aliases
    };

    const idx = verbs.findIndex((v) => v.id === editingId);
    if (idx >= 0) {
        verbs[idx] = saved;
    } else {
        verbs.push(saved);
    }
    Storage.saveVerbs(verbs);
    return { valid: true, verb: saved };
}

export function deleteVerb(id) {
    const verbs = getAllVerbs().filter((v) => v.id !== id);
    Storage.saveVerbs(verbs);
}

export function exportVerbsJson() {
    return JSON.stringify({ version: 1, verbs: getAllVerbs() }, null, 2);
}

export function importVerbsJson(jsonText) {
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return { success: false, message: 'Invalid JSON file.' };
    }

    const list = Array.isArray(parsed) ? parsed : parsed.verbs;
    if (!Array.isArray(list) || list.length === 0) {
        return { success: false, message: 'No verbs found in file.' };
    }

    const validated = [];
    const ids = new Set();

    for (const item of list) {
        const check = validateVerb(item, [...ids]);
        if (!check.valid) {
            return { success: false, message: check.message };
        }
        ids.add(check.verb.id);
        validated.push({
            id: check.verb.id,
            base: check.verb.base,
            past: check.verb.past,
            wrong1: check.verb.wrong1,
            wrong2: check.verb.wrong2,
            pastAliases: (item.pastAliases || []).map((a) => a.trim()).filter(Boolean)
        });
    }

    Storage.saveVerbs(validated);
    return { success: true, count: validated.length };
}

export async function bootstrapVerbs() {
    if (Storage.hasVerbsInStorage()) {
        return { success: true, source: 'storage' };
    }

    try {
        const response = await fetch(VERBS_JSON_URL, { cache: 'no-cache' });
        if (response.ok) {
            const result = importVerbsJson(await response.text());
            if (result.success) {
                return { success: true, source: 'file', count: result.count };
            }
        }
    } catch {
        // fall through to embedded seed
    }

    Storage.saveVerbs(SEED_VERBS.map((v) => ({ ...v })));
    return { success: true, source: 'seed', count: SEED_VERBS.length };
}

export async function reloadVerbsFromFile() {
    try {
        const response = await fetch(VERBS_JSON_URL, { cache: 'no-cache' });
        if (!response.ok) {
            return { success: false, message: 'Could not fetch verbs.json.' };
        }
        return importVerbsJson(await response.text());
    } catch {
        return { success: false, message: 'Could not load verbs.json.' };
    }
}

export function getMcOptions(verb) {
    const options = [verb.past, verb.wrong1, verb.wrong2];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
}
