
import { ApiProvider } from './types';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// Default chunk size (can be overridden by settings)
export const DEFAULT_CHUNK_SIZE = 15000; 

// Default threads for Tier 1.
// Tier 1 supports high RPM, so we start aggressive.
export const DEFAULT_CONCURRENCY_LIMIT = 20; 

// Allow more files to be processed in parallel
export const MAX_PARALLEL_FILES = 5;

// Threshold to split a single file into multiple UI files (Part 1, Part 2...)
// Reduced to 100,000 as per user request
export const AUTO_SPLIT_THRESHOLD = 100000;

export const DEFAULT_TRANSLATION_PROMPT = `Bạn là biên tập viên Light Novel (Tiểu thuyết Nhật Bản) chuyên nghiệp. Hãy dịch đoạn văn sau sang tiếng Việt.

YÊU CẦU QUAN TRỌNG:
1. VĂN PHONG: Trẻ trung, hiện đại, tự nhiên, gần gũi với giới trẻ (Gen Z).
2. TỪ VỰNG: Ưu tiên dùng từ thuần Việt hoặc từ mượn hiện đại. HẠN CHẾ TỐI ĐA từ Hán Việt cũ kỹ (trừ khi là bối cảnh cổ trang đặc thù).
3. HỘI THOẠI: Dịch tự nhiên như văn nói đời thường. Chú ý các thán từ, ngữ khí đặc trưng của Anime/Manga.
4. ĐỊNH DẠNG ĐẦU RA:
   - BƯỚC 1: Phân tích ngữ cảnh, từ vựng, xưng hô vào thẻ <analysis>...</analysis>.
   - BƯỚC 2: Cung cấp bản dịch vào thẻ <translation>...</translation>.
   - KHÔNG bọc kết quả trong Markdown Code Block.

Văn bản cần dịch:
{{CONTENT}}`;

export const ANALYSIS_SYSTEM_PROMPT = `
VAI TRÒ: Chuyên gia Phê bình Văn học & Otaku Culture, chuyên sâu về Light Novel và Manga Nhật Bản.

NHIỆM VỤ: Phân tích đoạn văn bản đầu vào và tạo ra bộ dữ liệu định hướng dịch thuật (Style Guide) bằng TIẾNG VIỆT, chuẩn phong cách Nhật.

OUTPUT FORMAT: JSON ONLY.
Tuyệt đối không trả về bất kỳ văn bản nào ngoài cấu trúc JSON dưới đây:

{
  "style_analysis": "Mô tả chi tiết bối cảnh (Isekai, Học đường, Rom-Com, Fantasy...). Xác định không khí truyện (Hài hước, Slice of Life, Dark Fantasy...). Đưa ra hướng dẫn cụ thể về giọng văn (Ví dụ: 'Nữ chính Tsundere nói chuyện cộc lốc nhưng quan tâm', 'Nam chính tự kỷ nội tâm', 'Dùng ngôn ngữ mạng/teencode cho đoạn chat').",
  "glossary": [
     {
       "term": "Từ gốc (Tên Kanji/Katakana/English)", 
       "translation": "Nghĩa tiếng Việt đề xuất", 
       "category": "PROPER_NAME | LOCATION | SKILL_ABILITY | RANK_STATUS | OTHER",
       "context": "BẮT BUỘC: Ghi rõ Giới tính, Tuổi tác, và Mối quan hệ (Senpai/Kohai/Bạn bè/Người yêu) để xác định xưng hô (Cậu-Tớ, Anh-Em, Mày-Tao, Tôi-Cậu)."
     }
  ]
}

HƯỚNG DẪN TRÍCH XUẤT GLOSSARY (QUAN TRỌNG CHO LIGHT NOVEL):
1. **PROPER_NAME**: Xác định cách phiên âm hoặc giữ nguyên tên (tùy theo hướng dẫn). Quan trọng nhất là xác định GIỚI TÍNH để chọn đại từ.
2. **RELATIONSHIP (Quan hệ xã hội)**: Cực kỳ quan trọng trong tiếng Nhật.
   - Bạn bè đồng trang lứa: Xưng hô Cậu-Tớ, Mình-Cậu.
   - Tiền bối/Hậu bối (Senpai/Kohai): Xưng hô Anh/Chị - Em.
   - Thân mật/Người yêu: Anh-Em.
   - Xa lạ/Lịch sự: Tôi-Cậu/Cô.
   - Thù địch/Thô lỗ: Mày-Tao, Hắn-Gã.
3. **SKILL_ABILITY (Chiêu thức)**: Nếu là Isekai/Fantasy, dịch tên chiêu thức cho "ngầu" nhưng dễ hiểu (Ví dụ: 'Fireball' -> 'Cầu Lửa' thay vì 'Hỏa Cầu').
4. **HONORIFICS (Kính ngữ)**: Ghi chú cách xử lý các đuôi -san, -kun, -chan, -sama (Thường nên bản địa hóa sang tiếng Việt thay vì giữ nguyên, trừ trường hợp đặc biệt).

YÊU CẦU NGÔN NGỮ: KẾT QUẢ TRẢ VỀ PHẢI 100% LÀ TIẾNG VIỆT.
`;

export const MODELS = {
    fast: 'gemini-3-flash-preview',
    pro: 'gemini-3-pro-preview',
    pro31: 'gemini-3.1-pro-preview',
    pro25: 'gemini-2.5-pro',         
    pro25preview: 'gemini-2.5-pro-preview', 
    pro15: 'gemini-1.5-pro',         
    flash2: 'gemini-2.0-flash-exp',  
    thinking: 'gemini-2.0-flash-thinking-exp-01-21' 
};

// FORCE DISABLE ALL SAFETY FILTERS
export const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];
