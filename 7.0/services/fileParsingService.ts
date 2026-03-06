
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Xử lý import module: lấy default nếu có (cho PDF.js)
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Cấu hình worker cho PDF.js (Bắt buộc)
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs';
}

/**
 * Hàm tiện ích để làm sạch văn bản (Clean Text)
 * - Loại bỏ khoảng trắng thừa.
 * - Loại bỏ các dòng trống dư thừa (giữ tối đa 2 dòng).
 * - Chuẩn hóa ký tự xuống dòng.
 */
const cleanText = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/\u00A0/g, ' ')       // Thay thế Non-breaking space (&nbsp;) bằng space thường
        .replace(/[ \t]+/g, ' ')       // Gộp nhiều dấu cách/tab thành 1
        .replace(/\r\n/g, '\n')        // Chuẩn hóa xuống dòng CRLF -> LF
        .replace(/\r/g, '\n')          // Chuẩn hóa CR -> LF
        .split('\n')                   // Tách dòng
        .map(line => line.trim())      // Trim từng dòng
        .filter(line => line !== '')   // Loại bỏ dòng rỗng hoàn toàn
        .join('\n\n')                  // Nối lại, mỗi đoạn cách nhau 1 dòng trống (chuẩn Novel)
        .trim();
};

/**
 * Xử lý file DOCX sử dụng Mammoth
 */
export const parseDocx = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Xử lý import module: lấy default nếu có (cho Mammoth)
        const mammothLib = (mammoth as any).default || mammoth;
        
        if (!mammothLib.extractRawText) {
             throw new Error("Lỗi tải thư viện đọc DOCX.");
        }

        const result = await mammothLib.extractRawText({ arrayBuffer });
        return cleanText(result.value);
    } catch (error) {
        console.error("Lỗi đọc DOCX:", error);
        throw new Error("Không thể đọc file DOCX. File có thể bị hỏng hoặc có định dạng lạ.");
    }
};

/**
 * Xử lý file PDF sử dụng PDF.js
 */
export const parsePdf = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Sử dụng đối tượng pdfjs đã resolve ở trên
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Nối các đoạn text trong trang
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' '); // PDF thường tách từ lung tung, nối bằng space an toàn hơn
            
            fullText += pageText + '\n\n';
        }

        return cleanText(fullText);
    } catch (error) {
        console.error("Lỗi đọc PDF:", error);
        throw new Error("Không thể đọc file PDF. File có thể được bảo vệ hoặc chứa scan ảnh.");
    }
};

/**
 * Xử lý file EPUB (Unzip -> Tìm nội dung -> Parse HTML -> Clean -> Text)
 */
export const parseEpub = async (file: File): Promise<string> => {
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        // 1. Tìm file .opf trong META-INF/container.xml
        const containerXml = await content.file("META-INF/container.xml")?.async("string");
        if (!containerXml) throw new Error("Invalid EPUB: Missing container.xml");

        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, "application/xml");
        const rootfile = containerDoc.querySelector("rootfile");
        const opfPath = rootfile?.getAttribute("full-path");

        if (!opfPath) throw new Error("Invalid EPUB: Missing OPF path");

        // 2. Đọc file .opf để lấy danh sách chương (spine)
        const opfContent = await content.file(opfPath)?.async("string");
        if (!opfContent) throw new Error("Invalid EPUB: Missing OPF file");

        const opfDoc = parser.parseFromString(opfContent, "application/xml");
        const manifest = opfDoc.querySelectorAll("manifest > item");
        const spine = opfDoc.querySelectorAll("spine > itemref");

        // Map id -> href
        const idToHref: Record<string, string> = {};
        manifest.forEach(item => {
            const id = item.getAttribute("id");
            const href = item.getAttribute("href");
            if (id && href) idToHref[id] = href;
        });

        // Xác định thư mục gốc của file OPF để resolve path
        const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

        // 3. Duyệt qua spine để đọc nội dung theo đúng thứ tự
        const chapterTexts: string[] = [];

        for (let i = 0; i < spine.length; i++) {
            const idref = spine[i].getAttribute("idref");
            if (!idref || !idToHref[idref]) continue;

            const href = idToHref[idref];
            const fullPath = opfDir + href;
            
            const fileData = content.file(fullPath);
            if (fileData) {
                const htmlContent = await fileData.async("string");
                const htmlDoc = parser.parseFromString(htmlContent, "text/html");

                // --- CLEANING HTML DOM BEFORE EXTRACTING TEXT ---
                
                // 1. Xóa các thẻ media, script, style gây nhiễu
                htmlDoc.querySelectorAll('script, style, img, svg, video, audio, object, iframe').forEach(el => el.remove());

                // 2. Xử lý xuống dòng cho thẻ <br>
                htmlDoc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

                // 3. Xử lý các thẻ Block (p, div, h1-h6, li) để đảm bảo tách dòng
                // Thay vì replaceWith, ta append newline vào nội dung text của nó
                const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'tr'];
                blockTags.forEach(tag => {
                    htmlDoc.querySelectorAll(tag).forEach(el => {
                        el.textContent = '\n' + el.textContent + '\n';
                    });
                });

                // 4. Lấy text thuần
                let rawText = htmlDoc.body.textContent || "";

                // 5. Làm sạch lần cuối bằng hàm cleanText
                const cleanedChapter = cleanText(rawText);

                if (cleanedChapter.length > 0) {
                    chapterTexts.push(cleanedChapter);
                }
            }
        }

        // Nối các chương lại, phân cách bằng dòng kẻ
        return chapterTexts.join('\n\n========================================\n\n');

    } catch (error) {
        console.error("Lỗi đọc EPUB:", error);
        throw new Error("Không thể đọc file EPUB. Cấu trúc file không hỗ trợ.");
    }
};
