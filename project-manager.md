# Project Manager API - Full CRUD with Relationships

## Overview
A comprehensive project management API with **3 related entities**: Projects, Tasks, and Assignees. This API demonstrates proper relational database design and RESTful endpoints.

## Database Schema & Relationships

### Entity Relationship Diagram
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    ASSIGNEES    │         │      TASKS      │         │    PROJECTS     │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (PK)         │←────────┤ assignee_id     │         │ id (PK)         │
│ name            │   1:M   │ project_id      │────────→│ name            │
│ email           │         │ id (PK)         │   M:1   │ description     │
│ role            │         │ title           │         │ status          │
│ created_at      │         │ description     │         │ created_at      │
│ updated_at      │         │ status          │         │ updated_at      │
└─────────────────┘         │ priority        │         └─────────────────┘
          ↑                 │ due_date        │                   ↑
          │ M               │ created_at      │                   │ M
          │                 │ updated_at      │                   │
          │                 └─────────────────┘                   │
          │                                                       │
          │                 ┌─────────────────┐                   │
          │                 │PROJECT_ASSIGNEES│                   │
          │       M:M       ├─────────────────┤        M:M       │
          └─────────────────┤ assignee_id (FK)│                   │
                            │ project_id (FK) │───────────────────┘
                            │ assigned_at     │
                            │ role_in_project │
                            └─────────────────┘
```

**Relationship Notation:**
- **1:M** = One-to-Many (one assignee can have many tasks)
- **M:1** = Many-to-One (many tasks belong to one project)
- **M:M** = Many-to-Many (assignees can work on multiple projects, projects can have multiple assignees)

### Relationships
- **Project** → **Tasks** (1:Many) - One project can have many tasks
- **Assignee** → **Tasks** (1:Many) - One assignee can have many tasks
- **Task** → **Project** (Many:1) - Many tasks belong to one project (each task belongs to exactly one project)
- **Task** → **Assignee** (Many:1) - Many tasks can be assigned to one assignee (each task is assigned to exactly one assignee)
- **🆕 Assignee** ↔ **Project** (Many:Many) - Assignees can work on multiple projects, projects can have multiple assignees

## Database Tables

### 1. assignees Table
```sql
CREATE TABLE assignees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100) DEFAULT 'Developer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. projects Table
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. tasks Table
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Todo',
  priority VARCHAR(50) DEFAULT 'Medium',
  due_date DATE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES assignees(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. project_assignees Table (Junction Table)
```sql
CREATE TABLE project_assignees (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
  role_in_project VARCHAR(100) DEFAULT 'Team Member',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, assignee_id)
);
```

### CASCADE Behavior Explanation:
- **ON DELETE CASCADE** (tasks): When a project is deleted, all its tasks are automatically deleted
- **ON DELETE SET NULL** (tasks): When an assignee is deleted, their tasks remain but assignee_id becomes NULL (unassigned)
- **🆕 ON DELETE CASCADE** (project_assignees): When a project or assignee is deleted, their relationships are automatically removed

## API Endpoints

### Base URL: `http://localhost:8080/api`

---

## 📋 ASSIGNEES ENDPOINTS

### 1. GET /api/assignees
**Get all assignees**
```javascript
// Request
GET /api/assignees

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Frontend Developer",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Backend Developer",
      "created_at": "2024-01-02T10:00:00.000Z",
      "updated_at": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

### 2. GET /api/assignees/:id
**Get single assignee by ID**
```javascript
// Request
GET /api/assignees/1

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Frontend Developer",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Assignee not found"
}
```

### 3. POST /api/assignees
**Create new assignee**
```javascript
// Request Body
{
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "role": "UI/UX Designer"
}

// Response (201 Created)
{
  "success": true,
  "message": "Assignee created successfully",
  "data": {
    "id": 3,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "UI/UX Designer",
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T10:00:00.000Z"
  }
}

