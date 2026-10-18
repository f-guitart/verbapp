import { getAllVerbs, getPrimaryPastDisplay, getPrimaryTranslationDisplay } from './verbs.js';

const Study = {
    tableBody: null,
    revealed: { past: false, translation: false },

    init() {
        this.tableBody = document.getElementById('study-table-body');
        document.getElementById('study-back-btn').addEventListener('click', () => {
            window.App.showProfileScreen();
        });

        document.querySelectorAll('.study-col-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const col = btn.dataset.column;
                this.revealed[col] = !this.revealed[col];
                btn.classList.toggle('revealed', this.revealed[col]);
                btn.setAttribute(
                    'aria-pressed',
                    this.revealed[col] ? 'true' : 'false'
                );
                this.render();
            });
        });
    },

    show() {
        this.render();
        window.App.showScreen('study');
    },

    render() {
        const verbs = getAllVerbs();
        this.tableBody.innerHTML = '';

        if (verbs.length === 0) {
            this.tableBody.innerHTML =
                '<tr><td colspan="3" class="hint">No verbs loaded.</td></tr>';
            return;
        }

        verbs.forEach((verb) => {
            const row = document.createElement('tr');
            const pastText = getPrimaryPastDisplay(verb);
            const translationText = getPrimaryTranslationDisplay(verb);

            row.innerHTML = `
                <td>${escapeHtml(verb.base)}</td>
                <td class="study-cell ${this.revealed.past ? 'revealed' : 'masked'}">${escapeHtml(
                this.revealed.past ? pastText : '•••'
            )}</td>
                <td class="study-cell ${this.revealed.translation ? 'revealed' : 'masked'}">${escapeHtml(
                this.revealed.translation ? translationText : '•••'
            )}</td>
            `;
            this.tableBody.appendChild(row);
        });
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default Study;
