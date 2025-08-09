// Vercel Serverless Function: /api/recommend
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'AI Stylist API is running. POST JSON to this endpoint to get outfit suggestions.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    age, gender, genderConfidence,
    skinHex, skinToneBucket, undertone, season
  } = req.body || {};

  if (!season || !skinHex) {
    return res.status(400).json({ error: 'Missing required fields: season, skinHex' });
  }

  try {
    const sys = `You are a fashion stylist. Return concise, practical head-to-toe outfit suggestions as strict JSON.
Consider age, gender, skin tone bucket (light/medium/deep), undertone (warm/cool/neutral), season.
No brand names. Fabrics must fit the season. Output keys:
- headwear, top, midlayer, bottoms, footwear, accessories
- palette: { "primary": hex, "accent": hex, "neutral": hex }
- rationale`;

    const user = JSON.stringify({ age, gender, genderConfidence, skinHex, skinToneBucket, undertone, season });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ]
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: 'OpenAI error', detail: txt });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    let json;
    try { json = JSON.parse(text); }
    catch { json = { error: 'LLM returned non-JSON', raw: text }; }

    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
