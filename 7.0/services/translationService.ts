
import { TranslationProgress, ApiProvider } from '../types';
import { translateChunk } from './apiService';

// --- HELPER FUNCTIONS ---

export const splitContentSmartly = (content: string, limit: number): string[] => {
    const chunks: string[] = [];
    const paragraphs = content.split('\n');
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        // Preserve empty lines which are often used for spacing in novels
        const line = paragraph + '\n';
        
        if (currentChunk.length + line.length > limit && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += line;
    }
    if (currentChunk.trim().length > 0) chunks.push(currentChunk);
    return chunks;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const translateSingleChunkWithRetry = async (
    chunk: string,
    chunkIndex: number,
    model: string,
    customPrompt: string,
    apiKeys: string[], // NOW ACCEPTS MULTIPLE KEYS
    signal?: AbortSignal,
    apiProvider: ApiProvider = ApiProvider.Gemini,
    antigravityBaseUrl?: string
): Promise<{ translatedChunk: string, index: number }> => {
    
    let attempt = 0;
    const maxRetries = 20; // Increased retries since we have rotation
    let currentKeyIndex = Math.floor(Math.random() * apiKeys.length); // Start with a random key

    while (attempt < maxRetries) {
        if (signal?.aborted) throw new Error("AbortedByUser");

        const currentKey = apiKeys[currentKeyIndex];

        try {
            const translatedChunk = await translateChunk(chunk, model, customPrompt, currentKey, apiProvider, antigravityBaseUrl);
            return { translatedChunk, index: chunkIndex };
        } catch (error) {
            const err = error as Error;
            const msg = err.message || "";

            // Check for specific errors
            const isRateLimit = msg.includes('429') || 
                                msg.toLowerCase().includes('quota') || 
                                msg.toLowerCase().includes('resource_exhausted');
            const isServerSide = msg.includes('500') || msg.includes('503');
            const isSafety = msg.includes('SAFETY');

            attempt++;
            
            if (attempt >= maxRetries) {
                throw new Error(`Chunk ${chunkIndex + 1} failed after ${maxRetries} attempts. Last error: ${msg}`);
            }

            // ROTATION LOGIC
            if (isRateLimit || isServerSide) {
                // If rate limited, Switch key IMMEDIATELY
                console.warn(`Key ...${currentKey.slice(-4)} exhausted/error. Rotating...`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                
                // If we only have 1 key, we must wait. If we have multiple, we can try next one with minimal delay.
                const rotationDelay = apiKeys.length > 1 ? 500 : 3000 * Math.pow(1.5, attempt);
                await wait(rotationDelay);
            } else if (isSafety) {
                // Safety errors are usually content specific, rotation won't help much, just wait a bit
                await wait(1000);
            } else {
                // Other errors
                await wait(2000);
            }
        }
    }
    throw new Error("Unexpected loop exit");
};

/**
 * Worker Pool Pattern - Multi-Key Edition
 */
export const translateFileContent = async (
    originalContent: string,
    model: string,
    customPrompt: string,
    concurrencyLimit: number,
    apiKeys: string | string[], // Accept single or multiple keys
    chunkSize: number, 
    onProgress: (progress: TranslationProgress) => void,
    signal?: AbortSignal,
    apiProvider: ApiProvider = ApiProvider.Gemini,
    antigravityBaseUrl?: string
): Promise<string> => {
    
    // Normalize to array
    const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    
    if (!keys || keys.length === 0 || keys[0] === '') {
        throw new Error("Không có API Key khả dụng.");
    }

    const chunks = splitContentSmartly(originalContent, chunkSize);
    const totalChunks = chunks.length;
    
    if (totalChunks === 0) return '';
    
    const translatedChunks: string[] = new Array(totalChunks);
    let completedChunks = 0;
    
    // Create tasks
    const tasks = chunks.map((chunk, index) => async () => {
        if (signal?.aborted) throw new Error("AbortedByUser");
        
        const result = await translateSingleChunkWithRetry(
            chunk, 
            index, 
            model, 
            customPrompt, 
            keys, // Pass ALL keys to the chunk translator
            signal,
            apiProvider,
            antigravityBaseUrl
        );
        
        translatedChunks[result.index] = result.translatedChunk;
        completedChunks++;
        onProgress({ chunk: completedChunks, totalChunks });
        return result;
    });

    // --- CONCURRENCY EXECUTOR ---
    const executing: Promise<any>[] = [];
    
    for (const task of tasks) {
        if (signal?.aborted) break;

        const p = task().then(() => {
            executing.splice(executing.indexOf(p), 1);
        });
        
        executing.push(p);

        if (executing.length >= concurrencyLimit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);

    if (signal?.aborted) throw new Error("AbortedByUser");

    return translatedChunks.join('\n');
};
