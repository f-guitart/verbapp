import Storage from './storage.js';
import Profiles from './profiles.js';
import GameLogic from './gameLogic.js';
import Admin from './admin.js';
import {
    getMcOptions,
    bootstrapVerbs,
    isPastAnswerCorrect,
    getPrimaryPastDisplay
} from './verbs.js';

const App = {
    screens: {},
    timerInterval: null,
    timeRemaining: 0,
    isAnswering: false,

    async init() {
        this.setupElements();
        this.setupEventListeners();
        await bootstrapVerbs();
        this.syncTimerToggle();
        Admin.init();
        setTimeout(() => this.showProfileScreen(), 50);
    },

    setupElements() {
        this.screens = {
            profile: document.getElementById('profile-screen'),
            game: document.getElementById('game-screen'),
            levelComplete: document.getElementById('level-complete-screen'),
            admin: document.getElementById('admin-screen')
        };
    },

    setupEventListeners() {
        document.getElementById('create-profile-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.getElementById('new-profile-name');
            const result = Profiles.createProfile(input.value);
            if (result.success) {
                input.value = '';
                this.startGame();
            } else {
                alert(result.message);
            }
        });

        document.getElementById('new-profile-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('create-profile-btn').click();
            }
        });

        document.getElementById('play-selected-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('open-admin-btn').addEventListener('click', () => {
            this.showScreen('admin');
            Admin.renderList();
        });

        document.getElementById('timer-toggle').addEventListener('change', (e) => {
            const settings = Storage.getSettings();
            settings.timerEnabled = e.target.checked;
            Storage.saveSettings(settings);
        });

        document.getElementById('submit-typing-btn').addEventListener('click', () => {
            if (this.isAnswering) {
                this.handleTypingSubmit();
            }
        });

        document.getElementById('typing-answer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.isAnswering) {
                e.preventDefault();
                this.handleTypingSubmit();
            }
        });

        document.getElementById('next-level-btn').addEventListener('click', () => {
            this.startLevel();
        });

        document.getElementById('retry-level-btn').addEventListener('click', () => {
            this.startLevel();
        });

        document.getElementById('back-to-profiles-btn').addEventListener('click', () => {
            this.showProfileScreen();
        });
    },

    syncTimerToggle() {
        const settings = Storage.getSettings();
        document.getElementById('timer-toggle').checked = !!settings.timerEnabled;
    },

    showScreen(name) {
        Object.values(this.screens).forEach((el) => el.classList.remove('active'));
        if (this.screens[name]) {
            this.screens[name].classList.add('active');
        }
    },

    showProfileScreen() {
        this.clearTimer();
        Profiles.init(document.getElementById('profile-list'), () => {});
        this.syncTimerToggle();
        this.showScreen('profile');
    },

    startGame() {
        if (!GameLogic.hasVerbs()) {
            alert('Add verbs in Admin before playing.');
            this.showScreen('admin');
            return;
        }

        const profileData = Profiles.getCurrentProfileData();
        if (!profileData) {
            alert('Select or create a profile first.');
            return;
        }

        if (!Storage.getCurrentProfile()) {
            alert('Tap a profile to select it, then press Play.');
            return;
        }

        GameLogic.init(profileData.level, profileData.verbStats || {});
        this.isAnswering = false;
        this.clearTimer();
        this.startLevel();
    },

    startLevel() {
        GameLogic.startLevelQuestions();
        const config = GameLogic.getCurrentLevelConfig();

        document.getElementById('current-level').textContent = GameLogic.currentLevel;
        document.getElementById('total-questions').textContent = config.questionsPerLevel;

        this.showScreen('game');
        this.nextQuestion();
    },

    nextQuestion() {
        if (!GameLogic.nextQuestion()) {
            this.completeLevel();
            return;
        }

        document.getElementById('question-number').textContent = GameLogic.currentQuestion;

        const verbId = GameLogic.prepareQuestion();
        const verb = GameLogic.getCurrentVerb();
        if (!verbId || !verb) {
            alert('No verbs available.');
            this.showProfileScreen();
            return;
        }

        document.getElementById('prompt-base').textContent = verb.base;

        const qType = GameLogic.getCurrentQuestionType();
        const mcPanel = document.getElementById('mc-panel');
        const typingPanel = document.getElementById('typing-panel');
        const modeHint = document.getElementById('mode-hint');

        if (qType === 'mc') {
            modeHint.textContent = 'Choose the past tense';
            mcPanel.style.display = 'block';
            typingPanel.style.display = 'none';
            this.setupMcButtons(verb);
        } else {
            modeHint.textContent = 'Type the past tense';
            mcPanel.style.display = 'none';
            typingPanel.style.display = 'block';
            const input = document.getElementById('typing-answer');
            input.value = '';
            input.focus();
        }

        const feedbackEl = document.getElementById('feedback');
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback';

        const settings = Storage.getSettings();
        const timerWrap = document.getElementById('timer-container');
        if (settings.timerEnabled) {
            timerWrap.style.display = 'block';
            this.startTimer(config.timeLimitSeconds);
        } else {
            timerWrap.style.display = 'none';
            this.clearTimer();
        }

        this.isAnswering = true;
    },

    setupMcButtons(verb) {
        const container = document.getElementById('answer-options');
        container.innerHTML = '';
        getMcOptions(verb).forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'answer-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => {
                if (this.isAnswering) {
                    this.handleMcAnswer(option);
                }
            });
            container.appendChild(btn);
        });
    },

    handleMcAnswer(selected) {
        this.isAnswering = false;
        this.clearTimer();

        const result = GameLogic.checkMcAnswer(selected);
        const feedbackEl = document.getElementById('feedback');

        const verb = GameLogic.getCurrentVerb();
        document.querySelectorAll('.answer-btn').forEach((btn) => {
            btn.classList.remove('correct', 'wrong');
            if (verb && isPastAnswerCorrect(verb, btn.textContent)) {
                btn.classList.add('correct');
            }
            if (btn.textContent === selected && !result.isCorrect) {
                btn.classList.add('wrong');
            }
        });

        if (result.isCorrect) {
            feedbackEl.textContent = 'Correct!';
            feedbackEl.className = 'feedback correct';
        } else {
            feedbackEl.textContent = `Wrong. The past tense is "${result.correctPast}".`;
            feedbackEl.className = 'feedback wrong';
        }

        setTimeout(() => this.nextQuestion(), 1500);
    },

    handleTypingSubmit() {
        const input = document.getElementById('typing-answer');
        const result = GameLogic.checkTypingAnswer(input.value);
        this.isAnswering = false;
        this.clearTimer();

        const feedbackEl = document.getElementById('feedback');
        if (result.isCorrect) {
            feedbackEl.textContent = 'Correct!';
            feedbackEl.className = 'feedback correct';
        } else {
            feedbackEl.textContent = `Wrong. The past tense is "${result.correctPast}".`;
            feedbackEl.className = 'feedback wrong';
        }

        setTimeout(() => this.nextQuestion(), 1500);
    },

    startTimer(seconds) {
        this.timeRemaining = seconds;
        this.updateTimerDisplay();
        const timerEl = document.getElementById('timer');
        timerEl.classList.remove('warning');

        this.timerInterval = setInterval(() => {
            this.timeRemaining -= 0.1;
            this.updateTimerDisplay();
            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            } else if (this.timeRemaining <= 3) {
                timerEl.classList.add('warning');
            }
        }, 100);
    },

    updateTimerDisplay() {
        document.getElementById('timer').textContent = Math.max(0, Math.ceil(this.timeRemaining));
    },

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    handleTimeout() {
        this.clearTimer();
        if (!this.isAnswering) {
            return;
        }

        const qType = GameLogic.getCurrentQuestionType();
        const verb = GameLogic.getCurrentVerb();
        const correctPast = verb ? getPrimaryPastDisplay(verb) : '';

        if (qType === 'mc') {
            GameLogic.checkMcAnswer('');
        } else {
            GameLogic.checkTypingAnswer('');
        }

        this.isAnswering = false;
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.textContent = `Time's up. The past tense is "${correctPast}".`;
        feedbackEl.className = 'feedback wrong';

        if (qType === 'mc' && verb) {
            document.querySelectorAll('.answer-btn').forEach((btn) => {
                if (isPastAnswerCorrect(verb, btn.textContent)) {
                    btn.classList.add('correct');
                }
            });
        }

        setTimeout(() => this.nextQuestion(), 2000);
    },

    completeLevel() {
        this.clearTimer();
        this.isAnswering = false;

        const results = GameLogic.getLevelResults();
        document.getElementById('correct-count').textContent = results.correct;
        document.getElementById('wrong-count').textContent = results.wrong;
        document.getElementById('score-percent').textContent = `${results.percentage}%`;

        const titleEl = document.getElementById('level-complete-title');
        const messageEl = document.getElementById('level-complete-message');
        const nextBtn = document.getElementById('next-level-btn');
        const retryBtn = document.getElementById('retry-level-btn');

        const thresholdPct = Math.round(GameLogic.successThreshold * 100);

        if (results.passed) {
            titleEl.textContent = 'Level complete!';
            messageEl.textContent = `You scored ${results.percentage}%. Great job!`;
            messageEl.className = 'message success';

            const atMaxLevel = GameLogic.currentLevel >= GameLogic.levels.length;
            if (atMaxLevel) {
                Profiles.updateProfileProgress(GameLogic.currentLevel, GameLogic.verbStats);
                messageEl.textContent = 'You finished all 3 levels. Keep practicing!';
                nextBtn.style.display = 'none';
                retryBtn.textContent = 'Play again';
                retryBtn.style.display = 'inline-block';
            } else {
                GameLogic.advanceLevel();
                Profiles.updateProfileProgress(GameLogic.currentLevel, GameLogic.verbStats);
                nextBtn.style.display = 'inline-block';
                retryBtn.style.display = 'none';
            }
        } else {
            titleEl.textContent = 'Try again';
            messageEl.textContent = `You scored ${results.percentage}%. You need ${thresholdPct}% to pass.`;
            messageEl.className = 'message failure';
            nextBtn.style.display = 'none';
            retryBtn.textContent = 'Try again';
            retryBtn.style.display = 'inline-block';
            Profiles.updateProfileProgress(GameLogic.currentLevel, GameLogic.verbStats);
        }

        this.showScreen('levelComplete');
    }
};

window.App = App;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

export default App;
