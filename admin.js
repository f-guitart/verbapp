import {
    getAllVerbs,
    saveVerb,
    deleteVerb,
    exportVerbsJson,
    importVerbsJson,
    reloadVerbsFromFile
} from './verbs.js';

const Admin = {
    listEl: null,
    form: null,
    editingId: null,

    init() {
        this.listEl = document.getElementById('admin-verb-list');
        this.form = document.getElementById('admin-verb-form');
        this.bindEvents();
        this.renderList();
        this.resetForm();
    },

    bindEvents() {
        document.getElementById('admin-save-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        document.getElementById('admin-cancel-edit-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetForm();
        });

        document.getElementById('admin-reload-file-btn').addEventListener('click', async () => {
            const msg = document.getElementById('admin-message');
            const result = await reloadVerbsFromFile();
            if (result.success) {
                msg.textContent = `Loaded ${result.count} verb(s) from verbs.json.`;
                msg.className = 'feedback correct';
                this.renderList();
                this.resetForm();
            } else {
                msg.textContent = result.message;
                msg.className = 'feedback wrong';
            }
        });

        document.getElementById('admin-export-btn').addEventListener('click', () => {
            const blob = new Blob([exportVerbsJson()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'verbs-export.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('admin-import-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const result = importVerbsJson(reader.result);
                const msg = document.getElementById('admin-message');
                if (result.success) {
                    msg.textContent = `Imported ${result.count} verb(s).`;
                    msg.className = 'feedback correct';
                    this.renderList();
                    this.resetForm();
                } else {
                    msg.textContent = result.message;
                    msg.className = 'feedback wrong';
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        document.getElementById('admin-back-btn').addEventListener('click', () => {
            if (window.App) {
                window.App.showProfileScreen();
            }
        });
    },

    renderList() {
        const verbs = getAllVerbs();
        this.listEl.innerHTML = '';

        if (verbs.length === 0) {
            this.listEl.innerHTML = '<p class="hint">No verbs yet. Add one below or import JSON.</p>';
            return;
        }

        verbs.forEach((verb) => {
            const row = document.createElement('div');
            row.className = 'admin-verb-row';
            row.innerHTML = `
                <div class="admin-verb-summary">
                    <strong>${escapeHtml(verb.base)}</strong>
                    <span class="admin-verb-past">→ ${escapeHtml(verb.past)}</span>
                </div>
                <div class="admin-verb-actions">
                    <button type="button" class="btn btn-secondary btn-small" data-edit="${escapeHtml(verb.id)}">Edit</button>
                    <button type="button" class="btn btn-link btn-small" data-delete="${escapeHtml(verb.id)}">Delete</button>
                </div>
            `;

            row.querySelector('[data-edit]').addEventListener('click', () => this.loadForEdit(verb));
            row.querySelector('[data-delete]').addEventListener('click', () => {
                if (confirm(`Delete "${verb.base}"?`)) {
                    deleteVerb(verb.id);
                    this.renderList();
                    if (this.editingId === verb.id) {
                        this.resetForm();
                    }
                }
            });

            this.listEl.appendChild(row);
        });
    },

    loadForEdit(verb) {
        this.editingId = verb.id;
        document.getElementById('admin-base').value = verb.base;
        document.getElementById('admin-past').value = verb.past;
        document.getElementById('admin-wrong1').value = verb.wrong1;
        document.getElementById('admin-wrong2').value = verb.wrong2;
        document.getElementById('admin-aliases').value = (verb.pastAliases || []).join(', ');
        document.getElementById('admin-form-title').textContent = 'Edit verb';
        document.getElementById('admin-cancel-edit-btn').style.display = 'inline-block';
    },

    resetForm() {
        this.editingId = null;
        this.form.reset();
        document.getElementById('admin-form-title').textContent = 'Add verb';
        document.getElementById('admin-cancel-edit-btn').style.display = 'none';
        document.getElementById('admin-message').textContent = '';
        document.getElementById('admin-message').className = 'feedback';
    },

    handleSave() {
        const aliasesRaw = document.getElementById('admin-aliases').value;
        const pastAliases = aliasesRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        const payload = {
            base: document.getElementById('admin-base').value,
            past: document.getElementById('admin-past').value,
            wrong1: document.getElementById('admin-wrong1').value,
            wrong2: document.getElementById('admin-wrong2').value,
            pastAliases,
            id: this.editingId || undefined,
            _originalId: this.editingId || undefined
        };

        const result = saveVerb(payload);
        const msg = document.getElementById('admin-message');
        if (!result.valid) {
            msg.textContent = result.message;
            msg.className = 'feedback wrong';
            return;
        }

        msg.textContent = this.editingId ? 'Verb updated.' : 'Verb added.';
        msg.className = 'feedback correct';
        this.renderList();
        this.resetForm();
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default Admin;
