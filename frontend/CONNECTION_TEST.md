# Testing Backend & Frontend Connection

This guide explains how to verify that your frontend and backend are properly connected.

## Quick Start

1. **Start the Backend**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
   You should see: `✅ Database tables created successfully` and `Application startup complete.`

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will typically run on `http://localhost:5173` (or another port shown in terminal)

3. **Open the Connection Test Page**
   - Navigate to: `http://localhost:5173/test-connection`
   - Or click "Run All Tests" button on that page

## What Gets Tested

The connection test page automatically checks:

1. **Health Check** (`GET /health`)
   - Verifies backend server is running
   - Returns server status and version

2. **Root Endpoint** (`GET /`)
   - Tests basic API connectivity
   - Verifies CORS is configured correctly

3. **User Registration** (`POST /api/v1/auth/register`)
   - Creates a test user account
   - Verifies database connection and user creation

4. **User Login** (`POST /api/v1/auth/login`)
   - Authenticates with the test user
   - Verifies token generation works

## Expected Results

✅ **All Green Checkmarks** = Frontend and backend are connected successfully!

❌ **Red X Marks** = Check the error messages:
- **"Backend not reachable"** → Make sure backend is running on port 8000
- **"CORS error"** → Backend CORS is already configured to allow all origins
- **"Registration failed"** → Check database connection in backend
- **"Login failed"** → User might already exist, try running tests again (new test user is generated each time)

## Manual Testing

You can also test manually:

### Test Health Endpoint
```bash
curl http://localhost:8000/health
```

### Test Registration
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123",
    "role": "client"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=TestPass123"
```

## Troubleshooting

### Backend won't start
- Check if port 8000 is already in use
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check database connection settings in `backend/app/config.py`

### Frontend can't connect
- Verify backend URL in `frontend/src/services/auth.js` matches your backend port
- Check browser console for CORS errors
- Ensure backend CORS middleware allows your frontend origin

### Tests fail randomly
- Each test run creates a new test user with a unique email
- If registration fails with "email already exists", that's okay - the login test will still work if you manually created that user before

## Next Steps

Once connection is verified:
- Use `/login` page to test real authentication
- Use `/signup` page to create real user accounts
- Check backend API docs at `http://localhost:8000/docs` for all available endpoints
