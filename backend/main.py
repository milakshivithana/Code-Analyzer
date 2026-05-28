import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

app = FastAPI(
    title="AI Code Analyzer API",
    description="Backend service for analyzing code snippets using Gemini API structured outputs.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas for Gemini Structured Output ---

class TimeComplexity(BaseModel):
    time: str = Field(description="The Big-O time complexity class, e.g., O(1), O(log N), O(N), O(N log N), O(N^2), O(2^N).")
    space: str = Field(description="The Big-O space complexity class, e.g., O(1), O(N).")
    explanation: str = Field(description="Detailed step-by-step breakdown of how the complexities were determined.")

class Bug(BaseModel):
    line: int = Field(description="The line number where the issue or bug is located (1-indexed). Use 0 if it applies to the whole code.")
    severity: str = Field(description="Severity of the issue: 'critical' (breaks code), 'warning' (bad practice/potential bug), or 'info' (convention/style).")
    description: str = Field(description="Description of what is wrong.")
    fix: str = Field(description="Suggested correction or code snippet to fix the issue.")

class Improvement(BaseModel):
    description: str = Field(description="Explanation of what performance or style improvement can be made.")
    before_snippet: str = Field(description="Original code block to be improved.")
    after_snippet: str = Field(description="Optimized or improved code block.")
    impact: str = Field(description="The impact of this optimization: 'high' (significant performance gain), 'medium' (moderate gain), or 'low' (style/micro-optimization).")

class AnalysisResponse(BaseModel):
    complexity: TimeComplexity = Field(description="Time and space complexity details.")
    bugs: List[Bug] = Field(description="List of detected bugs, warnings, and styling issues.")
    improvements: List[Improvement] = Field(description="List of performance and refactoring recommendations.")
    refactored_code: str = Field(description="The fully refactored, clean, and bug-free version of the provided code.")

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "online", "service": "AI Code Analyzer API"}

def get_gemini_client(x_gemini_key: Optional[str] = None):
    """
    Resolves the Gemini API Key, prioritizing the request header,
    falling back to local environment variables (.env).
    """
    api_key = None
    
    # 1. Check Header
    if x_gemini_key and x_gemini_key.strip() and x_gemini_key != "undefined":
        api_key = x_gemini_key
    
    # 2. Check Environment Variables
    if not api_key:
        env_key = os.getenv("GEMINI_API_KEY")
        if env_key and env_key != "YOUR_GEMINI_API_KEY_HERE" and env_key.strip():
            api_key = env_key

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is missing. Please set GEMINI_API_KEY in the backend .env or provide it in the UI."
        )
    
    genai.configure(api_key=api_key)
    return genai

class AnalyzeRequest(BaseModel):
    code: str
    language: str

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_code(request: AnalyzeRequest, x_gemini_key: Optional[str] = Header(None)):
    try:
        ai_client = get_gemini_client(x_gemini_key)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure Gemini: {str(e)}")

    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code snippet cannot be empty.")

    # Select the model (using modern recommended gemini-1.5-flash for speed and reliability)
    model = ai_client.GenerativeModel("gemini-1.5-flash")

    # Build prompt
    prompt = f"""
    You are an elite software architect and static analyzer.
    Analyze the following code snippet.
    
    Language: {request.language}
    Code:
    ```
    {request.code}
    ```
    
    Perform these tasks:
    1. Determine the Big-O Time and Space complexities, and write a detailed explanation.
    2. Scan the code for all critical bugs, security vulnerabilities, logical flaws, warnings, or style guidelines (PEP8, ESLint, etc.). For each issue, specify the line number, severity, description, and exact fix.
    3. Find potential performance improvements or code smell cleanups. List them with impact (high/medium/low) and provide a before/after snippet showing the exact optimization.
    4. Provide the fully refactored, bug-free, and highly optimized version of the complete code snippet.
    """

    try:
        # Request a structured JSON response matching our AnalysisResponse Pydantic model
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=AnalysisResponse,
                temperature=0.2, # Low temperature for accurate, analytical results
            )
        )
        
        # Parse the JSON string from Gemini's response
        result_json = json.loads(response.text)
        return result_json
        
    except json.JSONDecodeError as jde:
        raise HTTPException(
            status_code=500, 
            detail=f"Gemini returned invalid JSON structure: {str(jde)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"API error occurred during Gemini analysis: {str(e)}"
        )

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    code: str
    language: str
    message: str
    history: List[ChatMessage]

@app.post("/api/chat")
async def chat_about_code(request: ChatRequest, x_gemini_key: Optional[str] = Header(None)):
    try:
        ai_client = get_gemini_client(x_gemini_key)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure Gemini: {str(e)}")

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Initialize model
    model = ai_client.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=(
            f"You are an expert programming assistant. You are helping a developer analyze, debug, "
            f"and improve this code snippet written in {request.language}:\n"
            f"```\n{request.code}\n```\n"
            f"Be concise, technical, and helpful. Always refer directly to the provided code."
        )
    )

    try:
        # Formulate conversation history in Gemini's format
        # Gemini expects format: [{"role": "user"|"model", "parts": [content_string]}]
        gemini_history = []
        for msg in request.history:
            role = "user" if msg.role == "user" else "model"
            gemini_history.append({
                "role": role,
                "parts": [msg.content]
            })

        # Start Gemini Chat Session with history
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(request.message)
        
        return {
            "response": response.text
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"API error occurred during Gemini chat: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Read environment PORT or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