// Response (400 Bad Request)
{
  "success": false,
  "message": "Name and email are required"
}
```

### 4. PATCH /api/assignees/:id
**Update assignee (partial update)**
```javascript
// Request Body (only fields you want to update)
{
  "name": "Alice Johnson-Smith",
  "role": "Senior UI/UX Designer"
}

// Response (200 OK)
{
  "success": true,
  "message": "Assignee updated successfully",
  "data": {
    "id": 3,
    "name": "Alice Johnson-Smith",
    "email": "alice@example.com",
    "role": "Senior UI/UX Designer",
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T12:00:00.000Z"
  }
}
```

### 5. DELETE /api/assignees/:id
**Delete assignee**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Assignee deleted successfully",
  "details": {
    "deletedAssignee": "John Doe",
    "affectedTasks": "2 tasks are now unassigned (assignee_id set to NULL)"
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Assignee not found"
}
```

**📝 SET NULL Behavior**: Deleting an assignee will set assignee_id to NULL for all their tasks (tasks become unassigned)

### 6. GET /api/assignees/:id/tasks
**Get all tasks assigned to a specific assignee**
```javascript
// Request
GET /api/assignees/1/tasks

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Design Homepage",
      "description": "Create wireframes and mockups",
      "status": "In Progress",
      "priority": "High",
      "due_date": "2024-01-15",
      "project_id": 1,
      "project_name": "Website Redesign",
      "assignee_id": 1,
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### 7. GET /api/assignees/:id/projects
**🆕 Get all projects assigned to a specific assignee**
```javascript
// Request
GET /api/assignees/1/projects

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "status": "Active",
      "role_in_project": "Lead Developer",
      "assigned_at": "2024-01-01T10:00:00.000Z",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 3,
      "name": "E-commerce Platform",
      "description": "Build a complete e-commerce solution",
      "status": "Active",
      "role_in_project": "Frontend Developer",
      "assigned_at": "2024-01-02T10:00:00.000Z",
      "created_at": "2024-01-03T10:00:00.000Z",
      "updated_at": "2024-01-03T10:00:00.000Z"
    }
  ],
  "assignee": "John Doe"
}
```

### 8. POST /api/assignees/:id/projects
**🆕 Assign an assignee to a project**
```javascript
// Request Body
{
  "project_id": 2,
  "role_in_project": "Senior Developer"
}

// Response (201 Created)
{
  "success": true,
  "message": "Assignee assigned to project successfully",
  "data": {
    "id": 6,
    "project_id": 2,
    "assignee_id": 1,
    "role_in_project": "Senior Developer",
    "assigned_at": "2024-01-04T10:00:00.000Z"
  }
}

// Response (409 Conflict)
{
  "success": false,
  "message": "Assignee is already assigned to this project"
}
```

### 9. DELETE /api/assignees/:assigneeId/projects/:projectId
**🆕 Remove assignee from project**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Assignee removed from project successfully"
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Assignment not found"
}
```

---

## 🏗️ PROJECTS ENDPOINTS

### 1. GET /api/projects
**Get all projects**
```javascript
// Request
GET /api/projects

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "status": "Active",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Mobile App Development",
      "description": "iOS and Android app development",
      "status": "Planning",
      "created_at": "2024-01-02T10:00:00.000Z",
      "updated_at": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

### 2. GET /api/projects/:id
**Get single project by ID**
```javascript
// Request
GET /api/projects/1

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Website Redesign",
    "description": "Complete redesign of company website",
    "status": "Active",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### 3. POST /api/projects
**Create new project**
```javascript
// Request Body
{
  "name": "E-commerce Platform",
  "description": "Build a complete e-commerce solution",
  "status": "Active"
}

// Response (201 Created)
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": 3,
    "name": "E-commerce Platform",
    "description": "Build a complete e-commerce solution",
    "status": "Active",
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T10:00:00.000Z"
  }
}
```

