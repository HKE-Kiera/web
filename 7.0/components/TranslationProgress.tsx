import React from 'react';
import { TranslationProgress as Progress } from '../types';

interface TranslationProgressProps {
    progress: Progress;
}

export const TranslationProgress: React.FC<TranslationProgressProps> = ({ progress }) => {
    const percentage = progress.totalChunks > 0 ? (progress.chunk / progress.totalChunks) * 100 : 0;

    return (
        <div className="w-full bg-gray-700 rounded-full h-8 my-4 p-1">
            <div
                className="bg-cyan-500 h-full rounded-full flex items-center justify-center text-sm font-medium text-white transition-all duration-300 ease-in-out"
                style={{ width: `${percentage}%` }}
            >
                {progress.totalChunks > 0 && <span>{`${progress.chunk} / ${progress.totalChunks}`}</span>}
            </div>
        </div>
    );
};
