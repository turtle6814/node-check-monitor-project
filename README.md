Overview
--------

The Node Monitoring and Health Checking project is designed to monitor and manage nodes connected to a server. The system tracks various metrics such as CPU usage, memory usage, response time, and task statuses. It also provides functionalities to delete nodes and visualize their status (active, inactive, busy) in real-time.

Features
--------

-   **Real-time Client Monitoring:** Track CPU usage, memory usage, response time, and task statuses of connected nodes.
-   **Status Indication:** Visualize client status with colors: green for active, red for inactive, and yellow for busy.
-   **Task Management:** Assign tasks to nodes and monitor their completion status.
-   **Client Management:** Delete nodes from the system.
-   **Heartbeat Mechanism:** Ensure nodes are active and responsive.

Technologies Used
-----------------

-   **Frontend:**

    -   HTML, CSS, Bootstrap
    -   JavaScript
    -   Chart.js for data visualization
    -   Socket.IO for real-time communication
-   **Backend:**

    -   Node.js
    -   Express.js
    -   MongoDB with Mongoose for data storage
    -   Socket.IO for real-time communication
    -   os-utils for system metrics

Setup and Installation
----------------------

### Prerequisites

-   Node.js and npm
-   MongoDB


### Installation

1.  **Clone the repository:**

    ```
    git clone https://github.com/turtle6814/node-check-monitor-project.git
    cd node-check-monitor-project
    ```

2.  **Install the dependencies:**

    ```
    npm install
    ```

3.  **Start the MongoDB server:**

    Ensure MongoDB is running on your machine. By default, the application connects to `mongodb://localhost:27017/scalable-system`.

4.  **Start the server:**

    ```
    node app.js
    ```

    The server will run on `http://localhost:5000`.
    
6. **Determine Your Local IP Address**

    On Windows, open Command Prompt and type:

    ```
    ipconfig
    ```
    On macOS or Linux, open Terminal and type:
    
    ```
    ipconfig
    ```
    
    Look for the IP address associated with your network adapter (e.g., 192.168.x.x).
    Replace the localhost in the URL of the client.js
6.  **Start the node:**

    ```
    node client.js
    ```


Project Structure
-----------------

```
├── app.js            # Main server-side application logic
├── client.js         # Client-side application logic
├── public
│   ├── index.html    # Main dashboard HTML file
│   └── clients.html  # Client information HTML file
├── test-connection.js         # Test reconnect application logic
└── README.md         # Project documentation`
```

API Endpoints
-------------

-   **GET `/stats`**
    -   Returns the current statistics of clients and tasks.
-   **POST `/assign-task`**
    -   Assigns a new task to a specified client.
    -   **Request Body:**

        ```
        {
          "clientId": "client-id",
          "taskId": "task-id",
          "number": 100
        }
        ```

-   **DELETE `/delete-client/:id`**

    -   Deletes a client by their ID.

Usage
-----

### Accessing the Dashboard

1.  **Main Dashboard:**

    Open `http://localhost:5000` or `http://localhost:5000/index.html` in your browser to access the main dashboard. Here you can see the overall system metrics and a button to view detailed client information.
2.  **Client Information:**

    Click on the "View Clients Information" button to navigate to `http://localhost:5000/clients.html`. This page displays detailed metrics for each client, including their status, and provides options to delete clients.

### Monitoring and Managing Clients

-   **Real-time Metrics:**
    The dashboard displays real-time metrics for CPU usage, memory usage, response time, and task statuses.
-   **Client Status:**
    Clients' statuses are displayed in color codes: green for active, red for inactive, and yellow for busy.
-   **Task Assignment:**
    Use the `/assign-task` endpoint to assign tasks to clients programmatically.

1.  Open Postman.
2.  Set the request type to POST.
3.  Enter the URL <http://localhost:5000/assign-task>.
4.  Add a header with `Content-Type: application/json`.
5.  Enter the JSON data in the body section with the client ID, task ID, and task number:
   - Click on the "Body" tab.
   - Select the "raw" radio button.
   - Ensure the "Text" dropdown is set to `JSON`.
   - Enter the JSON data for the request body. For example:

```
{
  "clientId": "clientId-get-from-server-console",
  "taskId": "task-124",
  "number": 1-99       # Assign a particular number to count
}
```
-   **Deleting Clients:**

    Click the "Delete" button next to a client in the clients information page to remove them from the system.
