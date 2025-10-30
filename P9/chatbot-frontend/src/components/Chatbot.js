import React, { useState } from "react";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const userId = "usuario123"; // Puedes generar dinámico si quieres

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await fetch("http://localhost:5050/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text: input })
      });

      if (!res.ok) throw new Error("Error en la petición");

      const data = await res.json();
      const botMessage = { role: "assistant", text: data.answer };
      setMessages(prev => [...prev, botMessage]);
      setInput("");

    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      const errorMessage = { role: "assistant", text: "❌ Error al comunicarse con el backend." };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div style={{ maxWidth: "500px", margin: "20px auto", fontFamily: "Arial" }}>
      <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "10px", height: "400px", overflowY: "auto", backgroundColor: "#f9f9f9" }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ margin: "8px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: "16px",
              backgroundColor: msg.role === "user" ? "#007bff" : "#e5e5ea",
              color: msg.role === "user" ? "#fff" : "#000"
            }}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px", display: "flex" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          placeholder="Escribe tu mensaje..."
        />
        <button onClick={sendMessage} style={{ marginLeft: "5px", padding: "8px 16px", borderRadius: "4px", border: "none", backgroundColor: "#007bff", color: "#fff" }}>
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
