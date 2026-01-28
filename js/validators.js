export const validateTransaction = (data) => {
    if (!data.amount || data.amount <= 0) return { valid: false, message: "Amount must be positive." };
    if (!data.date) return { valid: false, message: "Date is required." };
    if (!data.category) return { valid: false, message: "Category is required." };
    return { valid: true };
};