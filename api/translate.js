export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { report, targetLang, langName } = req.body;

  if (!report || !targetLang || !langName) {
    return res.status(400).json({ error: 'Missing required fields: report, targetLang, langName' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Translation service not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a professional bilingual educator. Translate the following parent progress report from English to ${langName}.

IMPORTANT RULES:
- Translate EVERYTHING including all prompt content — not just headers
- Keep the same tone: warm, professional, educational
- Preserve all emoji exactly as they appear
- Keep blank lines (_______________ ) exactly as they are
- Keep teacher name, class name, school name, and dates in their original form
- Do NOT add any explanation, notes, or commentary
- Output ONLY the translated report — nothing else

REPORT TO TRANSLATE:
${report}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'Translation service error. Please try again.' });
    }

    const data = await response.json();
    const translated = data.content?.[0]?.text;

    if (!translated) {
      return res.status(502).json({ error: 'No translation returned. Please try again.' });
    }

    return res.status(200).json({ translated });

  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Translation failed. Please try again.' });
  }
}
