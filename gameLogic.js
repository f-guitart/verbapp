import { getAllVerbs, getVerbById, isPastAnswerCorrect, getPrimaryPastDisplay } from './verbs.js';

const GameLogic = {
    levels: [
        { level: 1, timeLimitSeconds: 10, mode: 'mc' },
        { level: 2, timeLimitSeconds: 8, mode: 'mixed' },
        { level: 3, timeLimitSeconds: 6, mode: 'typing' }
    ],

    successThreshold: 0.8,

    currentLevel: 1,
    currentQuestion: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    currentVerbId: null,
    lastVerbId: null,
    verbStats: {},
    questionTypes: [],

    init(level, verbStats) {
        this.currentLevel = level || 1;
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.verbStats = verbStats || {};
        this.lastVerbId = null;
        this.currentVerbId = null;

        if (this.currentLevel < 1) this.currentLevel = 1;
        if (this.currentLevel > this.levels.length) {
            this.currentLevel = this.levels.length;
        }
    },

    getQuestionsPerLevel() {
        return Math.max(1, getAllVerbs().length);
    },

    getCurrentLevelConfig() {
        const base = this.levels[this.currentLevel - 1];
        return {
            ...base,
            questionsPerLevel: this.getQuestionsPerLevel()
        };
    },

    buildQuestionTypeQueue() {
        const config = this.getCurrentLevelConfig();
        const n = config.questionsPerLevel;
        let types = [];

        if (config.mode === 'mc') {
            types = Array(n).fill('mc');
        } else if (config.mode === 'typing') {
            types = Array(n).fill('typing');
        } else {
            const half = Math.floor(n / 2);
            types = [...Array(half).fill('mc'), ...Array(n - half).fill('typing')];
            for (let i = types.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [types[i], types[j]] = [types[j], types[i]];
            }
        }

        this.questionTypes = types;
    },

    getCurrentQuestionType() {
        return this.questionTypes[this.currentQuestion - 1] || 'mc';
    },

    pickVerbId() {
        const verbs = getAllVerbs();
        if (verbs.length === 0) {
            return null;
        }

        const ids = verbs.map((v) => v.id);
        let pool = this.lastVerbId ? ids.filter((id) => id !== this.lastVerbId) : ids;
        if (pool.length === 0) {
            pool = ids;
        }

        const weights = pool.map((id) => {
            const stats = this.verbStats[id] || { correct: 0, wrong: 0 };
            const wrong = stats.wrong || 0;
            let weight = 1;
            if (wrong > 0) {
                weight = 1 + wrong * 1.5;
            }
            return { id, weight };
        });

        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * total;
        let selected = pool[0];
        for (const { id, weight } of weights) {
            random -= weight;
            if (random <= 0) {
                selected = id;
                break;
            }
        }

        this.lastVerbId = this.currentVerbId;
        this.currentVerbId = selected;
        return selected;
    },

    prepareQuestion() {
        return this.pickVerbId();
    },

    getCurrentVerb() {
        return getVerbById(this.currentVerbId);
    },

    recordAnswer(isCorrect) {
        if (!this.currentVerbId) {
            return;
        }
        if (!this.verbStats[this.currentVerbId]) {
            this.verbStats[this.currentVerbId] = { correct: 0, wrong: 0 };
        }
        if (isCorrect) {
            this.correctAnswers++;
            this.verbStats[this.currentVerbId].correct++;
        } else {
            this.wrongAnswers++;
            this.verbStats[this.currentVerbId].wrong++;
        }
    },

    checkMcAnswer(selectedPast) {
        const verb = this.getCurrentVerb();
        if (!verb) {
            return { isCorrect: false, correctPast: '' };
        }
        const isCorrect = normalizeCompare(selectedPast, verb.past);
        this.recordAnswer(isCorrect);
        return {
            isCorrect,
            correctPast: getPrimaryPastDisplay(verb),
            selectedPast
        };
    },

    checkTypingAnswer(userInput) {
        const verb = this.getCurrentVerb();
        if (!verb) {
            return { isCorrect: false, correctPast: '' };
        }
        const isCorrect = isPastAnswerCorrect(verb, userInput);
        this.recordAnswer(isCorrect);
        return {
            isCorrect,
            correctPast: getPrimaryPastDisplay(verb),
            userInput
        };
    },

    nextQuestion() {
        this.currentQuestion++;
        const config = this.getCurrentLevelConfig();
        return this.currentQuestion <= config.questionsPerLevel;
    },

    startLevelQuestions() {
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.buildQuestionTypeQueue();
    },

    isLevelPassed() {
        const config = this.getCurrentLevelConfig();
        return this.correctAnswers / config.questionsPerLevel >= this.successThreshold;
    },

    getLevelResults() {
        const config = this.getCurrentLevelConfig();
        const total = config.questionsPerLevel;
        const pct = Math.round((this.correctAnswers / total) * 100);
        return {
            level: this.currentLevel,
            correct: this.correctAnswers,
            wrong: this.wrongAnswers,
            total,
            percentage: pct,
            passed: this.isLevelPassed()
        };
    },

    advanceLevel() {
        if (this.currentLevel < this.levels.length) {
            this.currentLevel++;
            return true;
        }
        return false;
    },

    hasVerbs() {
        return getAllVerbs().length > 0;
    }
};

function normalizeCompare(a, b) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export default GameLogic;
