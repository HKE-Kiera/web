
import React, { useState, useMemo, useEffect } from 'react';
import { analyzeContent, AnalysisResult } from '../services/apiService';
import { buildDynamicPrompt } from '../services/promptBuilder'; 
import { ApiKey, ProcessingFile, ApiProvider } from '../types';
import { MODELS } from '../constants';

interface AnalysisPanelProps {
    files: ProcessingFile[]; 
    apiKeys: ApiKey[];
    selectedModel: string;
    apiProvider: ApiProvider;
    antigravityBaseUrl?: string;
    antigravityModel?: string;
    onApplyPrompt: (prompt: string) => void;
    
    // State 1: Instruction
    instruction: string;
    setInstruction: (val: string) => void;
    
    // State 2: Style Prompt (Trước đây là generatedPrompt, giờ dùng làm Style Analysis Text)
    generatedPrompt: string;
    setGeneratedPrompt: (val: string) => void;
    
    // State 3: Glossary
    generatedGlossary: string; // JSON string
    setGeneratedGlossary: (val: string) => void;
}

// Wrap in React.memo
export const AnalysisPanel: React.FC<AnalysisPanelProps> = React.memo(({ 
    files, 
    apiKeys, 
    selectedModel, 
    apiProvider,
    antigravityBaseUrl,
    antigravityModel,
    onApplyPrompt,
    instruction,
    setInstruction,
    generatedPrompt,
    setGeneratedPrompt,
    generatedGlossary,
    setGeneratedGlossary
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string>('');
    const [applySuccess, setApplySuccess] = useState(false); // State for feedback button

    // Reset success state after 2 seconds
    useEffect(() => {
        if (applySuccess) {
            const timer = setTimeout(() => setApplySuccess(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [applySuccess]);

    // --- LOGIC 4: TÍNH TOÁN SYSTEM PROMPT PREVIEW ---
    // Tự động gộp (Instruction + Style + Glossary) thành System Prompt cuối cùng
    const previewSystemPrompt = useMemo(() => {
        try {
            let glossaryData = [];
            try {
                glossaryData = JSON.parse(generatedGlossary);
            } catch (e) {
                // Nếu JSON lỗi, vẫn render nhưng glossary rỗng
                glossaryData = []; 
            }
            
            let prompt = buildDynamicPrompt(generatedPrompt, glossaryData, instruction);
            
            // Thêm placeholder content nếu chưa có (để preview cho đẹp)
            if (!prompt.includes('{{CONTENT}}')) {
                prompt += `\n\nRAW SOURCE TEXT:\n{{CONTENT}}`;
            }
            return prompt;
        } catch (e) {
            return "Lỗi khi tạo Preview: " + (e as Error).message;
        }
    }, [generatedPrompt, generatedGlossary, instruction]);

    // Handle Analysis Result
    const handleAnalysisComplete = (result: AnalysisResult) => {
        // Cập nhật State 2: Style
        setGeneratedPrompt(result.style_analysis);
        // Cập nhật State 3: Glossary
        setGeneratedGlossary(JSON.stringify(result.glossary, null, 2));
    };

    const handleAnalyze = async () => {
        if (files.length === 0) {
            setError("Vui lòng tải lên ít nhất một tệp để phân tích.");
            return;
        }

        const validKey = apiKeys.find(k => k.status !== 'invalid')?.key || process.env.API_KEY;
        if (!validKey) {
            setError("Vui lòng thêm API Key hợp lệ trong phần Cấu hình.");
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const analysisModel = apiProvider === ApiProvider.Antigravity 
                ? (antigravityModel || 'antigravity-model') 
                : (selectedModel.includes('flash') ? MODELS.pro : selectedModel);
            
            let combinedContent = "";
            const MAX_TOTAL_CHARS = 80000;
            const charsPerFile = Math.max(2000, Math.floor(MAX_TOTAL_CHARS / files.length));

            for (const file of files) {
                let content = file.originalContent || "";
                if (!content && file.file) {
                     content = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = (e) => reject(e);
                        reader.readAsText(file.file);
                    });
                }
                const slice = content.slice(0, charsPerFile);
                combinedContent += `\n\n--- FILE: ${file.file.name} ---\n${slice}\n--- END SAMPLE OF ${file.file.name} ---\n`;
            }

            const data = await analyzeContent(combinedContent, analysisModel, validKey, instruction, apiProvider, antigravityBaseUrl);
            handleAnalysisComplete(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestoreDefault = () => {
        if (window.confirm("Xóa trắng các trường dữ liệu?")) {
            setGeneratedPrompt("");
            setGeneratedGlossary("[]");
        }
    }

    const handleApplyClick = () => {
        onApplyPrompt(previewSystemPrompt);
        setApplySuccess(true);
    };

    const handleGlossaryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);
                
                let newEntries: GlossaryEntry[] = [];
                
                if (Array.isArray(parsed)) {
                    newEntries = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    for (const [key, value] of Object.entries(parsed)) {
                        if (typeof value === 'string') {
                            const parts = value.split('#');
                            const translation = parts[0].trim();
                            const category = parts.length > 1 ? parts[1].trim() : 'Tên riêng/Thuật ngữ';
                            
                            newEntries.push({
                                term: key,
                                translation: translation,
                                category: category
                            });
                        }
                    }
                }

                let existingEntries: GlossaryEntry[] = [];
                try {
                    existingEntries = JSON.parse(generatedGlossary);
                    if (!Array.isArray(existingEntries)) existingEntries = [];
                } catch (err) {
                    existingEntries = [];
                }

                const merged = [...existingEntries];
                for (const newEntry of newEntries) {
                    const existingIndex = merged.findIndex(e => e.term === newEntry.term);
                    if (existingIndex >= 0) {
                        merged[existingIndex] = newEntry;
                    } else {
                        merged.push(newEntry);
                    }
                }

                setGeneratedGlossary(JSON.stringify(merged, null, 2));
                
                const termsText = merged.map(e => `- ${e.term} => ${e.translation}`).join('\n');
                const strictInstruction = `\n\n[TỪ ĐIỂN TỐI CAO - BẮT BUỘC TUÂN THỦ KHÔNG ĐƯỢC THAY ĐỔI]:\n${termsText}`;
                const baseInstruction = instruction.split('\n\n[TỪ ĐIỂN TỐI CAO')[0];
                setInstruction(baseInstruction + strictInstruction);

                alert("Đã nạp bảng thuật ngữ thành công và đưa vào định hướng phân tích!");
            } catch (err) {
                alert("Lỗi đọc file JSON: " + (err as Error).message);
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar p-1">
            
            {/* --- PHẦN 1: ĐỊNH HƯỚNG PHÂN TÍCH (TUỲ CHỌN) --- */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">1. Định hướng phân tích (Input)</h3>
                    <span className="text-[10px] text-gray-400 italic">Resize-y enabled</span>
                </div>
                <textarea 
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="VD: Hãy phân tích văn phong hài hước, dùng từ hiện đại..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar resize-y h-20 min-h-[4rem]"
                />
                
                <div className="mt-3 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        Phạm vi: <span className="font-bold text-cyan-600">{files.length > 0 ? `${files.length} tệp tin` : 'Chưa có tệp nào'}</span>
                    </p>
                    <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || files.length === 0}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase rounded shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                    >
                        {isAnalyzing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang Phân Tích...
                            </>
                        ) : (
                            'Bắt đầu Phân tích'
                        )}
                    </button>
                </div>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            {/* --- PHẦN 2: PROMPT DỊCH (STYLE ANALYSIS) --- */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">2. Prompt dịch / Style (Tự sinh & Sửa)</h3>
                    <button onClick={handleRestoreDefault} className="text-xs text-gray-400 hover:text-red-500 underline">Xóa trắng</button>
                </div>
                <textarea 
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 font-mono text-sm text-gray-800 dark:text-gray-200 focus:outline-none custom-scrollbar resize-y h-48 min-h-[8rem]"
                    placeholder="Kết quả phân tích văn phong (Style Analysis) sẽ hiện ở đây..."
                />
            </div>

            {/* --- PHẦN 3: BẢNG THUẬT NGỮ (JSON) --- */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">3. Bảng thuật ngữ (JSON Editor)</h3>
                        <label className="cursor-pointer bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-cyan-200 dark:hover:bg-cyan-800/50 transition-colors">
                            Nạp JSON
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                onChange={handleGlossaryUpload} 
                            />
                        </label>
                    </div>
                    <span className="text-[10px] text-gray-400">Context ảnh hưởng đến đại từ</span>
                </div>
                <textarea 
                    value={generatedGlossary}
                    onChange={(e) => setGeneratedGlossary(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-800 dark:text-gray-200 focus:outline-none custom-scrollbar resize-y h-48 min-h-[8rem]"
                    placeholder='[ { "term": "...", "translation": "...", "category": "RANK_STATUS", "context": "..." } ]'
                />
            </div>

             {/* --- PHẦN 4: SYSTEM PROMPT PREVIEW --- */}
             <div className="flex-shrink-0 bg-cyan-50 dark:bg-cyan-900/10 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-sm p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-400">4. System Prompt Preview (Final)</h3>
                    
                    {/* FEEDBACK BUTTON */}
                    <button 
                        onClick={handleApplyClick} 
                        className={`
                            px-4 py-1.5 text-xs font-bold rounded shadow transition-all flex items-center
                            ${applySuccess 
                                ? 'bg-green-500 hover:bg-green-600 text-white transform scale-105' 
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            }
                        `}
                    >
                        {applySuccess ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                ĐÃ ÁP DỤNG!
                            </>
                        ) : (
                            'Áp dụng cấu hình này'
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">
                    Đây là Prompt thực tế sẽ gửi cho AI (được gộp từ 1, 2 và 3).
                </p>
                <textarea 
                    readOnly
                    value={previewSystemPrompt}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-600 dark:text-gray-400 focus:outline-none custom-scrollbar resize-y h-64 min-h-[8rem]"
                    placeholder="System Prompt Preview..."
                />
            </div>
        </div>
    );
});
