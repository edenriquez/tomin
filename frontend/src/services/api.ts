const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const financialService = {
    async getSpendingDistribution(period?: string) {
        const userId = '00000000-0000-0000-0000-000000000000';
        let query = `?user_id=${userId}`;
        if (period) {
            query += `&period=${period}`;
        }
        const response = await fetch(`${API_URL}/transactions/spending-distribution${query}`);
        if (!response.ok) throw new Error('Failed to fetch spending distribution');
        return response.json();
    },

    async getTransactions() {
        const response = await fetch(`${API_URL}/transactions/`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
    },

    async getRecurringTransactions(period?: string) {
        const userId = '00000000-0000-0000-0000-000000000000';
        let query = `?user_id=${userId}`;
        if (period) {
            query += `&period=${period}`;
        }
        const response = await fetch(`${API_URL}/transactions/recurring${query}`);
        if (!response.ok) throw new Error('Failed to fetch recurring transactions');
        return response.json();
    },

    async getForecast() {
        const response = await fetch(`${API_URL}/forecast/`);
        if (!response.ok) throw new Error('Failed to fetch forecast');
        return response.json();
    },

    async uploadBankStatement(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/transactions/upload-bank-statement`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload bank statement');
        return response.json();
    }
};
