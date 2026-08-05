import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;

    const userMsg = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await API.post("chat/chat", {
        message: input,
      });

      const botMsg = { text: res.data.reply || "No response", sender: "bot" };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = { text: "⚠️ Server error, please try again.", sender: "bot" };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-blue-500 shadow-xl text-xl flex items-center justify-center z-50"
      >
        🤖
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-20 right-5 w-80 h-[420px] backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            
            {/* Header */}
            <div className="p-4 border-b border-white/20 flex justify-between items-center">
              <h3 className="font-semibold">🤖 AI Assistant</h3>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                    msg.sender === "user"
                      ? "ml-auto bg-blue-500"
                      : "bg-white/20"
                  }`}
                >
                  {msg.text}
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/20 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-500 rounded-xl text-sm font-semibold hover:bg-blue-600"
              >
                Send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}