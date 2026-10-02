import { useEffect } from "react";
import { MessageBubble, TypingIndicator } from "../components/ChatBits";
import { useChatStream } from "../hooks/useChatStream";

/** Streams a single AI answer for a test prompt (used by the Prompt Assistant). */
export function ChatBubbleDemo({ prompt }: { prompt: string }) {
  const chat = useChatStream([]);
  const { send } = chat;
  useEffect(() => { send(prompt); /* run once on mount */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3 rounded-xl border border-line bg-bg2/60 p-3" aria-live="polite">
      {chat.messages.map((m) => <MessageBubble key={m.id} message={m} compact />)}
      {chat.phase === "typing" && <TypingIndicator />}
    </div>
  );
}
