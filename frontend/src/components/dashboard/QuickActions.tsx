import React from 'react';
import UploadFile from '@/components/upload/UploadFile';

export const QuickActions: React.FC = () => {
    return (
        <div className="card">
            <h3 className="mb-4 text-sm font-bold uppercase text-gray-500 tracking-wider">Acciones Rápidas</h3>
            <div className="flex flex-col gap-3">
                <UploadFile />
            </div>
        </div>
    );
};