### 4. PATCH /api/projects/:id
**Update project (partial update)**
```javascript
// Request Body (only fields you want to update)
{
  "name": "E-commerce Platform v2",
  "status": "In Progress"
}

// Response (200 OK)
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": 3,
    "name": "E-commerce Platform v2",
    "description": "Build a complete e-commerce solution",
    "status": "In Progress",
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T12:00:00.000Z"
  }
}
```

### 5. DELETE /api/projects/:id
**Delete project**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Project deleted successfully",
  "details": {
    "deletedProject": "Website Redesign",
    "cascadeDeleted": "3 tasks were also deleted due to CASCADE constraint"
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Project not found"
}
```

**⚠️ CASCADE Warning**: Deleting a project will automatically delete ALL tasks in that project!

### 6. GET /api/projects/:id/tasks
**Get all tasks in a specific project**
```javascript
// Request
GET /api/projects/1/tasks

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Design Homepage",
      "description": "Create wireframes and mockups",
      "status": "In Progress",
      "priority": "High",
      "due_date": "2024-01-15",
      "project_id": 1,
      "assignee_id": 1,
      "assignee_name": "John Doe",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### 7. GET /api/projects/:id/assignees
**🆕 Get all assignees assigned to a specific project**
```javascript
// Request
GET /api/projects/1/assignees

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Frontend Developer",
      "role_in_project": "Lead Developer",
      "assigned_at": "2024-01-01T10:00:00.000Z",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Backend Developer", 
      "role_in_project": "Backend Developer",
      "assigned_at": "2024-01-01T10:00:00.000Z",
      "created_at": "2024-01-02T10:00:00.000Z",
      "updated_at": "2024-01-02T10:00:00.000Z"
    }
  ],
  "project": "Website Redesign"
}
```

### 8. POST /api/projects/:id/assignees
**🆕 Assign an assignee to a project**
```javascript
// Request Body
{
  "assignee_id": 3,
  "role_in_project": "UI/UX Designer"
}

// Response (201 Created)
{
  "success": true,
  "message": "Assignee assigned to project successfully",
  "data": {
    "id": 7,
    "project_id": 1,
    "assignee_id": 3,
    "role_in_project": "UI/UX Designer",
    "assigned_at": "2024-01-04T10:00:00.000Z"
  }
}

// Response (409 Conflict)
{
  "success": false,
  "message": "Assignee is already assigned to this project"
}
```

### 9. DELETE /api/projects/:projectId/assignees/:assigneeId
**🆕 Remove assignee from project**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Assignee removed from project successfully"
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Assignment not found"
}
```

---

## ✅ TASKS ENDPOINTS

### 1. GET /api/tasks
**Get all tasks (with project and assignee info)**
```javascript
// Request
GET /api/tasks

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Design Homepage",
      "description": "Create wireframes and mockups",
      "status": "In Progress",
      "priority": "High",
      "due_date": "2024-01-15",
      "project_id": 1,
      "project_name": "Website Redesign",
      "assignee_id": 1,
      "assignee_name": "John Doe",
      "assignee_email": "john@example.com",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### 2. GET /api/tasks/:id
**Get single task by ID**
```javascript
// Request
GET /api/tasks/1

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Design Homepage",
    "description": "Create wireframes and mockups",
    "status": "In Progress",
    "priority": "High",
    "due_date": "2024-01-15",
    "project_id": 1,
    "project_name": "Website Redesign",
    "assignee_id": 1,
    "assignee_name": "John Doe",
    "assignee_email": "john@example.com",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### 3. POST /api/tasks
**Create new task**
```javascript
// Request Body
{
  "title": "Implement User Authentication",
  "description": "Set up JWT authentication system",
  "status": "Todo",
  "priority": "High",
  "due_date": "2024-01-20",
  "project_id": 1,
  "assignee_id": 2
}

