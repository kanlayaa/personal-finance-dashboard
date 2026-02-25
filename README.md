# Assignment 2 Transaction Dashboard 
A web application for tracking and visualizing personal finances (income and expenses), built with React and TypeScript.
The focus is on simplicity, performance, and a clean, responsive user interface that works well across all devices.

---
## Demo link
https://personal-finance-dashboard-silk.vercel.app/

## 🚀 Features

- **Dashboard Summary:** Displays current balance, total income, and total expenses
- **Data Visualization:** Donut chart showing the proportion of income vs. expenses
- **Transaction List:** clear icons for each type
- **Responsive Design:** Optimized for both mobile and desktop screens
- **Currency Formatting:** Automatic formatting for Thai Baht (THB) and standardized date display

## 🛠 Tech Stack
- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4)
- **Icons:** Lucide React
- **Charts:** Recharts
## ⚙️ Setup & Installation
### 1.Clone git
Open your terminal in the project folder and run this command.
```bash
git clone https://github.com/kanlayaa/personal-finance-dashboard.git
```
### 2. Install Dependencies
Open your terminal in the project folder and run this command.
```bash
npm install
```

### 3. Set up Database (Firebase)
This project uses Firebase as backend service.

**Step 1 : Create Firebase Project**
Go to Firebase Console and create a new project.

**Step 2 : Enable Cloud Firestore**
Build → Firestore Database → Create database (Start in test mode)

**Step 3 : Create .env file**
Create a file named .env in the root directory and add
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx
```

### 4. Run
```bash
npm run dev
```
### 5. Localhost
```bash
http://localhost:5173/
```