"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Loader2, Send, UserRound } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Azure OpenAI test chat is ready. Send any message to verify the model connection."
  }
];

export function AzureChatPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSource = useMemo(() => (messages.length > 1 ? "Azure OpenAI" : "Waiting for first test"), [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/azure-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== "welcome")
            .map(({ role, content }) => ({ role, content }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Azure request failed.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Azure request failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-azure">Azure model playground</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Talk directly to the deployed model</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-fluent-muted">
          This page bypasses the TrustPass risk prompt and lets you test whether Azure OpenAI responds like a normal assistant.
          It uses the same endpoint, key, deployment, and API version from <span className="font-semibold">.env.local</span>.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-azure">
          Source: {lastSource}
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-fluent-border bg-white shadow-sm">
        <div className="chat-scroll flex h-[520px] flex-col gap-3 overflow-y-auto bg-fluent-canvas p-4 sm:p-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isSending && (
            <div className="flex items-center gap-2 text-sm font-semibold text-fluent-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Asking Azure OpenAI...
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-fluent-border p-4">
          <div className="flex flex-col gap-3 rounded-[8px] border border-fluent-border bg-white p-3 focus-within:border-azure sm:flex-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything, for example: Hello, how is the weather today?"
              rows={2}
              className="min-h-12 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-azure px-4 py-2 text-sm font-semibold text-white transition hover:bg-fluent-blueDark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-3xl rounded-[8px] px-4 py-3 text-sm leading-6 ${isUser ? "bg-azure text-white" : "border border-fluent-border bg-white text-ink"}`}>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold opacity-80">
          {isUser ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          {isUser ? "You" : "Azure OpenAI"}
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
