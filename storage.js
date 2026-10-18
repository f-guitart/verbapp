// LocalStorage for profiles, verbs, and settings

const PROFILE_KEY = 'verbGameProfiles';
const VERBS_KEY = 'verbGameVerbs';
const SETTINGS_KEY = 'verbGameSettings';

const Storage = {
    getProfiles() {
        const data = localStorage.getItem(PROFILE_KEY);
        return data ? JSON.parse(data) : { profiles: {}, currentProfile: null };
    },

    saveProfiles(data) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    },

    getCurrentProfile() {
        return this.getProfiles().currentProfile;
    },

    setCurrentProfile(profileName) {
        const data = this.getProfiles();
        data.currentProfile = profileName;
        this.saveProfiles(data);
    },

    getProfile(profileName) {
        const data = this.getProfiles();
        return data.profiles[profileName] || null;
    },

    saveProfile(profileName, profileData) {
        const data = this.getProfiles();
        data.profiles[profileName] = profileData;
        this.saveProfiles(data);
    },

    createProfile(profileName) {
        const data = this.getProfiles();
        if (data.profiles[profileName]) {
            return false;
        }
        data.profiles[profileName] = {
            level: 1,
            verbStats: {},
            lastPlayed: new Date().toISOString()
        };
        this.saveProfiles(data);
        return true;
    },

    getAllProfileNames() {
        return Object.keys(this.getProfiles().profiles);
    },

    getSettings() {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
        return { timerEnabled: false };
    },

    saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },

    hasVerbsInStorage() {
        return localStorage.getItem(VERBS_KEY) !== null;
    },

    getVerbs() {
        const raw = localStorage.getItem(VERBS_KEY);
        if (!raw) {
            return [];
        }
        return JSON.parse(raw);
    },

    saveVerbs(verbs) {
        localStorage.setItem(VERBS_KEY, JSON.stringify(verbs));
    }
};

export default Storage;
