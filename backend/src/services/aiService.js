import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getAIAdvice(prompt) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    response_format: { type: 'json object' },
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  return response.choices[0].message.content;
}
export async function getChatReply(systemPrompt, messages) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 1024,
  });
  return completion.choices[0].message.content;
}