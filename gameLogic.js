import {
    getVerbById,
    isPastAnswerCorrect,
    isTranslationAnswerCorrect,
    getPrimaryPastDisplay,
    getPrimaryTranslationDisplay
} from './verbs.js';
import {
    getMaxLevel,
    getVerbPoolForLevel,
    getNewVerbsForLevel,
    getPreviousVerbsForLevel,
    getBatchIndex,
    getLevelVariant,
    getQuestionsPerLevel,
    getTimeLimitForLevel,
    getLevelDescription,
    VERBS_PER_BATCH
} from './levelConfig.js';

const GameLogic = {
    successThreshold: 0.8,

    currentLevel: 1,
    currentQuestion: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    verbStats: {},
    questionQueue: [],

    init(level, verbStats) {
        this.currentLevel = level || 1;
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.verbStats = verbStats || {};
        this.questionQueue = [];

        if (this.currentLevel < 1) {
            this.currentLevel = 1;
        }
        const max = getMaxLevel();
        if (this.currentLevel > max) {
            this.currentLevel = max;
        }
    },

    getQuestionsPerLevel() {
        return getQuestionsPerLevel(this.currentLevel);
    },

    getCurrentLevelConfig() {
        const variant = getLevelVariant(this.currentLevel);
        return {
            level: this.currentLevel,
            questionsPerLevel: this.getQuestionsPerLevel(),
            inputMode: variant.inputMode,
            skill: variant.skill,
            timeLimitSeconds: getTimeLimitForLevel(this.currentLevel),
            description: getLevelDescription(this.currentLevel)
        };
    },

    buildQuestionQueue() {
        const batchIndex = getBatchIndex(this.currentLevel);
        const newVerbs = getNewVerbsForLevel(this.currentLevel);
        const previousVerbs = getPreviousVerbsForLevel(this.currentLevel);
        const pool = getVerbPoolForLevel(this.currentLevel);
        const { inputMode } = getLevelVariant(this.currentLevel);
        const targetCount = getQuestionsPerLevel(this.currentLevel);
        const queue = [];

        const pushQuestion = (verb) => {
            queue.push({
                verbId: verb.id,
                skill: Math.random() < 0.5 ? 'past' : 'translation',
                inputMode
            });
        };

        newVerbs.forEach((verb) => pushQuestion(verb));

        if (batchIndex > 0 && previousVerbs.length > 0) {
            const minReview = Math.min(
                VERBS_PER_BATCH,
                previousVerbs.length,
                Math.max(0, targetCount - newVerbs.length)
            );
            for (let i = 0; i < minReview; i++) {
                const verb =
                    previousVerbs[Math.floor(Math.random() * previousVerbs.length)];
                pushQuestion(verb);
            }
        }

        while (queue.length < targetCount && pool.length > 0) {
            const verb = pool[Math.floor(Math.random() * pool.length)];
            pushQuestion(verb);
        }

        if (queue.length > targetCount) {
            queue.length = targetCount;
        }

        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        this.questionQueue = queue;
    },

    getCurrentQuestionSpec() {
        return this.questionQueue[this.currentQuestion - 1] || null;
    },

    getCurrentQuestionType() {
        const spec = this.getCurrentQuestionSpec();
        return spec ? spec.inputMode : 'mc';
    },

    getCurrentSkill() {
        const spec = this.getCurrentQuestionSpec();
        return spec ? spec.skill : 'past';
    },

    prepareQuestion() {
        const spec = this.getCurrentQuestionSpec();
        if (!spec) {
            return null;
        }
        return spec.verbId;
    },

    getCurrentVerb() {
        const spec = this.getCurrentQuestionSpec();
        if (!spec) {
            return null;
        }
        return getVerbById(spec.verbId);
    },

    getVerbPool() {
        return getVerbPoolForLevel(this.currentLevel);
    },

    recordAnswer(isCorrect) {
        const spec = this.getCurrentQuestionSpec();
        if (!spec) {
            return;
        }
        const key = spec.verbId;
        if (!this.verbStats[key]) {
            this.verbStats[key] = { correct: 0, wrong: 0 };
        }
        if (isCorrect) {
            this.correctAnswers++;
            this.verbStats[key].correct++;
        } else {
            this.wrongAnswers++;
            this.verbStats[key].wrong++;
        }
    },

    checkMcAnswer(selected) {
        const verb = this.getCurrentVerb();
        const skill = this.getCurrentSkill();
        if (!verb) {
            return { isCorrect: false, correctAnswer: '', skill };
        }

        const isCorrect =
            skill === 'past'
                ? isPastAnswerCorrect(verb, selected)
                : isTranslationAnswerCorrect(verb, selected);

        this.recordAnswer(isCorrect);
        return {
            isCorrect,
            correctAnswer:
                skill === 'past'
                    ? getPrimaryPastDisplay(verb)
                    : getPrimaryTranslationDisplay(verb),
            skill
        };
    },

    checkTypingAnswer(userInput) {
        const verb = this.getCurrentVerb();
        const skill = this.getCurrentSkill();
        if (!verb) {
            return { isCorrect: false, correctAnswer: '', skill };
        }

        const isCorrect =
            skill === 'past'
                ? isPastAnswerCorrect(verb, userInput)
                : isTranslationAnswerCorrect(verb, userInput);

        this.recordAnswer(isCorrect);
        return {
            isCorrect,
            correctAnswer:
                skill === 'past'
                    ? getPrimaryPastDisplay(verb)
                    : getPrimaryTranslationDisplay(verb),
            skill
        };
    },

    nextQuestion() {
        this.currentQuestion++;
        return this.currentQuestion <= this.getQuestionsPerLevel();
    },

    startLevelQuestions() {
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.buildQuestionQueue();
    },

    isLevelPassed() {
        const total = this.getQuestionsPerLevel();
        return this.correctAnswers / total >= this.successThreshold;
    },

    getLevelResults() {
        const total = this.getQuestionsPerLevel();
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
        if (this.currentLevel < getMaxLevel()) {
            this.currentLevel++;
            return true;
        }
        return false;
    },

    getMaxLevel() {
        return getMaxLevel();
    },

    hasVerbs() {
        return getVerbPoolForLevel(1).length > 0;
    }
};

export default GameLogic;
