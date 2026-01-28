import { StateManager } from './state.js';
import { Engine } from './engine.js';
import { UIManager } from './ui.js';
import { clearStorage, loadFromStorage } from './storage.js';

// Initialize Core
const sm = new StateManager();
const engine = new Engine(sm);
const ui = new UIManager(sm, engine);

// Logic for Settings page specific buttons
document.getElementById('btnExportSettings').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(sm.state)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    ui.toast('Data exported');
});

document.getElementById('btnExport').addEventListener('click', () => {
    // Reuse the same logic
    document.getElementById('btnExportSettings').click();
});

document.getElementById('btnImportTrigger').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (input) => {
    const file = input.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(data.transactions) {
                sm.state = data;
                sm.checkpoint('Import Data');
                sm.save();
                sm.notify();
                ui.toast('Data imported successfully');
            } else {
                alert('Invalid file format');
            }
        } catch(err) { alert('Error parsing file'); }
    };
    reader.readAsText(file);
});

document.getElementById('btnClearData').addEventListener('click', () => {
    if(confirm("Are you sure? This will delete all your data permanently.")) {
        clearStorage();
        location.reload();
    }
});

document.getElementById('btnEditBudgets').addEventListener('click', () => {
    const cat = prompt("Enter category name to set/edit budget:");
    if(cat) {
        const amt = prompt(`Set budget limit for ${cat}:`, sm.state.budgets[cat] || 0);
        if(amt !== null) sm.updateBudget(cat, parseFloat(amt));
    }
});

document.getElementById('btnAddRule').addEventListener('click', () => {
    const amount = parseFloat(prompt("Monthly Amount:"));
    if(!amount) return;
    const category = prompt("Category:");
    const day = prompt("Day of Month (1-28):", "1");
    
    sm.addRecurringRule({
        id: Date.now().toString(36),
        type: 'expense',
        amount,
        category: category || 'Misc',
        dayOfMonth: day || 1,
        frequency: 'monthly'
    });
    ui.toast('Recurring rule added');
});

// Initial Boot
engine.processRecurring();
ui.render();