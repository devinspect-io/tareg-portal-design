"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { answerQuestion, SUGGESTED_PROMPTS, type AiAnswer } from "@/lib/ai-reports";

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: AiAnswer };

let nextId = 0;
const newId = () => `m-${nextId++}`;

function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </svg>
  );
}

/** Three-dot "thinking" indicator. */
function Typing() {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-prime-500 dark:bg-prime-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </div>
  );
}

function AnswerTable({ table }: { table: NonNullable<AiAnswer["table"]> }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400">
            {table.headers.map((h) => (
              <th key={h} className="px-2.5 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-2.5 py-2 whitespace-nowrap text-neutral-700 dark:text-neutral-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AiChatProps = {
  /** "panel" is the compact floating popup; "page" is the full module view. */
  variant?: "panel" | "page";
  /**
   * Hands the parent a stable `ask` fn so surrounding UI (e.g. the reporting
   * page's shortcut chips) can drive the conversation.
   */
  registerAsk?: (ask: (question: string) => void) => void;
  /** Fires when the conversation goes from empty to started (and back). */
  onActiveChange?: (active: boolean) => void;
};

export default function AiChat({
  variant = "panel",
  registerAsk,
  onActiveChange,
}: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || thinking) return;

    setMessages((prev) => [...prev, { id: newId(), role: "user", text }]);
    setInput("");
    setThinking(true);

    // Simulated round-trip — replace with a real API call when one exists.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", answer: answerQuestion(text) },
      ]);
      setThinking(false);
    }, 700);
  }

  const active = messages.length > 0;
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Keep a stable wrapper pointing at the latest `ask`, so registering once
  // doesn't capture a stale `thinking` value.
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    registerAsk?.((q: string) => askRef.current(q));
  }, [registerAsk]);

  const isPage = variant === "page";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 ${isPage ? "sm:px-6" : ""}`}
      >
        {messages.length === 0 && !thinking && (
          <div className={isPage ? "mx-auto max-w-2xl py-6 text-center" : "py-2"}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-prime-50 text-prime-600 dark:bg-prime-950/50 dark:text-prime-400">
              <SparkIcon size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Ask about your operations
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              I can pull reports from your dashboard data.
            </p>
            <div className={`mt-4 flex flex-wrap gap-2 ${isPage ? "justify-center" : ""}`}>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => ask(p)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-prime-500 dark:hover:text-prime-400"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`space-y-4 ${isPage ? "mx-auto max-w-3xl" : ""}`}>
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-prime-600 px-3.5 py-2 text-sm text-white">
                    {m.text}
                  </p>
                ) : (
                  <div className="max-w-full min-w-0 rounded-2xl rounded-bl-sm bg-neutral-100 px-3.5 py-2.5 dark:bg-neutral-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                      {m.answer.text}
                    </p>
                    {m.answer.table && <AnswerTable table={m.answer.table} />}
                    {m.answer.followUps && m.answer.followUps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.answer.followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => ask(f)}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-prime-700 transition-colors hover:bg-prime-50 dark:bg-neutral-900 dark:text-prime-400 dark:hover:bg-neutral-700"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-neutral-100 px-2.5 dark:bg-neutral-800">
                <Typing />
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className={`shrink-0 border-t border-neutral-100 p-3 dark:border-neutral-800 ${isPage ? "sm:px-6" : ""}`}
      >
        <div className={`flex items-center gap-2 ${isPage ? "mx-auto max-w-3xl" : ""}`}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a report…"
            aria-label="Ask the assistant for a report"
            className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-prime-600 text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
