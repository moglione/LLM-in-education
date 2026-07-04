# 🧠 GGUF Inference Engine — Decoupled Client-Server Architecture

> An educational project to understand, from the inside, how a modern Chat-AI service actually works.

---

## 🎯 Why does this project exist?

When someone uses ChatGPT, Claude, or any AI assistant, they see a text box and answers appearing word by word. That simplicity hides a full architecture: a frontend that knows nothing about artificial intelligence, and a backend that knows nothing about visual design, talking to each other through an API.

This project **is not primarily about "getting a chatbot to work."** It's about opening that black box and showing, with a real model running on your own machine, the pieces that make that service possible. The pedagogical goal is for anyone who works through it to stop seeing AI as magic and start seeing it as **systems engineering**: processes, protocols, and separated responsibilities.

---

## 📚 What this project teaches (beyond the code)

### 1. Decoupling as a way of thinking
The separation between the Backend (Python) and the Frontend (HTML/JS) isn't a technical detail — it's the core concept. The project makes it tangible that:

- The **backend** doesn't know and doesn't care how the interface looks.
- The **frontend** doesn't know and doesn't care how the text is generated — it just asks for it and displays it.
- That separation is the same logic used by large-scale commercial AI services.

Understanding this helps demystify how real products are built, not just standalone scripts.

### 2. How an AI chat "talks" internally
The project exposes something the end user normally never sees: how the model delivers text **token by token**, and how that gets transmitted in real time via HTTP streaming (Server-Sent Events). Watching words appear one at a time on screen, while knowing *why* they appear that way, builds a direct bridge between the abstraction "the AI responds" and the actual mechanics behind it.

### 3. Technical autonomy and data sovereignty
Running a `.gguf` model locally, without depending on an external API or a third-party service, also works a deeper idea: **it's possible to understand and control the tool**, rather than just consume it. This connects to a broader question running through the project: what does technological autonomy mean in a context where AI usually arrives packaged as a closed box?

### 4. Portability as a design principle
Having everything live inside the project folder, with no global installations, isn't just convenience — it teaches how to think about **reproducible, portable projects**, a transferable skill for any future software work.

---

## 🧩 Components (functional summary)

| Component | Role | Technology |
|---|---|---|
| **Backend** | Loads the model and handles inference | Python + FastAPI + `llama-cpp-python` |
| **Frontend** | Chat interface, consumes the API | Native HTML / CSS / JS |

Communication between the two happens over an HTTP endpoint (`/api/chat`), which the frontend consumes via streaming.

---

## 🧭 Pedagogical approach

This project is meant to be explored, not just run. A few principles guide it:

- **See before memorizing**: priority is given to observing the system's real behavior (the streaming, the process separation) before explaining software architecture theory in the abstract.
- **Error as part of learning**: if the server doesn't respond, if the model is slow, if the stream cuts off — that's study material too. It's where you see *where* each responsibility in the system actually lives.
- **From the concrete to the conceptual**: it starts by running something tangible (a chat that responds), then moves up in abstraction toward the concepts (client-server, APIs, streaming, decoupling).

---

## 🔜 Who this project is for

Built for people with technical curiosity who want to understand *how* an AI product works under the hood, more than for those who just want a working local chatbot. It works both as a starting point for a class or workshop, and as guided self-study.

---

## 📝 Note

This README describes the project's pedagogical intent. Installation, dependency, and setup documentation lives in a separate document (or coming soon here, in a *Usage* section).
