export const config = {
    runtime: 'edge', // 속도 최적화
};

export default async function handler(req) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "API 키 설정 오류" }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { text, image, mimeType } = await req.json();

        // 프롬프트 수정: "reading"을 무조건 "한국어 발음"으로 달라고 명시함
        const parts = [];
        let promptText = `
            너는 일본어 가사 번역기야. JSON 형식만 출력해.
            
            [요청사항]
            1. 일본어 가사를 분석해서 다음 JSON 포맷으로 반환해.
            2. "fullPronunciation": 문장 전체의 자연스러운 한국어 발음 (예: 아이시떼루요)
            3. "tokens": 문장을 단어별로 쪼갠 배열
               - "text": 일본어 원문
               - "reading": **반드시 한국어로 발음 표기** (예: 와타시, 유메, 아이)
               - "meaning": 한국어 뜻
               - "detail": 문법적 설명 (짧게)

            [JSON 구조 예시]
            [
                {
                    "fullPronunciation": "유메나라바 도레호도 요캇타데쇼-", 
                    "lineTranslation": "꿈이라면 얼마나 좋았을까요", 
                    "tokens": [
                        {"text":"夢","reading":"유메","meaning":"꿈","detail":"명사"},
                        {"text":"ならば","reading":"나라바","meaning":"~라면","detail":"조건 표현"}
                    ]
                }
            ]
            
            마크다운 없이 순수 JSON 텍스트만 줘.
        `;
        
        if (text) promptText += `\n[텍스트]: ${text}`;
        parts.push({ text: promptText });

        if (image) {
            parts.push({
                inline_data: { mime_type: mimeType, data: image }
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const googleRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        if (!googleRes.ok) {
            const errorData = await googleRes.json();
            throw new Error(`Google API 오류: ${errorData.error?.message}`);
        }

        const data = await googleRes.json();
        
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("AI 응답 없음");
        }

        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json|```/g, '').trim();
        
        return new Response(resultText, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Server Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}