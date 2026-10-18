import Storage from './storage.js';
import { SEED_VERBS } from './seedVerbs.js';

const VERBS_JSON_URL = 'verbs.json';

export function normalizeAnswer(text) {
    return text.trim().toLowerCase();
}

function splitForms(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }
    return text
        .split(/[/,]/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export function getAcceptedPastForms(verb) {
    const forms = [verb.past, ...(verb.pastAliases || [])];
    return [...new Set(forms.map(normalizeAnswer).filter(Boolean))];
}

export function getAcceptedTranslationForms(verb) {
    const fromField = splitForms(verb.translation || '');
    const extras = (verb.translationAliases || []).map((t) => t.trim()).filter(Boolean);
    return [...new Set([...fromField, ...extras].map(normalizeAnswer).filter(Boolean))];
}

export function isPastAnswerCorrect(verb, userInput) {
    const trimmed = userInput.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed === getPrimaryPastDisplay(verb)) {
        return true;
    }
    return getAcceptedPastForms(verb).includes(normalizeAnswer(trimmed));
}

export function isTranslationAnswerCorrect(verb, userInput) {
    const trimmed = userInput.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed === getPrimaryTranslationDisplay(verb)) {
        return true;
    }
    return getAcceptedTranslationForms(verb).includes(normalizeAnswer(trimmed));
}

export function getPrimaryPastDisplay(verb) {
    const unique = [];
    const seen = new Set();
    for (const part of [verb.past, ...(verb.pastAliases || [])]) {
        const trimmed = (part || '').trim();
        if (!trimmed) {
            continue;
        }
        const key = normalizeAnswer(trimmed);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(trimmed);
        }
    }
    return unique.join(' / ') || verb.past;
}

export function getPrimaryTranslationDisplay(verb) {
    return verb.translation || '';
}

function defaultWrongPast(base, past, pastAliases = []) {
    const accepted = new Set(getAcceptedPastForms({ past, pastAliases }));
    const candidates = [];

    if (normalizeAnswer(base) !== normalizeAnswer(past)) {
        candidates.push(base);
    }
    candidates.push(base.endsWith('e') ? `${base.slice(0, -1)}ed` : `${base}ed`);
    candidates.push(`${base}d`, `${base}ing`, `was ${base}`);

    const wrongs = [];
    for (const candidate of candidates) {
        const norm = normalizeAnswer(candidate);
        if (!norm || accepted.has(norm)) {
            continue;
        }
        if (!wrongs.some((w) => normalizeAnswer(w) === norm)) {
            wrongs.push(candidate);
        }
        if (wrongs.length >= 2) {
            break;
        }
    }
    let suffix = 1;
    while (wrongs.length < 2) {
        const fallback = `${base}_wrong${suffix}`;
        if (!accepted.has(normalizeAnswer(fallback))) {
            wrongs.push(fallback);
        }
        suffix++;
    }
    return { wrong1: wrongs[0], wrong2: wrongs[1] };
}

export function normalizeRawVerb(item, index = 0) {
    const base = (item.base || item.verb || '').trim();
    const pastRaw = (item.past_simple || item.past || '').trim();
    const pastSplit = pastRaw.split('/').map((s) => s.trim()).filter(Boolean);
    const past = pastSplit[0] || '';
    const pastAliases = [...(item.pastAliases || []), ...pastSplit.slice(1)]
        .map((s) => s.trim())
        .filter(Boolean);

    const translation = (item.translation || '').trim();
    const id = base.toLowerCase().replace(/\s+/g, '-');
    const order =
        typeof item.order === 'number'
            ? item.order
            : typeof item.id === 'number'
              ? item.id
              : index + 1;

    let wrong1 = (item.wrong1 || '').trim();
    let wrong2 = (item.wrong2 || '').trim();
    if (!wrong1 || !wrong2) {
        const generated = defaultWrongPast(base, past, pastAliases);
        wrong1 = wrong1 || generated.wrong1;
        wrong2 = wrong2 || generated.wrong2;
    }

    return {
        id,
        order,
        base,
        past,
        pastAliases,
        translation,
        wrong1,
        wrong2
    };
}

export function verbToCatalogEntry(verb, index) {
    return {
        id: verb.order ?? index + 1,
        verb: verb.base,
        past_simple: getPrimaryPastDisplay(verb),
        translation: verb.translation
    };
}

function storedVerbsNeedUpgrade(verbs) {
    if (!Array.isArray(verbs) || verbs.length === 0) {
        return true;
    }
    return verbs.some((v) => {
        const base = (v.base || v.verb || '').trim();
        if (!base || !(v.translation || '').trim()) {
            return true;
        }
        if (/^\d+$/.test(String(v.id))) {
            return true;
        }
        return false;
    });
}

export function getAllVerbs() {
    return Storage.getVerbs();
}

export function getVerbById(id) {
    return getAllVerbs().find((v) => String(v.id) === String(id)) || null;
}

