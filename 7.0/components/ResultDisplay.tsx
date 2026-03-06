
import React, { useState, useEffect, useCallback } from 'react';
import { DownloadIcon, CopyIcon, CheckIcon, SplitViewIcon, SingleViewIcon } from './icons';
import { ProcessingFile } from '../types';

interface ResultDisplayProps {
    activeFile: ProcessingFile | null;
    onUpdateContent?: (id: string, newContent: string) => void;
}

// Wrap in React.memo to prevent re-renders if props don't change
export const ResultDisplay: React.FC<ResultDisplayProps> = React.memo(({ activeFile, onUpdateContent }) => {
    const [copied, setCopied] = useState(false);
    const [isSplitView, setIsSplitView] = useState(false);
    
    // Local state to handle editing performance for large texts
    const [localTranslatedContent, setLocalTranslatedContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Sync local state when activeFile changes or external update happens (e.g., API finishes)
    useEffect(() => {
        if (activeFile) {
            setLocalTranslatedContent(activeFile.translatedContent || '');
        }
    }, [activeFile?.id, activeFile?.translatedContent]);

    // Debounce Save to parent
    useEffect(() => {
        if (!activeFile || !onUpdateContent || !isEditing) return;

        const timeoutId = setTimeout(() => {
            if (localTranslatedContent !== activeFile.translatedContent) {
                onUpdateContent(activeFile.id, localTranslatedContent);
                setIsEditing(false);
            }
        }, 500); // Wait 500ms after typing stops

        return () => clearTimeout(timeoutId);
    }, [localTranslatedContent, activeFile, onUpdateContent, isEditing]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalTranslatedContent(e.target.value);
        setIsEditing(true);
    };

    if (!activeFile) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg p-8 items-center justify-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-300">
                <div className="w-16 h-16 mb-4 opacity-20">
                     <svg fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                </div>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Chọn một tệp để xem kết quả</p>
                <p className="text-sm opacity-60">Nội dung dịch sẽ hiển thị tại đây</p>
            </div>
        );
    }

    const isTranslated = !!activeFile.translatedContent || (activeFile.status === 'error' && localTranslatedContent.length > 0);
    // Logic for Single View: If showing translation, show local content. If showing original (because no translation), show original.
    const showTranslationInSingleView = !!activeFile.translatedContent || activeFile.status === 'completed' || (activeFile.status === 'error' && localTranslatedContent.length > 0);
    const textToShow = showTranslationInSingleView ? localTranslatedContent : (activeFile.originalContent || '');

    const handleDownload = () => {
        // Prefer local content if available (latest edits)
        const contentToDownload = showTranslationInSingleView ? localTranslatedContent : textToShow;
        if (!contentToDownload) return;
        
        const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const nameParts = activeFile.file.name.split('.');
        if (nameParts.length > 1) nameParts.pop(); // Remove extension
        const suffix = showTranslationInSingleView ? '_VN' : '_original';
        a.download = `${nameParts.join('.')}${suffix}.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        const contentToCopy = showTranslationInSingleView ? localTranslatedContent : textToShow;
        if (!contentToCopy) return;
        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-[600px] lg:h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl transition-colors duration-300">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[200px]">
                        {activeFile.file.name}
                    </span>
                    {isTranslated ? (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 uppercase tracking-wide">
                            Đã Dịch
                        </span>
                    ) : (
                         <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 uppercase tracking-wide">
                            Gốc
                        </span>
                    )}
                    {isEditing && <span className="text-[10px] italic text-orange-500 animate-pulse">Đang lưu...</span>}
                </div>
                
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setIsSplitView(!isSplitView)}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-all border border-gray-200 dark:border-gray-700 mr-2"
                        title={isSplitView ? "Chuyển sang chế độ xem đơn" : "Chuyển sang chế độ song ngữ"}
                    >
                        {isSplitView ? <SingleViewIcon /> : <SplitViewIcon />}
                        <span className="hidden sm:inline ml-1">{isSplitView ? 'Xem Đơn' : 'Song Ngữ'}</span>
                    </button>

                     <button
                        onClick={handleCopy}
                        disabled={!textToShow}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-all border border-gray-200 dark:border-gray-700"
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                        <span className="hidden sm:inline ml-1">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!textToShow}
                        className="flex items-center px-3 py-1.5 text-xs font-medium bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:text-cyan-700 dark:hover:text-cyan-300 rounded transition-all border border-cyan-100 dark:border-cyan-900/50"
                    >
                        <DownloadIcon />
                        <span className="hidden sm:inline ml-1">Tải về</span>
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative flex-grow bg-gray-50 dark:bg-[#1e1e1e] overflow-hidden transition-colors duration-300">
                {isSplitView ? (
                    <div className="flex h-full w-full">
                        {/* Original Panel */}
                        <div className="w-1/2 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                            <div className="px-4 py-1.5 bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                                Bản Gốc
                            </div>
                            <textarea
                                readOnly
                                value={activeFile.originalContent || ''}
                                className="w-full flex-grow bg-transparent text-gray-800 dark:text-gray-400 p-4 font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar"
                                spellCheck={false}
                            />
                        </div>
                        {/* Translated Panel - EDITABLE */}
                        <div className="w-1/2 h-full flex flex-col">
                             <div className="px-4 py-1.5 bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-10">
                                <span className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">Bản Dịch (Có thể chỉnh sửa)</span>
                                {activeFile.status === 'error' && (
                                    <span className="text-[9px] text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">Lỗi - Hãy nhập thủ công</span>
                                )}
                            </div>
                            <textarea
                                value={localTranslatedContent}
                                onChange={handleContentChange}
                                className="w-full flex-grow bg-transparent text-gray-800 dark:text-gray-300 p-4 font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar"
                                placeholder={activeFile.status === 'translating' ? "Đang dịch..." : "Bản dịch sẽ hiển thị tại đây... (Bạn có thể tự nhập/sửa nội dung)"}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                         {/* Header only for indication if editing is allowed */}
                         {showTranslationInSingleView && (
                            <div className="px-4 py-1.5 bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-[10px] text-cyan-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                                Bản Dịch (Có thể chỉnh sửa)
                            </div>
                         )}
                        <textarea
                            readOnly={!showTranslationInSingleView}
                            value={textToShow}
                            onChange={showTranslationInSingleView ? handleContentChange : undefined}
                            className="w-full h-full bg-transparent text-gray-800 dark:text-gray-300 p-4 font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar"
                            placeholder="Nội dung tệp sẽ hiển thị ở đây..."
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>
            
            {/* Status Bar */}
            <div className="px-4 py-1 bg-cyan-50 dark:bg-cyan-900/20 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                <span>UTF-8 {showTranslationInSingleView || isSplitView ? '(Editable)' : '(Read-Only)'}</span>
                <span>
                    {isSplitView 
                        ? `Orig: ${activeFile.originalContent.length.toLocaleString()} | Trans: ${localTranslatedContent.length.toLocaleString()}`
                        : `${textToShow.length.toLocaleString()} chars`
                    }
                </span>
            </div>
        </div>
    );
});