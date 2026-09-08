import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { describe, expect, it, vi } from 'vitest'

// Exercise the real installed SDKs; all HTTP is supplied by the synthetic fetch below.
vi.unmock('ai')
vi.unmock('@ai-sdk/anthropic')

const fixtures = [
  {
    name: 'Anthropic',
    model: (fetch: typeof globalThis.fetch) => createAnthropic({ apiKey: 'synthetic', fetch })('claude-sonnet-4-5'),
    body: { id: 'synthetic', type: 'message', role: 'assistant', model: 'claude-sonnet-4-5', content: [{ type: 'text', text: 'Synthetic response' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 2 } },
  },
  {
    name: 'OpenAI',
    model: (fetch: typeof globalThis.fetch) => createOpenAI({ apiKey: 'synthetic', fetch }).chat('gpt-4o'),
    body: { id: 'synthetic', object: 'chat.completion', created: 1, model: 'gpt-4o', choices: [{ index: 0, message: { role: 'assistant', content: 'Synthetic response' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } },
  },
]

describe.each(fixtures)('$name response body safety', ({ model, body }) => {
  it('accepts an ordinary JSON response through the installed provider and AI SDK', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(body))
    const result = await generateText({ model: model(fetch), prompt: 'Synthetic input', maxRetries: 0 })
    expect(result.text).toBe('Synthetic response')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([200, 500])('rejects and cancels an oversized JSON response with status %i', async (status) => {
    const cancel = vi.fn()
    // A tiny finite body makes the vulnerable version fail safely, without allocating GiB.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(body)))
        controller.close()
      },
      cancel,
    })
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(stream, {
      status,
      headers: { 'content-type': 'application/json', 'content-length': String(2 * 1024 * 1024 * 1024 + 1) },
    }))
    await expect(generateText({ model: model(fetch), prompt: 'Synthetic input', maxRetries: 0 }))
      .rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringMatching(/exceeded maximum size/) }) })
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