export function validateVerb(verb, existingIds = []) {
    const base = (verb.base || '').trim();
    const past = (verb.past || '').trim();
    const translation = (verb.translation || '').trim();
    let wrong1 = (verb.wrong1 || '').trim();
    let wrong2 = (verb.wrong2 || '').trim();

    if (!base || !past || !translation) {
        return {
            valid: false,
            message: 'Base, past, and translation are required.'
        };
    }

    if (!wrong1 || !wrong2) {
        const generated = defaultWrongPast(base, past, verb.pastAliases || []);
        wrong1 = wrong1 || generated.wrong1;
        wrong2 = wrong2 || generated.wrong2;
    }

    const w1 = normalizeAnswer(wrong1);
    const w2 = normalizeAnswer(wrong2);
    const acceptedPast = new Set(
        getAcceptedPastForms({ past, pastAliases: verb.pastAliases || [] })
    );

    if (acceptedPast.has(w1) || acceptedPast.has(w2)) {
        return {
            valid: false,
            message: 'Wrong options must differ from all accepted past forms.'
        };
    }
    if (w1 === w2) {
        return { valid: false, message: 'Wrong options must be different from each other.' };
    }

    const id = base.toLowerCase().replace(/\s+/g, '-');
    if (existingIds.includes(id) && verb._originalId !== id) {
        return { valid: false, message: 'A verb with this base form already exists.' };
    }

    return {
        valid: true,
        verb: { ...verb, id, base, past, translation, wrong1, wrong2 }
    };
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

    const existing = editingId ? getVerbById(editingId) : null;
    const saved = {
        id: check.verb.id,
        order: verbInput.order ?? existing?.order,
        base: check.verb.base,
        past: check.verb.past,
        pastAliases: aliases,
        translation: check.verb.translation,
        wrong1: check.verb.wrong1,
        wrong2: check.verb.wrong2
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
    const verbs = getAllVerbs();
    return JSON.stringify(
        {
            version: 2,
            verbs: verbs.map((verb, index) => verbToCatalogEntry(verb, index))
        },
        null,
        2
    );
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

    for (let i = 0; i < list.length; i++) {
        const normalized = normalizeRawVerb(list[i], i);
        const check = validateVerb(normalized, [...ids]);
        if (!check.valid) {
            return { success: false, message: `${check.message} (${normalized.base})` };
        }
        ids.add(check.verb.id);
        validated.push({
            id: check.verb.id,
            order: normalized.order,
            base: check.verb.base,
            past: check.verb.past,
            pastAliases: normalized.pastAliases,
            translation: check.verb.translation,
            wrong1: check.verb.wrong1,
            wrong2: check.verb.wrong2
        });
    }

    Storage.saveVerbs(validated);
    return { success: true, count: validated.length };
}

async function loadVerbsFromFile() {
    try {
        const response = await fetch(VERBS_JSON_URL, { cache: 'no-cache' });
        if (!response.ok) {
            return null;
        }
        return importVerbsJson(await response.text());
    } catch {
        return null;
    }
}

function loadSeedVerbs() {
    const validated = [];
    const ids = [];
    SEED_VERBS.forEach((item, i) => {
        const normalized = normalizeRawVerb(item, i);
        const check = validateVerb(normalized, ids);
        if (check.valid) {
            ids.push(check.verb.id);
            validated.push({
                id: check.verb.id,
                order: normalized.order,
                base: check.verb.base,
                past: check.verb.past,
                pastAliases: normalized.pastAliases,
                translation: check.verb.translation,
                wrong1: check.verb.wrong1,
                wrong2: check.verb.wrong2
            });
        }
    });
    Storage.saveVerbs(validated);
    return { success: true, source: 'seed', count: validated.length };
}

export async function bootstrapVerbs() {
    if (!Storage.hasVerbsInStorage()) {
        const fromFile = await loadVerbsFromFile();
        if (fromFile?.success) {
            return { success: true, source: 'file', count: fromFile.count };
        }
        return loadSeedVerbs();
    }

    const stored = Storage.getVerbs();
    if (storedVerbsNeedUpgrade(stored)) {
        const fromFile = await loadVerbsFromFile();
        if (fromFile?.success) {
            return { success: true, source: 'file-migration', count: fromFile.count };
        }

        const ids = [];
        const upgraded = [];
        stored.forEach((item, i) => {
            const normalized = normalizeRawVerb(item, i);
            const check = validateVerb(normalized, ids);
            if (check.valid) {
                ids.push(check.verb.id);
                upgraded.push({
                    id: check.verb.id,
                    order: normalized.order,
                    base: check.verb.base,
                    past: check.verb.past,
                    pastAliases: normalized.pastAliases,
                    translation: check.verb.translation,
                    wrong1: check.verb.wrong1,
                    wrong2: check.verb.wrong2
                });
            }
        });
        if (upgraded.length > 0) {
            Storage.saveVerbs(upgraded);
        }
    }

    return { success: true, source: 'storage' };
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

export function getMcPastOptions(verb) {
    const options = [getPrimaryPastDisplay(verb), verb.wrong1, verb.wrong2];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
}

export function getTranslationMcOptions(verb, pool) {
    const correct = getPrimaryTranslationDisplay(verb);
    const others = pool
        .filter((v) => v.id !== verb.id)
        .map((v) => getPrimaryTranslationDisplay(v))
        .filter((t) => t && normalizeAnswer(t) !== normalizeAnswer(correct));

    const unique = [...new Set(others)];
    shuffleArray(unique);

    const distractors = unique.slice(0, 2);
    while (distractors.length < 2) {
        distractors.push(`(${distractors.length + 1})`);
    }

    const options = [correct, distractors[0], distractors[1]];
    shuffleArray(options);
    return options;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function isMcOptionCorrect(verb, skill, optionText) {
    if (skill === 'past') {
        return isPastAnswerCorrect(verb, optionText);
    }
    return isTranslationAnswerCorrect(verb, optionText);
}

/** @deprecated use getMcPastOptions */
export function getMcOptions(verb) {
    return getMcPastOptions(verb);
}
