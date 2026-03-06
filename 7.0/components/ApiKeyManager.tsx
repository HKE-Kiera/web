
import React, { useState } from 'react';
import { ApiKey, ApiProvider } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { validateApiKey } from '../services/apiService';
import { TrashIcon } from './icons';

interface ApiKeyManagerProps {
    apiKeys: ApiKey[];
    setApiKeys: (keys: ApiKey[]) => void;
    selectedModel: string;
    apiProvider: ApiProvider;
    antigravityBaseUrl?: string;
    antigravityModel?: string;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, setApiKeys, selectedModel, apiProvider, antigravityBaseUrl, antigravityModel }) => {
    const [newKey, setNewKey] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddKey = async () => {
        const cleanedKey = newKey.trim();
        if (!cleanedKey) return;
        
        if (apiKeys.some(k => k.key === cleanedKey)) {
            alert('API Key này đã tồn tại.');
            return;
        }

        setIsAdding(true);

        // Auto validate
        const modelToUse = apiProvider === ApiProvider.Antigravity ? (antigravityModel || 'antigravity-model') : selectedModel;
        const { isValid, error } = await validateApiKey(cleanedKey, modelToUse, apiProvider, antigravityBaseUrl);

        if (!isValid) {
            alert(`Lỗi xác thực API Key:\n${error || 'Không thể kết nối'}`);
            // We can still add it as invalid, or we can choose not to add it.
            // Let's add it anyway so the user can see it's invalid.
        }

        const newKeyObj: ApiKey = {
            id: uuidv4(),
            key: cleanedKey,
            status: isValid ? 'valid' : 'invalid',
            addedAt: Date.now(),
            label: `Key ${apiKeys.length + 1}`
        };

        setApiKeys([...apiKeys, newKeyObj]);
        setNewKey('');
        setIsAdding(false);
    };

    const handleRemoveKey = (id: string) => {
        setApiKeys(apiKeys.filter(k => k.id !== id));
    };

    const handleRecheck = async (id: string) => {
        const keyObj = apiKeys.find(k => k.id === id);
        if (!keyObj) return;

        // Set to checking
        setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'checking' } : k));

        const modelToUse = apiProvider === ApiProvider.Antigravity ? (antigravityModel || 'antigravity-model') : selectedModel;
        const { isValid, error } = await validateApiKey(keyObj.key, modelToUse, apiProvider, antigravityBaseUrl);
        
        if (!isValid) {
            alert(`Lỗi xác thực API Key:\n${error || 'Không thể kết nối'}`);
        }

        setApiKeys(prev => prev.map(k => k.id === id ? { 
            ...k, 
            status: isValid ? 'valid' : 'invalid' 
        } : k));
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quản lý API Keys</label>
                <span className="text-xs text-cyan-700 dark:text-cyan-500 font-bold bg-cyan-100 dark:bg-cyan-900/20 px-2 py-1 rounded border border-cyan-200 dark:border-cyan-900/50">
                    {apiKeys.filter(k => k.status === 'valid').length}/{apiKeys.length} Key hoạt động
                </span>
            </div>
            
            {/* Input Area */}
            <div className="flex space-x-2">
                <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Dán Google Gemini API Key vào đây..."
                    className="flex-grow bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                />
                <button
                    onClick={handleAddKey}
                    disabled={isAdding || !newKey.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {isAdding ? '...' : 'Thêm'}
                </button>
            </div>

            {/* Key List */}
            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                {apiKeys.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <p className="text-xs text-gray-500">Chưa có key. Vui lòng thêm key để bắt đầu.</p>
                    </div>
                ) : (
                    apiKeys.map((k, index) => (
                        <div key={k.id} className="flex items-center justify-between bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-2 rounded-md group hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                            <div className="flex items-center space-x-3">
                                <div 
                                    className={`w-2 h-2 rounded-full ${
                                        k.status === 'valid' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 
                                        k.status === 'invalid' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                                    }`} 
                                    title={`Trạng thái: ${k.status}`}
                                />
                                <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                    {maskKey(k.key)}
                                </span>
                            </div>
                            
                            <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleRecheck(k.id)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                                    title="Kiểm tra lại"
                                    disabled={k.status === 'checking'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${k.status === 'checking' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => handleRemoveKey(k.id)}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                    title="Xóa Key"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};