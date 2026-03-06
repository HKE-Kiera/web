
import React from 'react';
import { ProcessingFile } from '../types';
import { CheckIcon, DownloadIcon, TrashIcon, RefreshIcon, WarningIcon } from './icons';

interface FileListProps {
    files: ProcessingFile[];
    activeFileId: string | null;
    onRemoveFile: (id: string) => void;
    onSelectFile: (id: string) => void;
    isTranslating: boolean;
    onDownloadAll: () => void;
    onMergeDownload: () => void;
    onRetranslate: (id: string) => void; // New prop
}

// Wrap in React.memo
export const FileList: React.FC<FileListProps> = React.memo(({ 
    files, 
    activeFileId, 
    onRemoveFile, 
    onSelectFile,
    isTranslating,
    onDownloadAll,
    onMergeDownload,
    onRetranslate
}) => {
    if (files.length === 0) return null;

    const completedFilesCount = files.filter(f => f.status === 'completed').length;

    const handleDownload = (e: React.MouseEvent, file: ProcessingFile) => {
        e.stopPropagation();
        if (!file.translatedContent) return;

        const blob = new Blob([file.translatedContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nameParts = file.file.name.split('.');
        if (nameParts.length > 1) nameParts.pop(); // Remove extension
        a.download = `${nameParts.join('.')}_VN.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
             {/* Download Buttons - Only visible if there are completed files */}
             {completedFilesCount > 0 && (
                <div className="mb-3 flex space-x-2">
                    <button
                        onClick={onDownloadAll}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 hover:text-green-800 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded-lg transition-all text-xs font-bold uppercase tracking-wider group"
                        title="Tải xuống từng file riêng lẻ trong 1 file ZIP"
                    >
                        <DownloadIcon />
                        <span className="ml-1">Tải ZIP ({completedFilesCount})</span>
                    </button>
                    <button
                        onClick={onMergeDownload}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 hover:text-cyan-800 dark:hover:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-lg transition-all text-xs font-bold uppercase tracking-wider group"
                        title="Gộp tất cả bản dịch thành 1 file duy nhất"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="ml-1">Gộp File</span>
                    </button>
                </div>
            )}

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {files.map((file) => {
                    const percentage = file.progress.totalChunks > 0 
                        ? Math.round((file.progress.chunk / file.progress.totalChunks) * 100) 
                        : 0;

                    let statusColor = 'bg-gray-400 dark:bg-gray-600';
                    let statusText = 'Chờ xử lý';
                    
                    if (file.status === 'translating') {
                        statusColor = 'bg-cyan-500 animate-pulse';
                        statusText = `Đang dịch ${percentage}%`;
                    } else if (file.status === 'completed') {
                        if (file.validationStats && !file.validationStats.isComplete) {
                            statusColor = 'bg-yellow-500';
                            statusText = `Cảnh báo: Thiếu ${file.validationStats.missingPercentage}%`;
                        } else {
                            statusColor = 'bg-green-500';
                            statusText = 'Hoàn tất';
                        }
                    } else if (file.status === 'error') {
                        statusColor = 'bg-red-500';
                        // Show specific error message or fallback
                        statusText = file.error ? `Lỗi: ${file.error}` : 'Lỗi không xác định';
                    }

                    return (
                        <div 
                            key={file.id}
                            onClick={() => onSelectFile(file.id)}
                            className={`
                                relative group p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${activeFileId === file.id 
                                    ? 'bg-white dark:bg-gray-800 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                    : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`}></div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={file.file.name}>
                                        {file.file.name}
                                    </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {file.status === 'completed' && (
                                        <>
                                            {file.validationStats && !file.validationStats.isComplete && (
                                                <div className="mr-2 group relative">
                                                    <WarningIcon />
                                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                        Cảnh báo: Có thể thiếu nội dung.
                                                        <br />
                                                        Gốc: {file.validationStats.sourceLines} dòng
                                                        <br />
                                                        Dịch: {file.validationStats.translatedLines} dòng
                                                        <br />
                                                        Thiếu: {file.validationStats.missingPercentage}%
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => handleDownload(e, file)}
                                            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                            title="Tải xuống"
                                        >
                                            <DownloadIcon />
                                        </button>
                                        </>
                                    )}
                                    {(file.status === 'completed' || file.status === 'error') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRetranslate(file.id); }}
                                            disabled={isTranslating}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Dịch lại"
                                        >
                                            <RefreshIcon />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }}
                                        disabled={isTranslating && file.status === 'translating'}
                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Xóa"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-900 rounded-full h-1.5 mb-1">
                                <div 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${statusColor}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                <span className="flex-shrink-0">{(file.file.size / 1024).toFixed(1)} KB</span>
                                <span 
                                    className={`ml-2 truncate ${
                                        file.status === 'error' ? 'text-red-500 dark:text-red-400 lowercase normal-case' : 
                                        (file.validationStats && !file.validationStats.isComplete) ? 'text-yellow-600 dark:text-yellow-500' :
                                        'text-cyan-700 dark:text-cyan-400'
                                    }`}
                                    title={file.status === 'error' ? statusText : undefined}
                                >
                                    {statusText}
                                </span>
                            </div>

                            {activeFileId === file.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-lg"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});