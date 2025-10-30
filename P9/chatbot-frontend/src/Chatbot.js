import React, { useState } from 'react';

const Chatbot = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // historial de chat

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    // Añadir pregunta al historial
    setChatHistory((prev) => [...prev, { type: 'user', text: question }]);

    try {
      const res = await fetch('http://localhost:5050/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await res.json();

      // Añadir respuesta al historial
      setChatHistory((prev) => [...prev, { type: 'bot', text: JSON.stringify(data.answer, null, 2) }]);
    } catch (err) {
      setChatHistory((prev) => [...prev, { type: 'bot', text: 'Error al consultar backend' }]);
    }

    // Limpiar input
    setQuestion('');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Chatbot</h1>

      <div style={{ border: '1px solid #ccc', padding: '10px', minHeight: '300px', borderRadius: '8px', marginBottom: '10px', overflowY: 'auto' }}>
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.type === 'user' ? 'right' : 'left',
              margin: '5px 0'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: '16px',
                backgroundColor: msg.type === 'user' ? '#007bff' : '#e5e5ea',
                color: msg.type === 'user' ? '#fff' : '#000',
                maxWidth: '80%',
                wordBreak: 'break-word'
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escribe tu pregunta..."
          style={{ flex: 1, padding: '10px', borderRadius: '16px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', borderRadius: '16px', border: 'none', backgroundColor: '#007bff', color: '#fff' }}>
          Enviar
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
