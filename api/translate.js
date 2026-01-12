// [안전한 기본 모드 사용]
export default async function handler(req, res) {
    // 1. API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 키가 없으면 JSON으로 에러를 명확히 보냄
    if (!apiKey) {
        return res.status(500).json({ error: "서버 설정 오류: .env 파일에 API 키가 없습니다." });
    }

    // 2. 요청 방식 확인 (POST만 허용)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "허용되지 않는 요청 방식입니다." });
    }

    try {
        const { text, image, mimeType } = req.body;

        // 3. 구글에게 보낼 프롬프트
        const parts = [];
        let promptText = `
            너는 일본어 가사 번역기야. JSON 형식만 출력해.
            [요청사항]
            1. "fullPronunciation": 문장 전체의 자연스러운 한국어 발음
            2. "tokens": 단어별 배열 (reading은 반드시 한국어 발음 표기)
            3. 순수 JSON만 반환할 것.
        `;
        
        if (text) promptText += `\n[텍스트]: ${text}`;
        parts.push({ text: promptText });

        if (image) {
            parts.push({
                inline_data: { mime_type: mimeType, data: image }
            });
        }

        // 4. Gemini API 호출
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const googleRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        // 5. 구글 API 오류 처리
        if (!googleRes.ok) {
            const errorData = await googleRes.json();
            console.error("Gemini API Error:", JSON.stringify(errorData));
            return res.status(500).json({ error: `Google API 오류: ${errorData.error?.message}` });
        }

        const data = await googleRes.json();
        
        if (!data.candidates || !data.candidates[0].content) {
            return res.status(500).json({ error: "AI가 응답하지 않았습니다." });
        }

        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json|```/g, '').trim();
        
        // 6. 결과 반환
        return res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        console.error("Server Error:", error);
        // 여기서 텍스트가 아닌 JSON 에러를 보내도록 강제함
        return res.status(500).json({ error: "서버 내부 오류: " + error.message });
    }
}