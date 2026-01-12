// api/translate.js
export default async function handler(req, res) {
    // 1. API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 키가 없으면 에러 메시지를 JSON으로 반환 (텍스트 아님)
    if (!apiKey) {
        return res.status(500).json({ error: "API 키가 설정되지 않았습니다. .env 파일이나 Vercel 환경변수를 확인하세요." });
    }

    // 2. HTTP 메서드 확인
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "허용되지 않는 요청 방식입니다." });
    }

    try {
        const { text, image, mimeType } = req.body;

        // 3. 구글에게 보낼 프롬프트 (발음은 한국어로, 순수 JSON만 요청)
        const parts = [];
        let promptText = `
            너는 일본어 가사 번역기야. JSON 형식만 출력해.
            
            [요청사항]
            1. "fullPronunciation": 문장 전체의 자연스러운 한국어 발음 (예: 아이시떼루요)
            2. "tokens": 문장을 단어별로 쪼갠 배열
               - "text": 일본어 원문
               - "reading": 한국어 발음 표기 (예: 와타시)
               - "meaning": **한국어 뜻 (조사나 문법이라도 '은/는', '주격조사' 등 반드시 내용을 채울 것. 절대 비워두지 마.)**
               - "detail": 문법적 설명 (짧게)
            
            [출력 예시]
            [{"fullPronunciation":"...","tokens":[{"text":"は","reading":"와","meaning":"~은/는","detail":"주격조사"}]}]
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
            throw new Error(`Google API 오류: ${errorData.error?.message}`);
        }

        const data = await googleRes.json();
        
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("AI 응답이 비어있습니다.");
        }

        let resultText = data.candidates[0].content.parts[0].text;
        // 혹시 모를 마크다운 제거
        resultText = resultText.replace(/```json|```/g, '').trim();
        
        // 6. 결과 반환 (성공)
        return res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        console.error("Server Error:", error);
        // 에러가 나도 JSON으로 반환하여 프론트엔드 파싱 오류 방지
        return res.status(500).json({ error: "서버 내부 오류: " + error.message });
    }
}