
import React, { useEffect, useState } from 'react';
import { MODELS, DEFAULT_TRANSLATION_PROMPT } from '../constants';
import { ApiKey, ApiProvider, API_PROVIDER_NAMES } from '../types';
import { ApiKeyManager } from './ApiKeyManager';

interface SettingsPanelProps {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    concurrency: number;
    setConcurrency: (val: number) => void;
    maxParallelFiles: number;
    setMaxParallelFiles: (val: number) => void;
    chunkSize: number;
    setChunkSize: (val: number) => void;
    splitThreshold: number;
    setSplitThreshold: (val: number) => void;
    apiKeys: ApiKey[];
    setApiKeys: (keys: ApiKey[]) => void;
    apiProvider: ApiProvider;
    setApiProvider: (provider: ApiProvider) => void;
    antigravityBaseUrl: string;
    setAntigravityBaseUrl: (url: string) => void;
    antigravityModel: string;
    setAntigravityModel: (model: string) => void;
    compact?: boolean; // New prop for compact mode
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    selectedModel,
    setSelectedModel,
    prompt,
    setPrompt,
    concurrency,
    setConcurrency,
    maxParallelFiles,
    setMaxParallelFiles,
    chunkSize,
    setChunkSize,
    splitThreshold,
    setSplitThreshold,
    apiKeys,
    setApiKeys,
    apiProvider,
    setApiProvider,
    antigravityBaseUrl,
    setAntigravityBaseUrl,
    antigravityModel,
    setAntigravityModel,
    compact = false
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="space-y-4">
            {/* API Provider Selection */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <label htmlFor="provider-select" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">API Provider</label>
                <select
                    id="provider-select"
                    value={apiProvider}
                    onChange={e => setApiProvider(e.target.value as ApiProvider)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none mb-3"
                >
                    {Object.entries(API_PROVIDER_NAMES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                {apiProvider === ApiProvider.Gemini && (
                    <>
                        {/* API Key Manager Section */}
                        <div className="mb-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quản lý API Keys</h3>
                            <ApiKeyManager 
                                apiKeys={apiKeys} 
                                setApiKeys={setApiKeys} 
                                selectedModel={selectedModel}
                                apiProvider={apiProvider}
                                antigravityBaseUrl={antigravityBaseUrl}
                                antigravityModel={antigravityModel}
                            />
                        </div>

                        {/* Model Selection */}
                        <div>
                            <label htmlFor="model-select" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Model</label>
                            <select
                                id="model-select"
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                            >
                                <option value={MODELS.fast}>Gemini 3 Flash (Tốc độ)</option>
                                <option value={MODELS.pro}>Gemini 3 Pro (Chất lượng)</option>
                                <option value={MODELS.pro31}>Gemini 3.1 Pro</option>
                                <option value={MODELS.pro25}>Gemini 2.5 Pro</option>
                                <option value={MODELS.pro15}>Gemini 1.5 Pro</option>
                                <option value={MODELS.thinking}>Gemini 2.0 Thinking</option>
                            </select>
                            
                            <div className="mt-3 flex items-center space-x-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">Tier 1 Performance</span>
                            </div>
                        </div>
                    </>
                )}

                {apiProvider === ApiProvider.Antigravity && (
                    <div className="space-y-3">
                        {/* API Key Manager Section */}
                        <div className="mb-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quản lý API Keys</h3>
                            <ApiKeyManager 
                                apiKeys={apiKeys} 
                                setApiKeys={setApiKeys} 
                                selectedModel={selectedModel}
                                apiProvider={apiProvider}
                                antigravityBaseUrl={antigravityBaseUrl}
                                antigravityModel={antigravityModel}
                            />
                        </div>
                        <div>
                            <label htmlFor="antigravity-url" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Base URL</label>
                            <input
                                id="antigravity-url"
                                type="text"
                                value={antigravityBaseUrl}
                                onChange={(e) => setAntigravityBaseUrl(e.target.value)}
                                placeholder="https://api.antigravity.io/v1"
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="antigravity-model" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Model</label>
                            <input
                                id="antigravity-model"
                                type="text"
                                value={antigravityModel}
                                onChange={(e) => setAntigravityModel(e.target.value)}
                                placeholder="antigravity-model"
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced Toggle */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex justify-between items-center w-full text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                    <span>Cấu hình nâng cao</span>
                    <span>{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 animate-fadeIn">
                        {/* 1. Max Parallel Files Slider */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">File đồng thời</span>
                                <span className="text-xs font-bold text-cyan-600">{maxParallelFiles}</span>
                            </div>
                            <input 
                                type="range" min="1" max="20" step="1"
                                value={maxParallelFiles} 
                                onChange={(e) => setMaxParallelFiles(parseInt(e.target.value))}
                                className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                         {/* 2. Auto Split */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Auto Split</span>
                                <span className="text-xs font-bold text-cyan-600">{(splitThreshold / 1000).toFixed(0)}k</span>
                            </div>
                            <input 
                                type="range" min="1000" max="100000" step="1000"
                                value={splitThreshold} 
                                onChange={(e) => setSplitThreshold(parseInt(e.target.value))}
                                className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        {/* 3. Chunk Size */}
                         <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Chunk Size</span>
                                <span className="text-xs font-bold text-cyan-600">{(chunkSize / 1000).toFixed(1)}k</span>
                            </div>
                            <input 
                                type="range" min="3000" max="50000" step="1000"
                                value={chunkSize} 
                                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                                className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                         {/* 4. Threads */}
                         <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Threads</span>
                                <span className="text-xs font-bold text-cyan-600">{concurrency}</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" step="1"
                                value={concurrency} 
                                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};