
export enum ApiProvider {
    Gemini = 'gemini',
    Antigravity = 'antigravity'
}

export const API_PROVIDER_NAMES: Record<ApiProvider, string> = {
    [ApiProvider.Gemini]: 'Google Gemini',
    [ApiProvider.Antigravity]: 'Antigravity API',
};

export interface TranslationProgress {
    chunk: number;
    totalChunks: number;
}

export type FileStatus = 'idle' | 'translating' | 'completed' | 'error';

export interface ProcessingFile {
    id: string;
    file: File;
    originalContent: string;
    translatedContent: string | null;
    status: FileStatus;
    progress: TranslationProgress;
    error?: string;
    validationStats?: {
        sourceLines: number;
        translatedLines: number;
        isComplete: boolean;
        missingPercentage: number;
    };
}

export interface ApiKey {
    id: string;
    key: string;
    label?: string;
    status: 'valid' | 'invalid' | 'checking' | 'unknown';
    errorMessage?: string;
    addedAt: number;
}

// --- NEW GLOSSARY DATA STRUCTURES ---

export type GlossaryCategory = 'PROPER_NAME' | 'LOCATION' | 'SKILL_ABILITY' | 'RANK_STATUS' | 'OTHER';

export interface GlossaryEntry {
    term: string;         // Từ gốc
    translation: string;  // Từ dịch
    category: GlossaryCategory; // Phân loại (ảnh hưởng logic dịch)
    context?: string;     // Metadata (Giới tính, Phe phái, Tính chất...)
}
