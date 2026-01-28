import { loadFromStorage, saveToStorage } from './storage.js';

export class StateManager {
    constructor() {
        this.state = {
            transactions: [],
            recurringRules: [],
            budgets: {},
            settings: {
                theme: 'light',
                currency: 'USD' // New Feature
            }
        };
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 20;
        this.listeners = [];
        
        this.load();
    }

    load() {
        const saved = loadFromStorage();
        if (saved) {
            this.state = { ...this.state, ...saved };
        }
        this.notify();
    }

    save() {
        saveToStorage(this.state);
    }

    checkpoint(actionName) {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        const snapshot = JSON.parse(JSON.stringify(this.state));
        this.history.push({ state: snapshot, action: actionName });
        if (this.history.length > this.maxHistory) this.history.shift();
        else this.historyIndex++;
        this.save();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
            this.save();
            this.notify();
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
            this.save();
            this.notify();
            return true;
        }
        return false;
    }

    // Settings
    updateSetting(key, value) {
        this.state.settings[key] = value;
        this.checkpoint('Update Setting');
        this.save();
        this.notify();
    }

    // Transactions
    addTransaction(t) {
        this.state.transactions.push(t);
        this.checkpoint('Add Transaction');
        this.save();
        this.notify();
    }

    updateTransaction(id, updates) {
        const idx = this.state.transactions.findIndex(t => t.id === id);
        if (idx > -1) {
            this.state.transactions[idx] = { ...this.state.transactions[idx], ...updates };
            this.checkpoint('Edit Transaction');
            this.save();
            this.notify();
        }
    }

    deleteTransaction(id) {
        this.state.transactions = this.state.transactions.filter(t => t.id !== id);
        this.checkpoint('Delete Transaction');
        this.save();
        this.notify();
    }

    // Rules & Budgets
    addRecurringRule(rule) {
        this.state.recurringRules.push(rule);
        this.checkpoint('Add Recurring Rule');
        this.save();
        this.notify();
    }

    updateBudget(category, amount) {
        if (amount === 0) delete this.state.budgets[category];
        else this.state.budgets[category] = parseFloat(amount);
        this.checkpoint('Update Budget');
        this.save();
        this.notify();
    }

    subscribe(fn) { this.listeners.push(fn); }
    notify() { this.listeners.forEach(fn => fn(this.state)); }
}