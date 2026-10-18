import Storage from './storage.js';

const Profiles = {
    init(container, onProfileSelected) {
        this.container = container;
        this.onProfileSelected = onProfileSelected;
        this.render();
    },

    render() {
        const profileNames = Storage.getAllProfileNames();
        const currentProfile = Storage.getCurrentProfile();

        this.container.innerHTML = '';

        if (profileNames.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No profiles yet. Create one below!';
            emptyMsg.className = 'hint';
            this.container.appendChild(emptyMsg);
        } else {
            profileNames.forEach((name) => {
                const profileItem = document.createElement('div');
                profileItem.className = 'profile-item';
                if (name === currentProfile) {
                    profileItem.classList.add('selected');
                }

                const profileData = Storage.getProfile(name);
                const level = profileData ? profileData.level : 1;

                profileItem.innerHTML = `
                    <div class="profile-name"><strong>${this.escapeHtml(name)}</strong></div>
                    <div class="profile-level-chip">Level ${level}</div>
                `;

                profileItem.addEventListener('click', () => {
                    this.selectProfile(name);
                });

                this.container.appendChild(profileItem);
            });
        }
    },

    selectProfile(profileName) {
        Storage.setCurrentProfile(profileName);
        this.render();
        if (this.onProfileSelected) {
            this.onProfileSelected(profileName);
        }
    },

    createProfile(name) {
        if (!name || typeof name !== 'string') {
            return { success: false, message: 'Please enter a profile name' };
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            return { success: false, message: 'Please enter a profile name' };
        }
        if (trimmedName.length > 20) {
            return { success: false, message: 'Profile name must be 20 characters or less' };
        }

        const created = Storage.createProfile(trimmedName);
        if (created) {
            Storage.setCurrentProfile(trimmedName);
            this.render();
            return { success: true, message: 'Profile created!' };
        }
        return { success: false, message: 'Profile name already exists' };
    },

    getCurrentProfileData() {
        const profileName = Storage.getCurrentProfile();
        if (!profileName) {
            return null;
        }
        return Storage.getProfile(profileName);
    },

    updateProfileProgress(level, verbStats) {
        const profileName = Storage.getCurrentProfile();
        if (!profileName) {
            return;
        }

        const profileData = Storage.getProfile(profileName);
        if (profileData) {
            profileData.level = level;
            profileData.verbStats = verbStats;
            profileData.lastPlayed = new Date().toISOString();
            Storage.saveProfile(profileName, profileData);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

export default Profiles;
