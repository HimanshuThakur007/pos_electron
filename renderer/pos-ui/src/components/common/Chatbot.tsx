import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Menu,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  options?: string[];
  imageUrl?: string;
  timestamp: Date;
}

const processReply = (reply: string) => {
  let imageUrl;
  let cleanReply = reply;

  // Extract image tag if backend sends it like [IMAGE:https://...]
  const imgMatch = cleanReply.match(/\[IMAGE:(.*?)\]/);
  if (imgMatch) {
    imageUrl = imgMatch[1];
    cleanReply = cleanReply.replace(imgMatch[0], "").trim();
  }

  const triggerPhrases = ["Try asking:", "Ask me things like:"];
  const trigger = triggerPhrases.find((t) => cleanReply.includes(t));

  if (trigger) {
    const parts = cleanReply.split(trigger);
    const textPart = parts[0] + trigger;
    const listPart = parts[1] || "";

    const options = listPart
      .split(/\n\s*-/)
      .map((opt) => opt.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    return { text: textPart, options, imageUrl };
  }
  return { text: cleanReply, imageUrl };
};

const INITIAL_REPLY = processReply(
  "Hi there! 👋 I'm your POS intelligence assistant. I can help you analyze sales, track inventory, and uncover insights from your data. Try asking:\n- 📊 Today's Sales Overview\n- 📈 Sales trend vs yesterday\n- ⏱️ What is my peak hour?\n- 📦 Out of stock alerts\n- 💰 Payment Analytics\n- 🔄 Sync Status\n- Price of [Item Code]\n- Details of bill [Bill No]\n- Offers on [Item Code]",
);

const generateInitMessage = (): Message => ({
  id: `init-${Date.now()}`,
  role: "bot",
  text: INITIAL_REPLY.text,
  options: INITIAL_REPLY.options,
  timestamp: new Date(),
});

const ALL_SUGGESTIONS = [
  "What are today's sales?",
  "What is yesterday's sale?",
  "Sales trend vs yesterday",
  "What is my peak hour?",
  "Payment breakdown",
  "Out of stock items",
  "Top products today",
  "Low stock alerts",
  "Total stock inventory",
  "Sync summary",
  "Pending sync status",
  "Scheme analytics",
  "Total items",
  "Total branches",
  "Total schemes",
  "Price of [Item Code]",
  "Stock of [Item Code]",
  "Details of bill [Bill No]",
  "Offers on [Item Code]",
  "Keyboard shortcuts",
  "How to hold a sale?",
  "How does offline sync work?",
  "How to export backup?",
  "Shift management",
  "How to reprint a bill?",
];

const renderMessageText = (text: string, role: string) => {
  if (role === "user") {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const lines = text.split("\n");
  const hasList = lines.some((l) => l.trim().startsWith("- "));

  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Transform bullet points into styled data cards
        if (trimmed.startsWith("- ")) {
          const content = trimmed.substring(2);
          const colonIndex = content.indexOf(":");

          if (colonIndex > 0 && colonIndex < 40) {
            const key = content.substring(0, colonIndex + 1);
            const val = content.substring(colonIndex + 1);
            return (
              <div
                key={i}
                className="flex items-start gap-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors px-3.5 py-2.5 rounded-xl border border-gray-100/80 shadow-sm"
              >
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <span className="leading-relaxed text-[13px] w-full">
                  <span className="font-bold text-gray-900">{key} </span>
                  <span className="text-gray-700 font-medium">{val}</span>
                </span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="flex items-start gap-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors px-3.5 py-2.5 rounded-xl border border-gray-100/80 shadow-sm"
            >
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              <span className="text-gray-700 font-medium leading-relaxed text-[13px]">
                {content}
              </span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={`leading-relaxed text-[13.5px] px-1 ${
              (i === 0 && hasList) ||
              (trimmed.includes(":") && !trimmed.startsWith("-"))
                ? "font-bold text-gray-900 mb-1 mt-1 text-[14.5px] tracking-tight"
                : "text-gray-700"
            }`}
          >
            {trimmed}
          </div>
        );
      })}
    </div>
  );
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([generateInitMessage()]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const filteredSuggestions = useMemo(() => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return ALL_SUGGESTIONS.filter(
      (s) => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower,
    ).slice(0, 6);
  }, [input]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
    if (input.trim()) setShowAllOptions(false);
  }, [input]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!input.trim() || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    }
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isTyping) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: userText,
        timestamp: new Date(),
      },
    ]);
    setIsTyping(true);

    try {
      const posApi = (window as any).posApi;
      if (posApi?.chatbotQuery) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const reply = await posApi.chatbotQuery(userText);
        const processed = processReply(reply);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            text: processed.text,
            options: processed.options,
            imageUrl: processed.imageUrl,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "bot",
            text: "Unable to connect. Please check your connection.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "bot",
          text: "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRestart = () => {
    setMessages([generateInitMessage()]);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Intercept submit if a suggestion is currently highlighted via keyboard
    if (
      activeSuggestionIndex >= 0 &&
      filteredSuggestions[activeSuggestionIndex]
    ) {
      handleOptionClick(filteredSuggestions[activeSuggestionIndex]);
      return;
    }
    sendMessage(input);
  };

  const handleOptionClick = (opt: string) => {
    setActiveSuggestionIndex(-1);
    if (opt.includes("[") && opt.includes("]")) {
      setInput(opt);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Automatically select the placeholder bracket text to quickly overwrite
          const start = opt.indexOf("[");
          const end = opt.indexOf("]") + 1;
          inputRef.current.setSelectionRange(start, end);
        }
      }, 50);
    } else {
      const cleanOpt = opt.replace(/^[📊📈📦💰🔄🎯⚠️💳]+\s*/, "");
      sendMessage(cleanOpt);
    }
  };

  return (
    <>
      {/* Custom CSS for animations and scrollbar */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .chat-window {
          animation: slideIn 0.2s ease-out;
        }
        
        .message-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Typing animation */
        .typing-dot {
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        
        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-6px);
          }
        }
      `}</style>

      {/* Enlarged Image Overlay */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer"
          >
            <X size={28} />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged view"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 font-sans antialiased">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative bg-gradient-to-br from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white p-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              boxShadow: "0 20px 35px -10px rgba(0,0,0,0.3)",
            }}
          >
            <MessageSquare size={22} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </button>
        ) : (
          <div className="chat-window w-[400px] h-[680px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-sm">
                    <Bot size={20} className="text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900"></span>
                </div>
                <div className="flex flex-col justify-center">
                  <h5 className="text-[15px] font-bold text-white tracking-wide mb-0.5">
                    POS Assistant
                  </h5>
                  <p className="text-gray-300 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1">
                    <Sparkles size={10} className="text-emerald-400" />
                    AI-Powered Analytics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRestart}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  title="New chat"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {msg.role === "bot" && (
                      <div className="flex items-center gap-2 mb-1.5 ml-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                          <Bot size={12} className="text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          Assistant
                        </span>
                      </div>
                    )}

                    <div
                      className={`text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gray-900 text-white rounded-2xl rounded-br-md shadow-md"
                          : "bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-gray-100"
                      } overflow-hidden`}
                    >
                      {msg.imageUrl && (
                        <div
                          className="bg-gray-200 flex justify-center relative cursor-pointer overflow-hidden group"
                          onClick={() => setEnlargedImage(msg.imageUrl || null)}
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Bot response"
                            className="w-full h-auto max-h-72 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="px-3 py-2.5">
                        {renderMessageText(msg.text, msg.role)}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-2 mt-1.5 ml-1 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.role === "bot" && msg.id !== "init" && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Sparkles size={10} />
                          AI
                        </span>
                      )}
                    </div>

                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => handleOptionClick(opt)}
                            className="group w-full text-left px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex items-center justify-between"
                          >
                            <span className="font-medium">{opt}</span>
                            <ChevronRight
                              size={14}
                              className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1.5">
                      <span
                        className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Suggestions */}
            <div className="px-5 py-3 bg-white border-t border-gray-100">
              <div
                className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar"
                style={{ scrollbarWidth: "thin" }}
              >
                <button
                  type="button"
                  onClick={() => handleOptionClick("📊 Today's numbers")}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors duration-200"
                >
                  📊 Today's numbers
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionClick("⏱️ Peak hour")}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors duration-200"
                >
                  ⏱️ Peak hour
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionClick("⚠️ Out of stock")}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors duration-200"
                >
                  ⚠️ Out of stock
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionClick("💳 Payment methods")}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-600 transition-colors duration-200"
                >
                  💳 Payment methods
                </button>
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="p-4 bg-white border-t border-gray-100 relative"
            >
              {/* Typeahead Suggestions */}
              {input.trim() &&
                filteredSuggestions.length > 0 &&
                !isTyping &&
                !showAllOptions && (
                  <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 mb-2 bg-white border border-gray-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-20">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                      {filteredSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOptionClick(suggestion)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                            idx === activeSuggestionIndex
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={
                              idx === activeSuggestionIndex ? "font-medium" : ""
                            }
                          >
                            {suggestion}
                          </span>
                          <ChevronRight
                            size={14}
                            className={`transition-opacity ${idx === activeSuggestionIndex ? "text-gray-500 opacity-100" : "text-gray-300 opacity-0 group-hover:opacity-100"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* All Options Menu */}
              {showAllOptions && !isTyping && (
                <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 mb-2 bg-white border border-gray-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-20">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      All Available Questions
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllOptions(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                    {ALL_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleOptionClick(suggestion);
                          setShowAllOptions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group text-gray-700 hover:bg-gray-50"
                      >
                        <span>{suggestion}</span>
                        <ChevronRight
                          size={14}
                          className="transition-opacity text-gray-300 opacity-0 group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    disabled={isTyping}
                    onKeyDown={handleInputKeyDown}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:bg-gray-100"
                    placeholder={
                      isTyping
                        ? "Assistant is thinking..."
                        : "Ask me anything..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllOptions((prev) => !prev)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center min-w-[42px]"
                  title="Show all questions"
                >
                  <Menu size={18} />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center min-w-[42px]"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="flex justify-center gap-4 mt-3">
                <span className="text-xs text-gray-400">↵ Enter to send</span>
                <span className="text-xs text-gray-400">⎋ Esc to close</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
