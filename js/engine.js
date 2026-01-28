import { uuid } from './utils.js';

export class Engine {
    constructor(stateManager) {
        this.sm = stateManager;
        this.currentMonth = new Date().toISOString().slice(0, 7);
    }

    processRecurring() {
        const generated = [];
        const rules = this.sm.state.recurringRules;
        const existingKeys = new Set(this.sm.state.transactions.map(t => `${t.date}_${t.amount}_${t.category}`));

        rules.forEach(rule => {
            const date = new Date(this.currentMonth + '-01');
            let targetDay = parseInt(rule.dayOfMonth);
            if (targetDay > 28) targetDay = 28;
            
            const instanceDate = new Date(date.getFullYear(), date.getMonth(), targetDay);
            const dateStr = instanceDate.toISOString().split('T')[0];

            const uniqueKey = `${dateStr}_${rule.amount}_${rule.category}`;
            
            if (!existingKeys.has(uniqueKey)) {
                generated.push({
                    id: uuid(),
                    type: rule.type,
                    amount: rule.amount,
                    category: rule.category,
                    date: dateStr,
                    notes: `Recurring: ${rule.category}`,
                    isRecurringInstance: true
                });
            }
        });

        if (generated.length > 0) {
            this.sm.state.transactions = [...this.sm.state.transactions, ...generated];
            this.sm.save();
            // We don't notify here to prevent circular loops or double renders, handled by caller
        }
    }

    getFilteredTransactions(search = '', typeFilter = 'all', month = null) {
        let data = this.sm.state.transactions;

        if (month) {
            data = data.filter(t => t.date.startsWith(month));
        }

        if (typeFilter !== 'all') {
            data = data.filter(t => t.type === typeFilter);
        }

        if (search) {
            const lower = search.toLowerCase();
            data = data.filter(t => 
                t.notes.toLowerCase().includes(lower) || 
                t.category.toLowerCase().includes(lower)
            );
        }

        return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getAggregation(transactions) {
        return transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else acc.expense += t.amount;
            acc.net += (t.type === 'income' ? t.amount : -t.amount);
            return acc;
        }, { income: 0, expense: 0, net: 0 });
    }

    getCategoryBreakdown(transactions) {
        const map = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            map[t.category] = (map[t.category] || 0) + t.amount;
        });
        return map;
    }

    getBudgetStatus(transactions) {
        const breakdown = this.getCategoryBreakdown(transactions);
        const budgets = this.sm.state.budgets;
        
        return Object.keys(budgets).map(cat => ({
            category: cat,
            limit: budgets[cat],
            spent: breakdown[cat] || 0,
            percentage: budgets[cat] > 0 ? ((breakdown[cat] || 0) / budgets[cat]) * 100 : 0
        }));
    }
}