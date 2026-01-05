import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Initialization: check local storage or system preference
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        setTheme(initialTheme);

        if (initialTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="relative flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-[#1a2332] dark:hover:bg-gray-800"
            aria-label="Toggle theme"
        >
            <div className="relative size-5 overflow-hidden">
                <Sun
                    className={`absolute inset-0 transition-transform duration-500 ease-in-out ${theme === 'dark' ? 'translate-y-8 rotate-90 scale-0' : 'translate-y-0 rotate-0 scale-100'
                        } text-orange-500`}
                    size={20}
                />
                <Moon
                    className={`absolute inset-0 transition-transform duration-500 ease-in-out ${theme === 'light' ? '-translate-y-8 -rotate-90 scale-0' : 'translate-y-0 rotate-0 scale-100'
                        } text-blue-400`}
                    size={20}
                />
            </div>
        </button>
    );
};
