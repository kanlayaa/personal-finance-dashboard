# Assignment 2 Transaction Dashboard 
A web application for tracking and visualizing personal finances (income and expenses), built with React and TypeScript.
The focus is on simplicity, performance, and a clean, responsive user interface that works well across all devices.

---

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
### 1. Install Dependencies
Open your terminal in the project folder and run this command.
```bash
npm install
```

### 2. Run
```bash
npm run dev
```

# Decision design
### 1. Architecture & State Management
Since the assignment provides mock data, and faster performance is desired, useMemo is used so that the calculation runs only once (unless the data changes).
### 2. Styling Strategy
The UI is designed with a mobile-first approach, using a stacked layout for mobile devices, and then expanding into a 3-column grid on desktop screens to ensure a visually pleasing experience on both mobile and desktop.
### 3. Data Visualization
The interface focuses on simplicity and readability, with the “Balance” highlighted as the primary element, followed by a summary chart that visualizes overall income and expenses, and a list of recent transactions.