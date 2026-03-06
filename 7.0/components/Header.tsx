
import React from 'react';
import { SunIcon, MoonIcon } from './icons';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
    return (
        <header className="relative z-50 py-4 px-8 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg transition-colors duration-300">
            <div className="flex justify-between items-center max-w-[1600px] mx-auto">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
                        Manhattan Project
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nuke là chân ái</p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <button 
                        type="button"
                        onClick={toggleTheme}
                        className="cursor-pointer p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        title={theme === 'dark' ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                    >
                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                </div>
            </div>
        </header>
    );
};
