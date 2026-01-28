import { getMonthKey, getCurrencyFormatter } from './utils.js';
import { Charts } from './charts.js';

export class UIManager {
    constructor(stateManager, engine) {
        this.sm = stateManager;
        this.engine = engine;
        this.searchTerm = '';
        this.typeFilter = 'all';
        
        this.sm.subscribe(() => this.render());
        
        // Event Listeners
        this.initListeners();
        
        // Initial Theme
        document.documentElement.setAttribute('data-theme', this.sm.state.settings.theme);
        
        // Initial Currency Selector
        const currSelect = document.getElementById('currencySelector');
        if(currSelect) currSelect.value = this.sm.state.settings.currency;

        this.populateMonthSelector();
    }

    initListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => {
            const newTheme = this.sm.state.settings.theme === 'light' ? 'dark' : 'light';
            this.sm.updateSetting('theme', newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
        });

        document.getElementById('globalMonthSelector').addEventListener('change', (e) => {
            this.changeMonth(e.target.value);
        });

        document.getElementById('currencySelector').addEventListener('change', (e) => {
            this.sm.updateSetting('currency', e.target.value);
            this.toast('Currency updated');
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('typeFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        // Nav
        document.querySelectorAll('nav li button').forEach(btn => {
            btn.addEventListener('click', (e) => this.navigate(btn.dataset.target));
        });

        // Undo/Redo
        document.getElementById('btnUndo').addEventListener('click', () => {
            if(this.sm.undo()) this.toast('Undo successful');
        });
        document.getElementById('btnRedo').addEventListener('click', () => {
            if(this.sm.redo()) this.toast('Redo successful');
        });

        // Modal
        document.getElementById('btnAdd').addEventListener('click', () => this.openModal());
        document.getElementById('btnCancelModal').addEventListener('click', () => this.closeModal());
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.saveTransaction(e));

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if(this.sm.undo()) this.toast('Undo');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if(this.sm.redo()) this.toast('Redo');
            }
        });
    }

    // Helpers
    toast(msg) {
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    formatCurrency(amount) {
        const formatter = getCurrencyFormatter(this.sm.state.settings.currency);
        return formatter.format(amount);
    }

    populateMonthSelector() {
        const sel = document.getElementById('globalMonthSelector');
        const months = [];
        const d = new Date();
        for (let i = 0; i < 6; i++) {
            months.push(getMonthKey(d));
            d.setMonth(d.getMonth() - 1);
        }
        sel.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
        sel.value = this.engine.currentMonth;
    }

    changeMonth(val) {
        this.engine.currentMonth = val;
        this.engine.processRecurring();
        this.render();
    }

    navigate(viewId) {
        document.querySelectorAll('.content-view').forEach(el => el.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
        document.querySelectorAll('nav li button').forEach(el => el.classList.remove('active'));
        document.querySelector(`nav li button[data-target="${viewId}"]`).classList.add('active');
        
        if (viewId === 'dashboard') setTimeout(() => this.renderDashboard(), 50);
        if (viewId === 'reports') setTimeout(() => this.renderReports(), 50);
    }

    // Render Pipeline
    render() {
        const txs = this.engine.getFilteredTransactions(this.searchTerm, this.typeFilter, this.engine.currentMonth);
        const agg = this.engine.getAggregation(txs);

        // Sidebar
        document.getElementById('sidebarBalance').innerText = this.formatCurrency(agg.net);
        document.getElementById('sidebarIncome').innerText = this.formatCurrency(agg.income);
        document.getElementById('sidebarExpense').innerText = this.formatCurrency(agg.expense);

        // Transaction List
        this.renderList(txs);
        
        // Dashboard
        if(document.getElementById('view-dashboard').classList.contains('active')) {
            this.renderDashboard();
        }
    }

    renderList(txs) {
        const tbody = document.getElementById('transactionTableBody');
        const empty = document.getElementById('emptyState');
        tbody.innerHTML = '';

        if (txs.length === 0) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        txs.forEach(t => {
            const tr = document.createElement('tr');
            const isInc = t.type === 'income';
            
            // Create actions HTML string
            const actionsHtml = `
                <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${t.id}">✎</button>
                <button class="btn btn-secondary btn-sm" data-action="copy" data-id="${t.id}">⧉</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}">✕</button>
            `;

            tr.innerHTML = `
                <td>${t.date}</td>
                <td>
                    <div>${t.notes}</div>
                    ${t.isRecurringInstance ? '<span class="tag">Recurring</span>' : ''}
                </td>
                <td><span class="tag">${t.category}</span></td>
                <td class="${isInc ? 'amount-income' : 'amount-expense'}">
                    ${isInc ? '+' : '-'}${this.formatCurrency(t.amount)}
                </td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Attach event listeners to buttons
        tbody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === 'edit') this.openModal(id);
                if (action === 'copy') this.duplicateTransaction(id);
                if (action === 'delete') this.deleteTransaction(id);
            });
        });
    }

    renderDashboard() {
        const txs = this.engine.getFilteredTransactions('', 'all', this.engine.currentMonth);
        const expenses = this.engine.getFilteredTransactions('', 'expense', this.engine.currentMonth);
        
        // 1. Category Pie
        const catData = this.engine.getCategoryBreakdown(expenses);
        Charts.pie(document.getElementById('categoryChart'), catData);

        // 2. IE Bar
        const agg = this.engine.getAggregation(txs);
        Charts.bar(document.getElementById('ieChart'), {
            'Income': agg.income,
            'Expense': agg.expense
        });

        // 3. Budget Progress
        const budgets = this.engine.getBudgetStatus(expenses);
        const bContainer = document.getElementById('dashboardBudgets');
        bContainer.innerHTML = '';
        
        budgets.forEach(b => {
            const color = b.percentage > 100 ? 'var(--danger)' : (b.percentage > 80 ? 'var(--warning)' : 'var(--success)');
            bContainer.innerHTML += `
                <div class="budget-item">
                    <div class="budget-header">
                        <span>${b.category}</span>
                        <span>${this.formatCurrency(b.spent)} / ${this.formatCurrency(b.limit)}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${Math.min(b.percentage, 100)}%; background: ${color}"></div>
                    </div>
                </div>
            `;
        });
    }
    
    renderReports() {
        const txs = this.engine.getFilteredTransactions('', 'all', this.engine.currentMonth);
        const expenses = this.engine.getFilteredTransactions('', 'expense', this.engine.currentMonth);
        const agg = this.engine.getAggregation(txs);
        
        // Calculations
        const daysInMonth = new Date(this.engine.currentMonth + '-01').getDate() || 30;
        const avg = agg.expense / (new Date().getDate() || 1);
        document.getElementById('reportAvgDaily').innerText = this.formatCurrency(avg) + ' / day';

        const sorted = [...expenses].sort((a,b) => b.amount - a.amount);
        document.getElementById('reportBiggestExpense').innerText = sorted.length ? 
            `${sorted[0].category}: ${this.formatCurrency(sorted[0].amount)}` : 'None';

        const forecast = avg * daysInMonth;
        document.getElementById('reportForecast').innerText = this.formatCurrency(forecast);
        
        // Mock Trend
        const trends = Array.from({length: 6}, () => Math.random() * 1000 + 500);
        Charts.line(document.getElementById('trendChart'), trends);
    }

    // Actions
    handleSearch(val) {
        this.searchTerm = val;
        this.render();
    }

    applyFilters() {
        this.typeFilter = document.getElementById('typeFilter').value;
        this.render();
    }

    openModal(editId = null) {
        const overlay = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('modalTitle');
        const btnSplit = document.getElementById('btnSplit');

        form.reset();
        document.getElementById('dateInput').valueAsDate = new Date();

        if (editId) {
            const t = this.sm.state.transactions.find(x => x.id === editId);
            title.innerText = 'Edit Transaction';
            form.id.value = t.id;
            form.type.value = t.type;
            form.amount.value = t.amount;
            form.date.value = t.date;
            form.category.value = t.category;
            form.notes.value = t.notes;
            btnSplit.classList.remove('hidden');
        } else {
            title.innerText = 'Add Transaction';
            form.id.value = '';
            btnSplit.classList.add('hidden');
        }
        overlay.classList.add('open');
    }

    closeModal() {
        document.getElementById('transactionModal').classList.remove('open');
    }

    saveTransaction(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        
        const t = {
            id: data.id || Date.now().toString(36),
            type: data.type,
            amount: parseFloat(data.amount),
            date: data.date,
            category: data.category,
            notes: data.notes,
            isRecurringInstance: false
        };

        if (data.id) this.sm.updateTransaction(data.id, t);
        else this.sm.addTransaction(t);

        this.closeModal();
        this.toast('Transaction saved');
    }

    duplicateTransaction(id) {
        const original = this.sm.state.transactions.find(t => t.id === id);
        if (original) {
            const copy = { ...original, id: Date.now().toString(36), notes: `Copy of ${original.notes}`, date: new Date().toISOString().split('T')[0] };
            this.sm.addTransaction(copy);
            this.toast('Transaction duplicated');
        }
    }

    deleteTransaction(id) {
        if(confirm('Delete this transaction?')) {
            this.sm.deleteTransaction(id);
            this.toast('Transaction deleted');
        }
    }
}