# Smart Timetable

This repository contains the source code for the Smart Timetable application, a full-stack web application for managing school schedules. The project is divided into two main parts:

1.  **Frontend**: A React application built with TypeScript.
2.  **Backend**: An Express.js API server located in the `/api` directory, which connects to a MariaDB/MySQL database.

## Frontend Setup

The frontend application is ready to run. The necessary dependencies are managed via an `importmap` in `index.html`, so no `npm install` is required for the frontend part. You can serve the root directory using a simple web server.

## Backend (API Server) Setup

The backend server is located in the `/api` directory. Follow these steps to set it up.

### 1. Database Setup

1.  **Connect to your database server**: Open your preferred SQL client (e.g., DBeaver, phpMyAdmin, or the command-line client).
2.  **Create and use the database**: Run the following SQL command.

    ```sql
    CREATE DATABASE IF NOT EXISTS `smart_timetable` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE `smart_timetable`;
    ```

3.  **Create tables and insert data**: Execute the entire SQL script found in `api/database.sql`. This will create all the necessary tables and populate them with initial sample data.

### 2. Environment Variables Setup

The server requires a `.env` file for configuration.

1.  **Navigate to the API directory**:
    ```bash
    cd api
    ```
2.  **Create a `.env` file**: In the `api` directory, create a new file named `.env`. You can do this by copying the example file:
    ```bash
    # For Linux/macOS
    cp .env.example .env

    # For Windows
    copy .env.example .env
    ```
3.  **Update the values** in your new `.env` file with your actual database credentials. It should look like this:

    ```ini
    # Server Port
    PORT=3001

    # MariaDB/MySQL Database Connection
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=your_db_username
    DB_PASSWORD=your_db_password
    DB_DATABASE=smart_timetable
    ```

### 3. Installation

While still inside the `api` directory, install the required Node.js dependencies:

```bash
npm install
```

### 4. Running the Server

To start the API server, run the following command from within the `api` directory:

```bash
npm start
```

You should see a confirmation message in your console:

```
Smart Timetable API listening at http://localhost:3001
Connected to the MariaDB/MySQL database.
```

The server is now running and ready to communicate with the frontend application.
