import { useState, useEffect, useCallback } from 'react';
import { financialService } from '@/services/api';
import { createClient } from '@/utils/supabase/client';
import { API_URL } from '@/services/api';

export const useDashboardData = () => {
    const [spendingData, setSpendingData] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; visible: boolean }>({
        message: '',
        visible: false
    });

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        }
        fetchUser();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [distribution, txs] = await Promise.all([
                financialService.getSpendingDistribution(),
                financialService.getTransactions()
            ]);

            const mappedDistribution = distribution.map((item: any) => ({
                category: item.category_name,
                amount: item.total_amount,
                color: item.color,
                percentage: Math.round(item.percentage)
            }));

            setSpendingData(mappedDistribution);
            setTransactions(txs);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only fetch data once we have a user (or at least attempted to auth) 
        // Although financialService handles auth internally, so we can probably just fetch.
        // But let's fetch immediately as token handling is inside api.ts
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!userId) return;

        // Note: SSE endpoint still requires userId in path for now, need to ensure backend permits this
        const eventSource = new EventSource(`${API_URL}/notifications/${userId}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'UPLOAD_COMPLETE') {
                setNotification({
                    message: data.message,
                    visible: true
                });
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [userId]);

    const hideNotification = () => setNotification(prev => ({ ...prev, visible: false }));

    return {
        spendingData,
        transactions,
        loading,
        notification,
        fetchData,
        hideNotification
    };
};
