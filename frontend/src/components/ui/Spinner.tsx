import React from 'react';

export const Spinner = () => (
    <div className="flex items-center justify-center p-12">
        <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-blue-100 dark:border-blue-900/20"></div>
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
    </div>
);
