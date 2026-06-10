# NexaBank — Modern Online Banking Simulation

NexaBank is a fully responsive, client-side online banking application that simulates a real-world banking environment. Built with modern web technologies, it features a comprehensive dashboard for customers and a powerful administration portal for bank staff.

![NexaBank Hero](https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80)

## 🚀 Features

### For Customers
*   **Secure Authentication**: Login and registration system with session management.
*   **Interactive Dashboard**: Real-time overview of balance, recent transactions, and spending analytics.
*   **Transaction Management**: Simulate money transfers, bill payments, and view detailed history.
*   **Card & Loan Management**: Request new cards or apply for loans (simulated).
*   **Personalization**: Dark/Light mode toggle and profile management.
*   **Responsive Design**: Optimized for desktop, tablet, and mobile devices.

### For Administrators
*   **Dedicated Admin Portal**: Separate login and interface for administrative tasks.
*   **User Management**: View, freeze, or delete user accounts.
*   **System Oversight**: Monitor total assets, transaction volumes, and active loans.
*   **Audit Logging**: Comprehensive log of all administrative actions for security.
*   **Data Control**: Ability to reset system data or seed test data.

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Custom Properties + Flexbox/Grid), JavaScript (ES6+)
*   **Styling**: Bootstrap 5 (Grid & Utilities) + Custom CSS
*   **Icons**: Bootstrap Icons
*   **Charts**: Chart.js for data visualization
*   **Database**: LocalStorage (simulated NoSQL database structure)
*   **Architecture**: Modular JavaScript (Separation of Concerns: Auth, DB, State, UI)

## 📂 Project Structure

```
creditfinancials/
├── index.html          # Public landing page
├── app.html            # Customer dashboard portal
├── admin.html          # Administrative control panel
├── css/                # Stylesheets and themes
└── js/                 # Core logic, state management, and DB simulation
```

## ⚡ Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Nyerho/nexabank.git
    ```

2.  **Open the Application**
    *   Open `index.html` in your browser to view the **Landing Page**.
    *   Click "Online Banking Login" or open `app.html` to access the **Banking App**.

3.  **Default Credentials**
    *   **Admin**:
        *   Email: `admin@nexabank.com`
        *   Password: `admin`
    *   **Customer**:
        *   Register a new account on the login screen.

## 🛡️ Data Persistence

This application uses the browser's **LocalStorage** to persist data. This means:
*   Your data remains saved even after refreshing the page.
*   To clear all data and reset the application, log in as Admin -> Go to Configuration -> Click "Reset System Data".

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
