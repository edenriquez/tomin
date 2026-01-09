import { useState, useEffect, useCallback } from 'react';
import { financialService } from '@/services/api';

export const useDashboardData = (userId: string = '00000000-0000-0000-0000-000000000000') => {
    const [spendingData, setSpendingData] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ message: string; visible: boolean }>({
        message: '',
        visible: false
    });

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
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const eventSource = new EventSource(`http://localhost:8000/api/notifications/${userId}`);

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
