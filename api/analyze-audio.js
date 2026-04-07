// Helper to create a WAV header for 16-bit mono 16kHz audio
function createWavBuffer(samples) {
  const length = samples.length * 2; // 16-bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + length);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + length, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); 
  buffer.writeUInt16LE(1, 20); // Mono
  buffer.writeUInt16LE(1, 22); 
  buffer.writeUInt32LE(16000, 24); // Sample Rate
  buffer.writeUInt32LE(32000, 28); // Byte Rate (16000 * 2)
  buffer.writeUInt16LE(2, 32);     // Block Align
  buffer.writeUInt16LE(16, 34);    // Bits per sample

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(length, 40);

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buffer;
}

async function checkWithGemini(samples, apiKey) {
  const wavBuffer = createWavBuffer(samples);
  const base64Audio = wavBuffer.toString("base64");
  const prompt = "Analyze this 1-second audio clip recorded from a wearable health device. Determine if it contains a human cough or human wheezing. Respond strictly in JSON format: {\"cough\": 0, \"wheeze\": 1}. Use 0 for no and 1 for yes.";

  const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  const VERSIONS = ["v1beta", "v1"];
  let lastError = "No models attempted";

  for (const ver of VERSIONS) {
    for (const modelId of MODELS) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/${ver}/models/${modelId}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "audio/wav", data: base64Audio } }
              ]
            }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (!response.ok) {
          lastError = `[${ver}] Model ${modelId} failed: ${response.status} ${await response.text()}`;
          continue;
        }

        const result = await response.json();
        const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResult) {
          lastError = `[${ver}] Model ${modelId} gave empty response: ${JSON.stringify(result)}`;
          continue;
        }
        return { success: true, data: JSON.parse(textResult) };
      } catch (err) {
        lastError = `[${ver}] Model ${modelId} exception: ${err.message}`;
        continue;
      }
    }
  }
  return { success: false, error: lastError };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { device_id, data } = req.body || {};
    if (!device_id || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Missing device_id or audio data array' });
    }

    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return res.status(500).json({ error: 'Server configuration error: Gemini key missing' });
    }

    // 1. Prepare Features: ESP32 now sends raw 16-bit PCM. Pad to 48,000.
    const scaledFeatures = Array.from({ length: 48000 }, (_, i) => 
      data[i % data.length]
    );

    console.log(`[Flow] 1. Sending to Hugging Face...`);
    const hfResponse = await fetch('https://cmmanuel2000-hikon-model-2-1.hf.space/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey}` },
      body: JSON.stringify({ features: scaledFeatures })
    });

    if (!hfResponse.ok) {
      const errorBody = await hfResponse.text();
      console.error(`[HF Error] Status: ${hfResponse.status}, Body:`, errorBody);
      throw new Error(`HF Error: ${hfResponse.status} - ${errorBody}`);
    }
    const hfResult = await hfResponse.json();
    const classifications = hfResult.result?.classification || {};
    
    let coughProb = classifications['cough'] || 0;
    let wheezeProb = classifications['wheeze'] || 0;

    // 2. Trigger Gemini if HF is "suspicious" (>0.10)
    let isCough = 0;
    let isWheeze = 0;
    let geminiVerified = false;
    let geminiErrorReason = null;

    if (coughProb > 0.10 || wheezeProb > 0.10) {
      console.log(`[Flow] 2. Suspicious activity (C:${coughProb.toFixed(2)}, W:${wheezeProb.toFixed(2)}). Asking Gemini...`);
      
      const geminiResult = await checkWithGemini(scaledFeatures, geminiApiKey);
      if (geminiResult.success) {
        geminiVerified = true;
        isCough = geminiResult.data.cough || 0;
        isWheeze = geminiResult.data.wheeze || 0;
        console.log(`[Flow] 3. Gemini Response:`, geminiResult.data);
      } else {
        geminiErrorReason = geminiResult.error;
        // Fallback to HF results
        isCough = coughProb > 0.5 ? 1 : 0;
        isWheeze = wheezeProb > 0.4 ? 1 : 0;
      }
    } else {
      console.log(`[Flow] 2. HF reports clear (C:${coughProb.toFixed(2)}, W:${wheezeProb.toFixed(2)}).`);
    }

    return res.status(200).json({ 
      success: true, 
      inference: { cough: isCough, wheeze: isWheeze },
      gemini_verified: geminiVerified,
      gemini_error: geminiErrorReason,
      scores: classifications
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

