const DB_KEY = 'profinance_db';

export const loadFromStorage = () => {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) { console.error("Data load error", e); return null; }
    }
    return null;
};

export const saveToStorage = (data) => {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const clearStorage = () => {
    localStorage.removeItem(DB_KEY);
};