// Response (201 Created)
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": 2,
    "title": "Implement User Authentication",
    "description": "Set up JWT authentication system",
    "status": "Todo",
    "priority": "High",
    "due_date": "2024-01-20",
    "project_id": 1,
    "assignee_id": 2,
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T10:00:00.000Z"
  }
}

// Response (400 Bad Request)
{
  "success": false,
  "message": "Title, project_id, and assignee_id are required"
}
```

### 4. PATCH /api/tasks/:id
**Update task (partial update)**
```javascript
// Request Body (only fields you want to update)
{
  "status": "In Progress",
  "priority": "High",
  "due_date": "2024-01-25"
}

// Response (200 OK)
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": 2,
    "title": "Implement User Authentication",
    "description": "Set up JWT authentication system",
    "status": "In Progress",
    "priority": "High",
    "due_date": "2024-01-25",
    "project_id": 1,
    "assignee_id": 2,
    "created_at": "2024-01-03T10:00:00.000Z",
    "updated_at": "2024-01-03T12:00:00.000Z"
  }
}
```

### 5. DELETE /api/tasks/:id
**Delete task**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## 📊 ADVANCED ENDPOINTS (Optional)

### 1. GET /api/dashboard/stats
**Get dashboard statistics**
```javascript
// Response (200 OK)
{
  "success": true,
  "data": {
    "totalProjects": 3,
    "activeProjects": 2,
    "totalTasks": 12,
    "completedTasks": 5,
    "totalAssignees": 4,
    "tasksByStatus": {
      "Todo": 3,
      "In Progress": 4,
      "Done": 5
    },
    "tasksByPriority": {
      "Low": 2,
      "Medium": 5,
      "High": 5
    }
  }
}
```

---

## 🛠️ IMPLEMENTATION INSTRUCTIONS

### Step 1: Setup Database Tables
Create the database initialization function:

```javascript
// Add to your index.js
async function initializeDatabase() {
  try {
    // Create assignees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100) DEFAULT 'Developer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Todo',
        priority VARCHAR(50) DEFAULT 'Medium',
        due_date DATE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES assignees(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project_assignees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_assignees (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
        role_in_project VARCHAR(100) DEFAULT 'Team Member',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, assignee_id)
      )
    `);

    console.log("All tables created successfully");
    console.log("CASCADE behavior: Deleting a project will delete all its tasks");
    console.log("SET NULL behavior: Deleting an assignee will unassign their tasks");
    console.log("CASCADE behavior: Deleting a project or assignee will remove their relationships");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}
```

### Step 2: Insert Sample Data
```javascript
async function insertSampleData() {
  try {
    // Insert sample assignees
    await client.query(`
      INSERT INTO assignees (name, email, role) VALUES
      ('John Doe', 'john@example.com', 'Frontend Developer'),
      ('Jane Smith', 'jane@example.com', 'Backend Developer'),
      ('Alice Johnson', 'alice@example.com', 'UI/UX Designer'),
      ('Bob Wilson', 'bob@example.com', 'Project Manager')
      ON CONFLICT (email) DO NOTHING
    `);

    // Insert sample projects
    await client.query(`
      INSERT INTO projects (name, description, status) VALUES
      ('Website Redesign', 'Complete redesign of company website', 'Active'),
      ('Mobile App Development', 'iOS and Android app development', 'Planning'),
      ('E-commerce Platform', 'Build a complete e-commerce solution', 'Active')
      ON CONFLICT DO NOTHING
    `);

    // Insert sample tasks
    await client.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id) VALUES
      ('Design Homepage', 'Create wireframes and mockups', 'In Progress', 'High', '2024-01-15', 1, 1),
      ('Implement User Auth', 'Set up JWT authentication', 'Todo', 'High', '2024-01-20', 1, 2),
      ('Mobile App Wireframes', 'Create app wireframes', 'Todo', 'Medium', '2024-01-25', 2, 3),
      ('Database Design', 'Design database schema', 'Done', 'High', '2024-01-10', 3, 2)
      ON CONFLICT DO NOTHING
    `);

    // Insert sample project_assignees
    await client.query(`
      INSERT INTO project_assignees (project_id, assignee_id, role_in_project) VALUES
      (1, 1, 'Lead Developer'),
      (1, 2, 'Backend Developer'),
      (2, 3, 'UI/UX Designer'),
      (3, 1, 'Frontend Developer'),
      (3, 2, 'Backend Developer')
      ON CONFLICT DO NOTHING
    `);

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
}
```

### Step 3: Create Route Files
Create separate route files for better organization:

```javascript
// routes/assignees.js
const express = require('express');
const router = express.Router();

