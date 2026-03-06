import React, { useState, useEffect } from 'react';
import { GlossaryEntry, GlossaryCategory } from '../types';

interface GlossaryEditorProps {
    jsonString: string;
    onChange: (newJsonString: string) => void;
}

export const GlossaryEditor: React.FC<GlossaryEditorProps> = ({ jsonString, onChange }) => {
    const [entries, setEntries] = useState<GlossaryEntry[]>([]);
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [jsonError, setJsonError] = useState('');

    // Parse JSON when it changes externally (e.g., from AI analysis)
    useEffect(() => {
        try {
            const parsed = jsonString ? JSON.parse(jsonString) : [];
            if (Array.isArray(parsed)) {
                setEntries(parsed);
                setJsonError('');
            } else {
                setJsonError('JSON không phải là một mảng.');
            }
        } catch (e) {
            setJsonError('Lỗi cú pháp JSON.');
        }
    }, [jsonString]);

    const handleEntryChange = (index: number, field: keyof GlossaryEntry, value: string) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
        onChange(JSON.stringify(newEntries, null, 2));
    };

    const handleAddEntry = () => {
        const newEntries = [...entries, { term: '', translation: '', category: 'PROPER_NAME' as GlossaryCategory, context: '' }];
        setEntries(newEntries);
        onChange(JSON.stringify(newEntries, null, 2));
    };

    const handleRemoveEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
        onChange(JSON.stringify(newEntries, null, 2));
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        onChange(newVal); // Parent state updates
        try {
            const parsed = JSON.parse(newVal);
            if (Array.isArray(parsed)) {
                setEntries(parsed);
                setJsonError('');
            } else {
                setJsonError('JSON không phải là một mảng.');
            }
        } catch (err) {
            setJsonError('Lỗi cú pháp JSON.');
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => setIsJsonMode(!isJsonMode)}
                    className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    {isJsonMode ? 'Chuyển sang Chế độ Bảng' : 'Chuyển sang Chế độ JSON'}
                </button>
            </div>

            {isJsonMode ? (
                <div>
                    <textarea
                        value={jsonString}
                        onChange={handleJsonChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-800 dark:text-gray-200 focus:outline-none custom-scrollbar resize-y h-48 min-h-[8rem]"
                        placeholder='[ { "term": "...", "translation": "...", "category": "RANK_STATUS", "context": "..." } ]'
                    />
                    {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
                </div>
            ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ gốc</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ dịch (Xưng hô)</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngữ cảnh / Ghi chú</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Xóa</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {entries.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-2 py-1">
                                        <input
                                            type="text"
                                            value={entry.term}
                                            onChange={(e) => handleEntryChange(index, 'term', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-cyan-500 focus:outline-none text-sm text-gray-900 dark:text-gray-100 px-1 py-1"
                                            placeholder="Tên/Danh xưng gốc"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="text"
                                            value={entry.translation}
                                            onChange={(e) => handleEntryChange(index, 'translation', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-cyan-500 focus:outline-none text-sm text-gray-900 dark:text-gray-100 px-1 py-1 font-bold text-cyan-700 dark:text-cyan-400"
                                            placeholder="Cách dịch"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <select
                                            value={entry.category}
                                            onChange={(e) => handleEntryChange(index, 'category', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-cyan-500 focus:outline-none text-xs text-gray-700 dark:text-gray-300 px-1 py-1"
                                        >
                                            <option value="PROPER_NAME">Tên riêng</option>
                                            <option value="RANK_STATUS">Danh xưng/Địa vị</option>
                                            <option value="LOCATION">Địa danh</option>
                                            <option value="SKILL_ABILITY">Kỹ năng/Chiêu thức</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="text"
                                            value={entry.context || ''}
                                            onChange={(e) => handleEntryChange(index, 'context', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-cyan-500 focus:outline-none text-xs text-gray-500 dark:text-gray-400 px-1 py-1"
                                            placeholder="Nam, Nữ, Phản diện..."
                                        />
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                        <button
                                            onClick={() => handleRemoveEntry(index)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Xóa"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {entries.length === 0 && (
                        <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                            Chưa có thuật ngữ nào. Hãy thêm mới hoặc phân tích AI.
                        </div>
                    )}
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                            onClick={handleAddEntry}
                            className="w-full py-1.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold text-gray-500 dark:text-gray-400 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm thuật ngữ / xưng hô mới
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
