exports.chat = async (req, res) => {
    try {
        const { message } = req.body;

        const response = await fetch('http://127.0.0.1:8001/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || 'AI Service Error');
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("Chat Error:", err.message);
        res.status(500).json({ reply: "Sorry, I am having trouble connecting to the server. Please try again later." });
    }
};