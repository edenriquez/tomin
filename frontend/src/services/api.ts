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
    }
};
