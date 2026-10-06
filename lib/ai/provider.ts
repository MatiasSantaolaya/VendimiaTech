export type AiMessage = { role: 'system'|'user'|'assistant'; content: string };
export interface AiProvider { complete(messages: AiMessage[]): Promise<string>; }

class CompatibleHttpAiProvider implements AiProvider {
  async complete(messages: AiMessage[]) {
    const base = process.env.AI_API_BASE_URL?.replace(/\/$/, '');
    const key = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'event-copilot';
    if (!base || !key) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
    const res = await fetch(`${base}/chat/completions`, { method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model, messages }), cache:'no-store' });
    if (!res.ok) throw new Error(`AI_PROVIDER_ERROR_${res.status}`);
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content || '');
  }
}
export const aiProvider: AiProvider = new CompatibleHttpAiProvider();
