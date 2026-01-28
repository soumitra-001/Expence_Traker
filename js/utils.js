export const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const getMonthKey = (date) => date.toISOString().slice(0, 7);

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Currency formatter factory
export const getCurrencyFormatter = (currencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currencyCode 
    });
};