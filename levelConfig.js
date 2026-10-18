import { getAllVerbs } from './verbs.js';

export const VERBS_PER_BATCH = 5;
export const LEVELS_PER_BATCH = 2;
/** Default questions per level (past + Catalan translation practice) */
export const BASE_QUESTIONS_PER_LEVEL = 10;
/** Extra questions added for each 5-verb block unlocked */
export const EXTRA_QUESTIONS_PER_BATCH = 2;

export function getMaxLevel() {
    const count = getAllVerbs().length;
    if (count === 0) {
        return 1;
    }
    const batches = Math.ceil(count / VERBS_PER_BATCH);
    return batches * LEVELS_PER_BATCH;
}

/** 0 = levels 1–2 (verbs 1–5), 1 = levels 3–4 (verbs 6–10), … */
export function getBatchIndex(level) {
    return Math.floor((level - 1) / LEVELS_PER_BATCH);
}

export function getLevelVariant(level) {
    const inputMode = (level - 1) % LEVELS_PER_BATCH === 0 ? 'mc' : 'typing';
    return { inputMode, skill: 'mixed' };
}

export function getNewVerbsForLevel(level) {
    const all = getAllVerbs();
    const batchIndex = getBatchIndex(level);
    const start = batchIndex * VERBS_PER_BATCH;
    return all.slice(start, start + VERBS_PER_BATCH);
}

/** All verbs learned before the current batch */
export function getPreviousVerbsForLevel(level) {
    const batchIndex = getBatchIndex(level);
    if (batchIndex === 0) {
        return [];
    }
    const all = getAllVerbs();
    return all.slice(0, batchIndex * VERBS_PER_BATCH);
}

/** Verbs that can appear this level (for distractors / display) */
export function getVerbPoolForLevel(level) {
    const seen = new Map();
    [...getPreviousVerbsForLevel(level), ...getNewVerbsForLevel(level)].forEach((verb) => {
        seen.set(verb.id, verb);
    });
    return [...seen.values()];
}

export function getQuestionsPerLevel(level) {
    const batchIndex = getBatchIndex(level);
    const newVerbs = getNewVerbsForLevel(level);
    const scaled =
        BASE_QUESTIONS_PER_LEVEL + batchIndex * EXTRA_QUESTIONS_PER_BATCH;
    return Math.max(newVerbs.length, scaled);
}

export function getInputModeForLevel(level) {
    return getLevelVariant(level).inputMode;
}

export function getTimeLimitForLevel(level) {
    const questionCount = getQuestionsPerLevel(level);
    if (questionCount <= 10) {
        return 12;
    }
    if (questionCount <= 14) {
        return 14;
    }
    if (questionCount <= 18) {
        return 16;
    }
    return 18;
}

export function getLevelDescription(level) {
    const batchIndex = getBatchIndex(level);
    const mode = getLevelVariant(level).inputMode === 'mc' ? 'Multiple choice' : 'Type answer';
    const questions = getQuestionsPerLevel(level);
    const newCount = getNewVerbsForLevel(level).length;
    if (batchIndex === 0) {
        return `${mode} · ${questions} questions (verbs 1–${newCount})`;
    }
    const prevCount = getPreviousVerbsForLevel(level).length;
    return `${mode} · ${questions} questions (${newCount} new + review 1–${prevCount})`;
}
