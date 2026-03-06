
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { ProcessingFile, ApiKey, ApiProvider } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { 
    MODELS, 
    DEFAULT_TRANSLATION_PROMPT, 
    DEFAULT_CONCURRENCY_LIMIT, 
    MAX_PARALLEL_FILES,
    AUTO_SPLIT_THRESHOLD,
    DEFAULT_CHUNK_SIZE
} from './constants';
import { translateFileContent, splitContentSmartly } from './services/translationService';
import { parseDocx, parseEpub, parsePdf } from './services/fileParsingService';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { ResultDisplay } from './components/ResultDisplay';
import { AnalysisPanel } from './components/AnalysisPanel';

type TranslationMode = 'file' | 'text';
type AppMode = 'translate' | 'analyze';
type Theme = 'light' | 'dark';

function App() {
    // Configuration State
    const [selectedModel, setSelectedModel] = useLocalStorage<string>('selectedModel_v4', MODELS.fast);
    const [concurrency, setConcurrency] = useLocalStorage<number>('concurrencyLimit_v4', DEFAULT_CONCURRENCY_LIMIT);
    const [maxParallelFiles, setMaxParallelFiles] = useLocalStorage<number>('maxParallelFiles_v4', MAX_PARALLEL_FILES);
    const [chunkSize, setChunkSize] = useLocalStorage<number>('chunkSize_v1', DEFAULT_CHUNK_SIZE);
    const [splitThreshold, setSplitThreshold] = useLocalStorage<number>('splitThreshold_v1', AUTO_SPLIT_THRESHOLD);
    const [customPrompt, setCustomPrompt] = useLocalStorage<string>('customPrompt_v6', DEFAULT_TRANSLATION_PROMPT);
    
    // API Provider State
    const [apiProvider, setApiProvider] = useLocalStorage<ApiProvider>('apiProvider_v1', ApiProvider.Gemini);
    const [antigravityBaseUrl, setAntigravityBaseUrl] = useLocalStorage<string>('antigravityBaseUrl_v1', 'https://api.antigravity.io/v1');
    const [antigravityModel, setAntigravityModel] = useLocalStorage<string>('antigravityModel_v1', 'antigravity-model');
    
    // Theme State
    const [theme, setTheme] = useLocalStorage<Theme>('app_theme', 'dark');
    
    // App Mode State
    const [appMode, setAppMode] = useState<AppMode>('analyze');

    // Analysis State - Updated default for Light Novel style
    const [analysisInstruction, setAnalysisInstruction] = useLocalStorage<string>('analysisInstruction_v2', 'phân tích văn phong light novel nhật bản, chú trọng đại từ nhân xưng (cậu-tớ, anh-em, senpai-kohai), giọng văn hiện đại, trẻ trung, dịch thuật ngữ game/isekai sang tiếng việt tự nhiên');
    const [generatedPrompt, setGeneratedPrompt] = useState<string>(DEFAULT_TRANSLATION_PROMPT);
    const [generatedGlossary, setGeneratedGlossary] = useState<string>('[]');

    // Apply theme class to html element
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };
    
    // API Key State
    const [apiKeys, setApiKeys] = useLocalStorage<ApiKey[]>('apiKeys_v1', []);

    // UI State for Translation Mode
    const [activeTab, setActiveTab] = useState<TranslationMode>('file');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [globalError, setGlobalError] = useState<string>('');

    // File Mode State
    const [files, setFiles] = useState<ProcessingFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    // Text Mode State
    const [inputText, setInputText] = useState<string>('');
    const [textResult, setTextResult] = useState<string>('');

    const abortControllerRef = useRef<AbortController | null>(null);

    const readFileContent = async (file: File): Promise<string> => {
        const fileName = file.name.toLowerCase();
        
        // 1. DOCX
        if (fileName.endsWith('.docx')) {
            return await parseDocx(file);
        }
        
        // 2. EPUB
        if (fileName.endsWith('.epub')) {
            return await parseEpub(file);
        }

        // 3. PDF
        if (fileName.endsWith('.pdf')) {
            return await parsePdf(file);
        }

        // 4. TXT, MD, HTML, SRT (Standard Text)
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    // --- Handlers wrapped in useCallback for performance ---

    const handleFilesSelect = useCallback(async (selectedFiles: File[]) => {
        setGlobalError('');
        const newFiles: ProcessingFile[] = [];

        for (const file of selectedFiles) {
            try {
                // Determine display name (change extension to .txt for binary files to indicate conversion)
                let displayName = file.name;
                if (file.name.match(/\.(epub|docx|pdf)$/i)) {
                    displayName += '.txt'; 
                }

                const content = await readFileContent(file);
                
                // Use the user-defined splitThreshold instead of hardcoded constant
                if (content.length > splitThreshold) {
                    const chunks = splitContentSmartly(content, splitThreshold);
                    chunks.forEach((chunkContent, index) => {
                        const extIndex = displayName.lastIndexOf('.');
                        const baseName = extIndex !== -1 ? displayName.substring(0, extIndex) : displayName;
                        const ext = extIndex !== -1 ? displayName.substring(extIndex) : '.txt';
                        
                        const partFileName = `${baseName}_part${index + 1}${ext}`;
                        // Create a virtual file object to hold metadata
                        const partFile = new File([chunkContent], partFileName, { type: 'text/plain' });

                        newFiles.push({
                            id: uuidv4(),
                            file: partFile,
                            originalContent: chunkContent,
                            translatedContent: null,
                            status: 'idle',
                            progress: { chunk: 0, totalChunks: 0 }
                        });
                    });
                } else {
                    // If converted file, wrap content in new File object to ensure consistency
                    const processedFile = new File([content], displayName, { type: 'text/plain' });
                    
                    newFiles.push({
                        id: uuidv4(),
                        file: processedFile,
                        originalContent: content,
                        translatedContent: null,
                        status: 'idle',
                        progress: { chunk: 0, totalChunks: 0 }
                    });
                }

            } catch (err) {
                console.error("Error reading file", file.name, err);
                setGlobalError(`Lỗi đọc tệp ${file.name}: ${(err as Error).message}`);
            }
        }

        setFiles(prev => [...prev, ...newFiles]);
        if (!activeFileId && newFiles.length > 0) {
            setActiveFileId(newFiles[0].id);
        }
    }, [splitThreshold, activeFileId]);

    const handleRemoveFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        if (activeFileId === id) {
            setActiveFileId(null);
        }
    }, [activeFileId]);

    const updateFileState = (id: string, updates: Partial<ProcessingFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    // Allows the ResultDisplay to update the content (manual editing)
    const handleContentUpdate = useCallback((id: string, newContent: string) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                return {
                    ...f,
                    translatedContent: newContent,
                    status: (f.status === 'error' || f.status === 'idle') && newContent.trim().length > 0 
                        ? 'completed' 
                        : f.status
                };
            }
            return f;
        }));
    }, []);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsProcessing(false);
            setGlobalError("Đã dừng dịch thuật theo yêu cầu.");
        }
    };

    const handleDownloadAll = useCallback(async () => {
        const validFiles = files.filter(f => f.translatedContent && f.translatedContent.length > 0);
        if (validFiles.length === 0) {
            alert("Chưa có nội dung dịch nào để tải xuống.");
            return;
        }
        try {
            const zip = new JSZip();
            validFiles.forEach(file => {
                const nameParts = file.file.name.split('.');
                if (nameParts.length > 1) nameParts.pop();
                const fileName = `${nameParts.join('.')}_VN.txt`;
                zip.file(fileName, file.translatedContent!);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `translated_novels_${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error creating zip:", error);
            setGlobalError("Có lỗi xảy ra khi tạo file nén.");
        }
    }, [files]);

    const handleMergeDownload = useCallback(async () => {
        const validFiles = files.filter(f => f.translatedContent && f.translatedContent.length > 0);
        if (validFiles.length === 0) {
            alert("Chưa có nội dung dịch nào để tải xuống.");
            return;
        }
        try {
            const mergedContent = validFiles
                .map(f => f.translatedContent)
                .join('\n\n' + '='.repeat(20) + '\n\n');
            const blob = new Blob([mergedContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            a.download = `Full_Translation_${timestamp}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error merging files:", error);
            setGlobalError("Có lỗi xảy ra khi gộp file.");
        }
    }, [files]);

    const getValidKeyStrings = () => {
        const validKeys = apiKeys.filter(k => k.status !== 'invalid').map(k => k.key);
        if (validKeys.length === 0 && process.env.API_KEY) {
            return [process.env.API_KEY];
        }
        return validKeys;
    };

    const processSingleFile = async (
        file: ProcessingFile, 
        controller: AbortController,
        manualThreads: number,
        currentChunkSize: number
    ) => {
        if (controller.signal.aborted) return;
        updateFileState(file.id, { status: 'translating', error: undefined });
        const validKeys = getValidKeyStrings();
        // NOW PASSING ALL KEYS
        try {
            const modelToUse = apiProvider === ApiProvider.Antigravity ? antigravityModel : selectedModel;
            const translated = await translateFileContent(
                file.originalContent,
                modelToUse,
                customPrompt,
                manualThreads,
                validKeys, // Pass Array
                currentChunkSize,
                (progress) => updateFileState(file.id, { progress }),
                controller.signal,
                apiProvider,
                antigravityBaseUrl
            );

            // Validation Logic
            const sourceLines = file.originalContent.split('\n').filter(line => line.trim() !== '').length;
            const translatedLines = translated.split('\n').filter(line => line.trim() !== '').length;
            const missingPercentage = sourceLines > 0 
                ? Math.round(((sourceLines - translatedLines) / sourceLines) * 100) 
                : 0;
            const isComplete = missingPercentage < 30; // Allow up to 30% difference

            updateFileState(file.id, { 
                status: 'completed', 
                translatedContent: translated,
                validationStats: {
                    sourceLines,
                    translatedLines,
                    isComplete,
                    missingPercentage
                }
            });
        } catch (err) {
            const error = err as Error;
            if (error.message === 'AbortedByUser') {
                 updateFileState(file.id, { status: 'error', error: 'Đã dừng' });
            } else {
                updateFileState(file.id, { status: 'error', error: error.message });
            }
        }
    };

    const handleTranslate = async () => {
        const validKeys = getValidKeyStrings();
        if (validKeys.length === 0) {
            alert("Vui lòng thêm ít nhất một API Key hợp lệ trong phần Cấu hình.");
            return;
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (activeTab === 'text') {
            if (!inputText.trim()) return;
            setIsProcessing(true);
            setGlobalError('');
            try {
                const textThreads = Math.min(concurrency, 10); 
                const modelToUse = apiProvider === ApiProvider.Antigravity ? antigravityModel : selectedModel;
                const result = await translateFileContent(
                    inputText,
                    modelToUse,
                    customPrompt,
                    textThreads,
                    validKeys, // Pass Array
                    chunkSize,
                    () => {},
                    controller.signal,
                    apiProvider,
                    antigravityBaseUrl
                );
                setTextResult(result);
            } catch (err) {
                const error = err as Error;
                if (error.message === 'AbortedByUser') setGlobalError('Đã dừng dịch.');
                else setGlobalError(error.message);
            } finally {
                setIsProcessing(false);
                abortControllerRef.current = null;
            }
        } else {
            const filesToProcess = files.filter(f => f.status === 'idle' || f.status === 'error');
            if (filesToProcess.length === 0) {
                setGlobalError("Không có tệp nào ở trạng thái chờ.");
                return;
            }
            setIsProcessing(true);
            setGlobalError('');
            const queue = [...filesToProcess];
            const fileWorker = async () => {
                while (queue.length > 0) {
                    if (controller.signal.aborted) break;
                    const file = queue.shift(); 
                    if (!file) break;
                    await processSingleFile(file, controller, concurrency, chunkSize);
                }
            };
            const workers = Array.from({ length: maxParallelFiles }, () => fileWorker());
            try {
                await Promise.all(workers);
            } finally {
                setIsProcessing(false);
                abortControllerRef.current = null;
            }
        }
    };

    const activeFile = files.find(f => f.id === activeFileId) || null;
    const textModeFakeFile: ProcessingFile | null = activeTab === 'text' ? {
        id: 'text-mode',
        file: { name: 'Direct Input.txt', size: inputText.length } as File,
        originalContent: inputText,
        translatedContent: textResult || null,
        status: isProcessing ? 'translating' : (textResult ? 'completed' : 'idle'),
        progress: { chunk: 0, totalChunks: 0 }
    } : null;

    const displayFile = activeTab === 'file' ? activeFile : textModeFakeFile;
    const canTranslate = !isProcessing && (
        (activeTab === 'file' && files.some(f => f.status === 'idle' || f.status === 'error')) || 
        (activeTab === 'text' && inputText.trim().length > 0)
    );

    const handleApplyAnalysisPrompt = useCallback((newPrompt: string) => {
        setCustomPrompt(newPrompt);
        alert("Đã cập nhật prompt vào cấu hình dịch!");
    }, [setCustomPrompt]);

    const handleRetranslate = useCallback((id: string) => {
        if (isProcessing) return;
        
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                return {
                    ...f,
                    status: 'idle',
                    translatedContent: null,
                    progress: { chunk: 0, totalChunks: 0 },
                    error: undefined
                };
            }
            return f;
        }));
        
        // Optional: Automatically start translating immediately
        // For now, we just reset status to 'idle' so user can click "Start Translate" again
        // Or we can trigger handleTranslate() but that requires state updates to propagate first
    }, [isProcessing]);

    return (
        <div className="min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-sans transition-colors duration-300 overflow-hidden">
            <Header theme={theme} toggleTheme={toggleTheme} />
            
            <main className="flex-grow flex overflow-hidden">
                {/* --- LEFT SIDEBAR (Controls) --- */}
                <div className="w-[380px] flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 flex-shrink-0 z-10">
                    
                    {/* 1. Mode Switcher (Tab Style) */}
                    <div className="p-4 pb-0">
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <button 
                                onClick={() => setAppMode('analyze')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${appMode === 'analyze' ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                PHÂN TÍCH THUẬT NGỮ
                            </button>
                            <button 
                                onClick={() => setAppMode('translate')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${appMode === 'translate' ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                DỊCH THUẬT
                            </button>
                        </div>
                    </div>

                    {/* 2. Source Tabs */}
                     <div className="p-4 pb-2">
                        <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-4">
                            <button 
                                onClick={() => setActiveTab('file')} 
                                className={`pb-2 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'file' ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Quản lý tệp
                            </button>
                            <button 
                                onClick={() => setActiveTab('text')} 
                                className={`pb-2 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'text' ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Văn bản trực tiếp
                            </button>
                        </div>
                    </div>

                    {/* 3. Settings & Config Area */}
                    <div className="p-4 pt-0 flex-grow overflow-y-auto custom-scrollbar space-y-6">
                        
                        {/* Compact Settings */}
                         <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Cấu hình</span>
                            </div>
                            <SettingsPanel
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                prompt={customPrompt}
                                setPrompt={setCustomPrompt}
                                concurrency={concurrency}
                                setConcurrency={setConcurrency}
                                maxParallelFiles={maxParallelFiles}
                                setMaxParallelFiles={setMaxParallelFiles}
                                chunkSize={chunkSize}
                                setChunkSize={setChunkSize}
                                splitThreshold={splitThreshold}
                                setSplitThreshold={setSplitThreshold}
                                apiKeys={apiKeys}
                                setApiKeys={setApiKeys}
                                apiProvider={apiProvider}
                                setApiProvider={setApiProvider}
                                antigravityBaseUrl={antigravityBaseUrl}
                                setAntigravityBaseUrl={setAntigravityBaseUrl}
                                antigravityModel={antigravityModel}
                                setAntigravityModel={setAntigravityModel}
                                compact={true}
                            />
                        </div>

                         {/* File Management Area */}
                         <div className={activeTab === 'file' ? 'flex flex-col space-y-3' : 'hidden'}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Danh sách tệp</span>
                                </div>
                                <div className="scale-90 origin-top-left w-[111%]"> {/* Slight scale down to fit tight width */}
                                     <FileUpload onFilesSelect={handleFilesSelect} isLoading={isProcessing} />
                                </div>
                                <div className="flex-grow min-h-[150px]">
                                    <FileList 
                                        files={files}
                                        activeFileId={activeFileId}
                                        onSelectFile={setActiveFileId}
                                        onRemoveFile={handleRemoveFile}
                                        isTranslating={isProcessing}
                                        onDownloadAll={handleDownloadAll}
                                        onMergeDownload={handleMergeDownload}
                                        onRetranslate={handleRetranslate}
                                    />
                                </div>
                        </div>

                        <div className={activeTab === 'text' ? 'flex flex-col space-y-2' : 'hidden'}>
                                <span className="text-xs font-bold text-gray-400 uppercase">Input Text</span>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="w-full h-48 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
                                    placeholder="Dán văn bản cần dịch..."
                                    disabled={isProcessing}
                                />
                                <div className="text-right text-[10px] text-gray-400">{inputText.length} chars</div>
                        </div>
                    </div>
                    
                    {/* 4. Bottom Actions */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        {appMode === 'translate' && (
                            <>
                                {globalError && <div className="text-xs text-red-500 mb-2">{globalError}</div>}
                                {isProcessing ? (
                                    <button onClick={handleStop} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg">
                                        DỪNG LẠI
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleTranslate} 
                                        disabled={!canTranslate} 
                                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-sm font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        BẮT ĐẦU DỊCH
                                    </button>
                                )}
                            </>
                        )}
                         {appMode === 'analyze' && (
                            <div className="text-center text-xs text-gray-400">
                                Chế độ phân tích giúp tối ưu Prompt trước khi dịch.
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT WORKSPACE (Content) --- */}
                <div className="flex-grow bg-gray-100 dark:bg-[#0d1117] p-6 overflow-hidden flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">
                            {appMode === 'analyze' ? 'PROMPT DỊCH & BẢNG THUẬT NGỮ' : 'KẾT QUẢ DỊCH THUẬT'}
                        </h2>
                        {appMode === 'analyze' && <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded font-bold uppercase">Analysis Mode</span>}
                    </div>

                    <div className="flex-grow overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl relative">
                        {/* KEEP BOTH COMPONENTS MOUNTED BUT HIDDEN VIA CSS TO PREVENT LAG */}
                        
                        <div className={appMode === 'analyze' ? 'h-full w-full' : 'hidden'}>
                             <AnalysisPanel 
                                files={files}
                                apiKeys={apiKeys}
                                selectedModel={selectedModel}
                                apiProvider={apiProvider}
                                antigravityBaseUrl={antigravityBaseUrl}
                                antigravityModel={antigravityModel}
                                onApplyPrompt={handleApplyAnalysisPrompt}
                                instruction={analysisInstruction}
                                setInstruction={setAnalysisInstruction}
                                generatedPrompt={generatedPrompt}
                                setGeneratedPrompt={setGeneratedPrompt}
                                generatedGlossary={generatedGlossary}
                                setGeneratedGlossary={setGeneratedGlossary}
                            />
                        </div>

                        <div className={appMode === 'translate' ? 'h-full w-full' : 'hidden'}>
                             <ResultDisplay 
                                activeFile={displayFile} 
                                onUpdateContent={handleContentUpdate} 
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
