import Groq from 'groq-sdk';

// Created on first use rather than at import time, so the server still
// boots (and anonymous squad lookups still work) without a GROQ_API_KEY.
let groq;
function getGroq() {
  groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

export async function getAIAdvice(prompt) {
  const response = await getGroq().chat.completions.create({
    model: 'openai/gpt-oss-120b',
    max_tokens: 4096,
    reasoning_effort: 'low',
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  return response.choices[0].message.content;
}
export async function getChatReply(systemPrompt, messages) {
  const completion = await getGroq().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 4096,
    reasoning_effort: 'low',
  });
  return completion.choices[0].message.content;
}
