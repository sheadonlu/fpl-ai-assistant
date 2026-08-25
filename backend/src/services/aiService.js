import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getAIAdvice(prompt) {
  const response = await groq.chat.completions.create({
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
  const completion = await groq.chat.completions.create({
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