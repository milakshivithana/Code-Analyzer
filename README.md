# QuantumCode Analyzer 🚀

QuantumCode Analyzer is an advanced, full-stack developer tool designed to analyze source code snippets. Using a static analysis model powered by the **Gemini API**, the platform evaluates runtime complexity classes, highlights active syntax bugs with exact fixes, renders side-by-side refactoring visual diffs, and provides an interactive conversational assistant to chat directly about the pasted code.

## ✨ Features

- 🖥️ **Monaco-Style Interactive Editor**: Supports multi-language selection (Python, JS, TS, Java, C++, Go) with dynamic line numbers.
- 📊 **Dynamic Big-O SVG Graph**: Features an interactive computational graph. When the AI detects a complexity class (e.g. $O(N^2)$), the corresponding mathematical curve glows in neon purple and triggers active particle animations!
- 🐛 **Actionable Bug Log**: Scans code for boundary limits, runtime crash vulnerabilities, and style violations. Categorizes them by severity (*Critical*, *Warning*, *Info*) with code-block recommendations.
- 🔄 **Refactoring Visual Diffs**: Presents side-by-side (before vs. after) code comparisons showing optimized performance implementations.
- 💬 **Algorithmic Conversation Terminal**: Allows developers to chat in real-time with an AI assistant specifically briefed on the pasted code context.
- 🎨 **Premium Glassmorphic Dark UI**: Highly responsive, fully accessible interface featuring rich customized HSL colors, dark blurs, glowing buttons, and smooth micro-animations.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router, TypeScript), Radix UI Primitives, Lucide Icons, Vanilla CSS Modules.
- **Backend**: FastAPI (Python 3.11), Uvicorn Server, Pydantic Schema validations.
- **AI Integration**: Gemini API (`gemini-1.5-flash`) utilizing Structured JSON output schemas.

---

## 🚀 Local Development Setup

To run this application locally, follow these simple setup steps:

### 1. Prerequisite: Add API Key
Create a `.env` file inside the `backend` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
```
*(Alternatively, you can paste your API key directly into the secure key field in the web UI header).*

### 2. Run Python Backend
Navigate to the `/backend` folder, set up your dependencies, and launch Uvicorn:
```bash
# Go to backend
cd backend

# Create virtualenv (Windows)
py -3.11 -m venv venv
venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run server
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
Backend will start on `http://127.0.0.1:8000` with interactive API docs at `http://127.0.0.1:8000/docs`.

### 3. Run Next.js Frontend
Navigate to the `/frontend` folder and start the dev server:
```bash
# Go to frontend
cd ../frontend

# Install dependencies
npm install

# Run dev
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser to start analyzing code!

---

## 🔒 Security & Code Hygiene
Sensitive files (like environment keys), node packages (`node_modules`), Python virtual environments (`venv`), and Next.js compiler artifacts (`.next/`) are strictly ignored using a multi-layered `.gitignore` setup to keep the repository secure and pristine.
