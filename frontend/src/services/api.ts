import { createClient } from '../utils/supabase/client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getAuthHeaders(isFormData = false) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        // You might want to handle this more gracefully, e.g. redirect to login
        throw new Error("No active session");
    }

    const headers: HeadersInit = {
        'Authorization': `Bearer ${session.access_token}`
    };

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

export const financialService = {
    async getSpendingDistribution(period?: string) {
        const headers = await getAuthHeaders();
        let query = '';
        if (period) {
            query = `?period=${period}`;
        }
        const response = await fetch(`${API_URL}/transactions/spending-distribution${query}`, {
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch spending distribution');
        return response.json();
    },

    async getTransactions() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/transactions/`, {
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
    },

    async getRecurringTransactions(period?: string) {
        const headers = await getAuthHeaders();
        let query = '';
        if (period) {
            query = `?period=${period}`;
        }
        const response = await fetch(`${API_URL}/transactions/recurring${query}`, {
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch recurring transactions');
        return response.json();
    },

    async getForecast() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/forecast/`, {
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch forecast');
        return response.json();
    },

    async uploadBankStatement(file: File) {
        const headers = await getAuthHeaders(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/transactions/upload-bank-statement`, {
            method: 'POST',
            headers, // Content-Type is handled by browser for FormData
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload bank statement');
        return response.json();
    }
};
