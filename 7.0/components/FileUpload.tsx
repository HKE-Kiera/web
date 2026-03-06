
import React, { useRef } from 'react';
import { FileUploadIcon } from './icons';

interface FileUploadProps {
    onFilesSelect: (files: File[]) => void;
    isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const filesArray = Array.from(event.target.files);
            // Removed limit restriction
            onFilesSelect(filesArray);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div 
            onClick={!isLoading ? handleButtonClick : undefined}
            className={`
                relative group flex flex-col items-center justify-center p-8 
                border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
                ${isLoading 
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/30 opacity-50 cursor-not-allowed' 
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-cyan-500 hover:bg-white dark:hover:bg-gray-800 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                }
            `}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.md,.html,.srt,.epub,.pdf,.docx"
                multiple // Enable multiple files
                disabled={isLoading}
            />
            
            <div className={`transform transition-transform duration-300 ${!isLoading && 'group-hover:-translate-y-1'}`}>
                <div className="text-gray-400 dark:text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <FileUploadIcon />
                </div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {isLoading ? 'Đang xử lý...' : 'Click để chọn hoặc kéo thả tệp'}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Hỗ trợ: <span className="font-mono text-cyan-600 dark:text-cyan-400">TXT, MD, EPUB, PDF, DOCX</span>
                </p>
            </div>
        </div>
    );
};
