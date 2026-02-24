# How to Run AgencyFlow

Follow these steps to get the project running locally.

## Prerequisite: Environment Configuration

The backend and frontend both require environment variables to function correctly.

### Backend (.env)
1. Navigate to the `backend` folder.
2. Copy `.env.example` to `.env`.
3. Fill in your **Supabase** credentials and local database URL.

### Frontend (.env)
1. Navigate to the `frontend` folder.
2. Copy `.env.example` to `.env`.
3. Fill in the **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY**.

---

## Backend Setup (FastAPI)

1. **Open a terminal** and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. **Create a Python 3.12 Virtual Environment** (Recommended for Windows):
   ```bash
   py -3.12 -m venv venv
   .\venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   Alternatively, run the verification script to ensure everything is set up correctly:
   ```bash
   python verify_backend.py
   ```

The backend API will be available at `http://localhost:8000`.

---

## Frontend Setup (React + Vite)

1. **Open a second terminal** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`.

---

## Troubleshooting

- **Database Issues**: If you see errors about missing tables, the app is configured to create them automatically on start (see `backend/app/main.py`).
- **CORS Errors**: The backend is configured to allow requests from `localhost:5173`.
- **Environment Variables**: Ensure `pydantic-settings` can find your `.env` file in the `backend` directory.
