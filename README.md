# Sinhala Eye-Controlled Keyboard Starter

## How to Run

### 1. Frontend (React)
```bash
cd frontend
npm install
npm start
```
→ Open http://localhost:3000

### 2. Backend (Flask)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
# or
source venv/bin/activate  # On Mac/Linux

pip install flask
python app.py
```
→ API at http://localhost:5000/predict/word?prefix=ක

### 3. Gaze Tracking (Coming Later)
Start developing `gaze/eye_tracker.py` and `gaze_server.py` to stream gaze positions via WebSocket.