// GET /api/assignees
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM assignees ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add more routes...
module.exports = router;
```

### Step 4: Update main index.js
```javascript
// Import route files
const assigneesRoutes = require('./routes/assignees');
const projectsRoutes = require('./routes/projects');
const tasksRoutes = require('./routes/tasks');

// Use routes
app.use('/api/assignees', assigneesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
```

### Step 5: Testing Your API
Use these curl commands to test all endpoints:

```bash
# Test Assignees
curl -X GET http://localhost:8080/api/assignees
curl -X POST http://localhost:8080/api/assignees -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com","role":"Developer"}'
curl -X PATCH http://localhost:8080/api/assignees/1 -H "Content-Type: application/json" -d '{"role":"Senior Developer"}'
curl -X DELETE http://localhost:8080/api/assignees/1

# Test Projects
curl -X GET http://localhost:8080/api/projects
curl -X POST http://localhost:8080/api/projects -H "Content-Type: application/json" -d '{"name":"Test Project","description":"Test description"}'
curl -X PATCH http://localhost:8080/api/projects/1 -H "Content-Type: application/json" -d '{"status":"Completed"}'
curl -X DELETE http://localhost:8080/api/projects/1

# Test Tasks
curl -X GET http://localhost:8080/api/tasks
curl -X POST http://localhost:8080/api/tasks -H "Content-Type: application/json" -d '{"title":"Test Task","project_id":1,"assignee_id":1}'
curl -X PATCH http://localhost:8080/api/tasks/1 -H "Content-Type: application/json" -d '{"status":"In Progress"}'
curl -X DELETE http://localhost:8080/api/tasks/1

# Test Relationships
curl -X GET http://localhost:8080/api/projects/1/tasks
curl -X GET http://localhost:8080/api/assignees/1/tasks

# 🆕 Test Many-to-Many Relationships
curl -X GET http://localhost:8080/api/projects/1/assignees
curl -X GET http://localhost:8080/api/assignees/1/projects
curl -X POST http://localhost:8080/api/projects/1/assignees \
  -H "Content-Type: application/json" \
  -d '{"assignee_id":3,"role_in_project":"UI/UX Designer"}'
curl -X POST http://localhost:8080/api/assignees/1/projects \
  -H "Content-Type: application/json" \
  -d '{"project_id":2,"role_in_project":"Senior Developer"}'
curl -X DELETE http://localhost:8080/api/projects/1/assignees/3
curl -X DELETE http://localhost:8080/api/assignees/1/projects/2
```

---

## 🔄 DELETE BEHAVIORS EXPLAINED

### CASCADE DELETE (Projects → Tasks)
```javascript
// When you delete a project with ID 1:
DELETE FROM projects WHERE id = 1;

// Result: 
// ✅ Project deleted
// ✅ All tasks with project_id = 1 are automatically deleted
// ⚠️ No orphaned tasks remain
```

### SET NULL DELETE (Assignees → Tasks)
```javascript
// When you delete an assignee with ID 2:
DELETE FROM assignees WHERE id = 2;

// Result:
// ✅ Assignee deleted
// ✅ All tasks with assignee_id = 2 become unassigned (assignee_id = NULL)
// ✅ Tasks remain in the database but are unassigned
```

### Example Scenarios:
1. **Delete Project "Website Redesign"** → All 5 tasks in that project are deleted
2. **Delete Assignee "John Doe"** → His 3 tasks become unassigned but remain in database
3. **Delete Task** → Only that specific task is deleted, no cascade effect

---

## 🔄 PATCH vs PUT EXPLAINED

### PATCH (Partial Update) - ✅ Recommended
```javascript
// Update only the fields you want to change
PATCH /api/tasks/1
{
  "status": "Completed"
}

// Result: Only status is updated, other fields remain unchanged
```

### PUT (Complete Replacement) - ⚠️ Not used here
```javascript
// Would require ALL fields to replace the entire resource
PUT /api/tasks/1
{
  "title": "Task Title",
  "description": "Description", 
  "status": "Completed",
  "priority": "High",
  "due_date": "2024-01-15",
  "project_id": 1,
  "assignee_id": 2
}
```

**Why PATCH?**
- More flexible - update only what you need
- Less error-prone - don't accidentally clear fields
- Better user experience - partial form updates
- RESTful best practice for partial updates

---

## 🎯 STUDENT EXERCISE CHECKLIST

### Phase 1: Basic Setup ✅
- [ ] Create database tables
- [ ] Insert sample data
- [ ] Test database connection

### Phase 2: Assignees CRUD ✅
- [ ] GET /api/assignees (all)
- [ ] GET /api/assignees/:id (single)
- [ ] POST /api/assignees (create)
- [ ] PATCH /api/assignees/:id (partial update)
- [ ] DELETE /api/assignees/:id (delete)

### Phase 3: Projects CRUD ✅
- [ ] GET /api/projects (all)
- [ ] GET /api/projects/:id (single)
- [ ] POST /api/projects (create)
- [ ] PATCH /api/projects/:id (partial update)
- [ ] DELETE /api/projects/:id (delete)

### Phase 4: Tasks CRUD ✅
- [ ] GET /api/tasks (all with JOIN)
- [ ] GET /api/tasks/:id (single with JOIN)
- [ ] POST /api/tasks (create with validation)
- [ ] PATCH /api/tasks/:id (partial update)
- [ ] DELETE /api/tasks/:id (delete)

### Phase 5: Relationships ✅
- [ ] GET /api/projects/:id/tasks
- [ ] GET /api/assignees/:id/tasks
- [ ] 🆕 GET /api/projects/:id/assignees
- [ ] 🆕 GET /api/assignees/:id/projects
- [ ] 🆕 POST /api/projects/:id/assignees (assign assignee to project)
- [ ] 🆕 POST /api/assignees/:id/projects (assign assignee to project)
- [ ] 🆕 DELETE /api/projects/:projectId/assignees/:assigneeId
- [ ] 🆕 DELETE /api/assignees/:assigneeId/projects/:projectId
- [ ] Proper foreign key constraints
- [ ] CASCADE delete testing

### Phase 6: Advanced Features (Optional) ✅
- [ ] Dashboard statistics
- [ ] Search and filtering
- [ ] Data validation
- [ ] Error handling

---

## 📝 VALIDATION RULES

### Assignees
- **name**: Required, 2-255 characters
- **email**: Required, unique, valid email format
- **role**: Optional, default 'Developer'

### Projects
- **name**: Required, 2-255 characters
- **description**: Optional, max 1000 characters
- **status**: Optional, default 'Active'

### Tasks
- **title**: Required, 2-255 characters
- **description**: Optional, max 1000 characters
- **status**: Optional, default 'Todo'
- **priority**: Optional, default 'Medium'
- **due_date**: Optional, valid date format
- **project_id**: Required, must exist in projects table
- **assignee_id**: Required, must exist in assignees table

This comprehensive API design provides a solid foundation for learning relational database design and RESTful API development with real-world relationships! 🚀
