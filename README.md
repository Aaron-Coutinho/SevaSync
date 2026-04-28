# SevaSync

SevaSync is an NGO volunteer coordination platform designed for the **Google Solution Challenge 2026**. It converts incoming community needs into structured requests, prioritizes them based on urgency and impact, and matches them to the best-fit volunteers using AI.

Built specifically to address **Problem 5: Smart Resource Allocation - Data-Driven Volunteer Coordination for Social Impact**.

## Features

- **AI-Powered Task Matching**: Uses Google's Gemini AI (`gemini-3-flash-preview`) to analyze free-form needs and match them to volunteer profiles based on skills, availability, and location.
- **Automated Prioritization**: Computes deterministic priority scores to ensure critical needs get addressed first based on urgency and beneficiary count.
- **Role-Based Workflows**:
  - **Coordinators (Admins)**: Full access to the dashboard, can create needs, view suggestions, and formally assign volunteers.
  - **Volunteers**: Dedicated task dashboard to view assignments and update task statuses.
- **Secure Authentication**: Firebase Auth seamlessly integrated with a FastAPI backend.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Database**: Google Cloud Firestore (NoSQL)
- **AI Integration**: Google GenAI SDK (`gemini-3-flash-preview`)
- **Authentication**: Firebase Authentication (Email/Password)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.11+
- A Google Cloud / Firebase project with Firestore and Auth enabled.
- A Gemini API Key.

### 1. Clone the repository
```bash
git clone https://github.com/Aaron-Coutinho/SevaSync.git
cd SevaSync
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY="your-gemini-api-key"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
```

Run the backend server:
```bash
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
```

Run the frontend development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## Architecture & Security
- **No Direct DB Access from Client**: The frontend never talks directly to Firestore for data modification. All database operations route through the FastAPI backend using the Firebase Admin SDK to ensure robust validation and security.
- **Human-in-the-loop AI**: Gemini output is always presented as suggestions to the Coordinator; the system never auto-assigns tasks without human confirmation.
