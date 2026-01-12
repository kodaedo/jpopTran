// Vercel Serverless Function
export default async function handler(req, res) {
    // 1. Vercel 환경변수에서 내 키를 몰래 꺼내옵니다.
    const apiKey = process.env.GEMINI_API_KEY; 
    const testKey = "AIzaSyCAcvexU7Zoj0UyC_K3e5d2DSxeIhlaF8M";
    
    if (!apiKey) {
        return res.status(500).json({ error: "API 키가 설정되지 않았습니다." });
    }

    const { text, image, mimeType } = req.body;

    try {
        // 2. 구글에게 보낼 프롬프트 준비
        const parts = [];
        let promptText = `
            일본어 가사를 분석해줘. JSON 형식만 출력해.
            포맷: [{"fullPronunciation":"전체발음", "lineTranslation":"해석", "tokens":[{"text":"단어","reading":"읽기","meaning":"뜻","detail":"설명"}]}]
        `;
        if (text) promptText += `\n[텍스트]: ${text}`;
        parts.push({ text: promptText });

        if (image) {
            parts.push({
                inline_data: { mime_type: mimeType, data: image }
            });
        }

        // 3. 서버에서 Google API 호출 (사용자는 이 과정을 볼 수 없음)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${testKey}`;
        
        const googleRes = await fetch(testUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await googleRes.json();
        
        // 4. 결과를 깔끔하게 다듬어서 프론트엔드로 전달
        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json|```/g, '').trim();
        
        res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "번역 실패" });
    }
}