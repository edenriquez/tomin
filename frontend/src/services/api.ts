const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const financialService = {
    async getSpendingDistribution() {
        const response = await fetch(`${API_URL}/spending-distribution`);
        if (!response.ok) throw new Error('Failed to fetch spending distribution');
        return response.json();
    },

    async getForecast() {
        const response = await fetch(`${API_URL}/forecast`);
        if (!response.ok) throw new Error('Failed to fetch forecast');
        return response.json();
    },

    async uploadBankStatement(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/upload-bank-statement`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload bank statement');
        return response.json();
    }
};
