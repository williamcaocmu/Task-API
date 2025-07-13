# Project Manager API - Complete Implementation

## File Structure
```
project-manager/
├── index.js (main server file)
├── routes/
│   ├── assignees.js
│   ├── projects.js
│   └── tasks.js
├── package.json
└── .env
```

## Main Server File (index.js)

```javascript
import express from "express";
import { Client } from "pg";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import assigneesRoutes from "./routes/assignees.js";
import projectsRoutes from "./routes/projects.js";
import tasksRoutes from "./routes/tasks.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/project_manager",
});

await client.connect();
console.log("✅ Database connected successfully");

// Database initialization
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

    // Create project_assignees table (junction table for many-to-many)
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

    console.log("✅ All tables created successfully");
    console.log("🔄 CASCADE behavior: Deleting a project will delete all its tasks");
    console.log("🔄 SET NULL behavior: Deleting an assignee will unassign their tasks");
    console.log("🔄 CASCADE behavior: Deleting a project or assignee will remove their relationships");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  }
}

// Insert sample data
async function insertSampleData() {
  try {
    // Check if data already exists
    const countResult = await client.query("SELECT COUNT(*) FROM assignees");
    const assigneeCount = parseInt(countResult.rows[0].count);
    
    if (assigneeCount === 0) {
      // Insert sample assignees
      await client.query(`
        INSERT INTO assignees (name, email, role) VALUES
        ('John Doe', 'john@example.com', 'Frontend Developer'),
        ('Jane Smith', 'jane@example.com', 'Backend Developer'),
        ('Alice Johnson', 'alice@example.com', 'UI/UX Designer'),
        ('Bob Wilson', 'bob@example.com', 'Project Manager')
      `);

      // Insert sample projects
      await client.query(`
        INSERT INTO projects (name, description, status) VALUES
        ('Website Redesign', 'Complete redesign of company website', 'Active'),
        ('Mobile App Development', 'iOS and Android app development', 'Planning'),
        ('E-commerce Platform', 'Build a complete e-commerce solution', 'Active')
      `);

      // Insert sample tasks
      await client.query(`
        INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id) VALUES
        ('Design Homepage', 'Create wireframes and mockups', 'In Progress', 'High', '2024-01-15', 1, 1),
        ('Implement User Auth', 'Set up JWT authentication', 'Todo', 'High', '2024-01-20', 1, 2),
        ('Mobile App Wireframes', 'Create app wireframes', 'Todo', 'Medium', '2024-01-25', 2, 3),
        ('Database Design', 'Design database schema', 'Done', 'High', '2024-01-10', 3, 2),
        ('API Development', 'Build RESTful API', 'In Progress', 'High', '2024-01-18', 1, 2)
      `);

      // Insert sample project_assignees (many-to-many relationships)
      await client.query(`
        INSERT INTO project_assignees (project_id, assignee_id, role_in_project) VALUES
        (1, 1, 'Lead Developer'),
        (1, 2, 'Backend Developer'),
        (2, 3, 'UI/UX Designer'),
        (3, 1, 'Frontend Developer'),
        (3, 2, 'Backend Developer')
        ON CONFLICT (project_id, assignee_id) DO NOTHING
      `);

      console.log("✅ Sample data inserted successfully");
    } else {
      console.log("📊 Sample data already exists");
    }
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
  }
}

// Dashboard stats endpoint
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [projectsResult, tasksResult, assigneesResult, statusResult, priorityResult] = await Promise.all([
      client.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'Active' THEN 1 END) as active FROM projects"),
      client.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'Done' THEN 1 END) as completed FROM tasks"),
      client.query("SELECT COUNT(*) as total FROM assignees"),
      client.query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
      client.query("SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority")
    ]);

    const stats = {
      totalProjects: parseInt(projectsResult.rows[0].total),
      activeProjects: parseInt(projectsResult.rows[0].active),
      totalTasks: parseInt(tasksResult.rows[0].total),
      completedTasks: parseInt(tasksResult.rows[0].completed),
      totalAssignees: parseInt(assigneesResult.rows[0].total),
      tasksByStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      tasksByPriority: priorityResult.rows.reduce((acc, row) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching dashboard stats" });
  }
});

// Initialize database and insert sample data
await initializeDatabase();
await insertSampleData();

// Make client available to routes
app.locals.db = client;

// Routes
app.use("/api/assignees", assigneesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Project Manager API",
    version: "1.0.0",
    endpoints: {
      assignees: "/api/assignees",
      projects: "/api/projects",
      tasks: "/api/tasks",
      dashboard: "/api/dashboard/stats"
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await client.end();
  console.log('✅ Database connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await client.end();
  console.log('✅ Database connection closed');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}/api/dashboard/stats`);
});
```

## Routes - Assignees (routes/assignees.js)

```javascript
import express from "express";
const router = express.Router();

// Validation helper
const validateAssignee = (name, email) => {
  if (!name || name.trim().length < 2) {
    return "Name is required and must be at least 2 characters";
  }
  if (!email || !email.includes("@")) {
    return "Valid email is required";
  }
  return null;
};

// GET /api/assignees - Get all assignees
router.get("/", async (req, res) => {
  try {
    const result = await req.app.locals.db.query(`
      SELECT * FROM assignees 
      ORDER BY created_at DESC
    `);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error("Get assignees error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching assignees" 
    });
  }
});

// GET /api/assignees/:id - Get single assignee
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.db.query(`
      SELECT * FROM assignees WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error("Get assignee error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching assignee" 
    });
  }
});

// POST /api/assignees - Create new assignee
router.post("/", async (req, res) => {
  try {
    const { name, email, role = "Developer" } = req.body;
    
    // Validation
    const validationError = validateAssignee(name, email);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }
    
    const result = await req.app.locals.db.query(`
      INSERT INTO assignees (name, email, role) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [name.trim(), email.trim(), role]);
    
    res.status(201).json({
      success: true,
      message: "Assignee created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Create assignee error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error creating assignee" 
    });
  }
});

// PATCH /api/assignees/:id - Update assignee (partial update)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters"
        });
      }
      updateFields.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    
    if (email !== undefined) {
      if (!email.includes("@")) {
        return res.status(400).json({
          success: false,
          message: "Valid email is required"
        });
      }
      updateFields.push(`email = $${paramCount++}`);
      values.push(email.trim());
    }
    
    if (role !== undefined) {
      updateFields.push(`role = $${paramCount++}`);
      values.push(role);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await req.app.locals.db.query(`
      UPDATE assignees 
      SET ${updateFields.join(", ")} 
      WHERE id = $${paramCount} 
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    res.json({
      success: true,
      message: "Assignee updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Update assignee error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error updating assignee" 
    });
  }
});

// DELETE /api/assignees/:id - Delete assignee
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check how many tasks will be affected
    const tasksResult = await req.app.locals.db.query(`
      SELECT COUNT(*) as count FROM tasks WHERE assignee_id = $1
    `, [id]);
    
    const affectedTasks = parseInt(tasksResult.rows[0].count);
    
    const result = await req.app.locals.db.query(`
      DELETE FROM assignees 
      WHERE id = $1 
      RETURNING name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    res.json({
      success: true,
      message: "Assignee deleted successfully",
      details: {
        deletedAssignee: result.rows[0].name,
        affectedTasks: `${affectedTasks} tasks are now unassigned (assignee_id set to NULL)`
      }
    });
  } catch (error) {
    console.error("Delete assignee error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting assignee" 
    });
  }
});

// GET /api/assignees/:id/tasks - Get tasks assigned to assignee
router.get("/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if assignee exists
    const assigneeResult = await req.app.locals.db.query(`
      SELECT name FROM assignees WHERE id = $1
    `, [id]);
    
    if (assigneeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      SELECT 
        t.*,
        p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.assignee_id = $1
      ORDER BY t.created_at DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: result.rows,
      assignee: assigneeResult.rows[0].name
    });
  } catch (error) {
    console.error("Get assignee tasks error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching assignee tasks" 
    });
  }
});

// GET /api/assignees/:id/projects - Get projects assigned to assignee
router.get("/:id/projects", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if assignee exists
    const assigneeResult = await req.app.locals.db.query(`
      SELECT name FROM assignees WHERE id = $1
    `, [id]);
    
    if (assigneeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      SELECT 
        p.*,
        pa.role_in_project,
        pa.assigned_at
      FROM projects p
      JOIN project_assignees pa ON p.id = pa.project_id
      WHERE pa.assignee_id = $1
      ORDER BY pa.assigned_at DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: result.rows,
      assignee: assigneeResult.rows[0].name
    });
  } catch (error) {
    console.error("Get assignee projects error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching assignee projects" 
    });
  }
});

// POST /api/assignees/:id/projects - Assign assignee to project
router.post("/:id/projects", async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, role_in_project = "Team Member" } = req.body;
    
    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required"
      });
    }
    
    // Check if assignee exists
    const assigneeExists = await req.app.locals.db.query(`
      SELECT id FROM assignees WHERE id = $1
    `, [id]);
    
    if (assigneeExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    // Check if project exists
    const projectExists = await req.app.locals.db.query(`
      SELECT id FROM projects WHERE id = $1
    `, [project_id]);
    
    if (projectExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      INSERT INTO project_assignees (project_id, assignee_id, role_in_project) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [project_id, id, role_in_project]);
    
    res.status(201).json({
      success: true,
      message: "Assignee assigned to project successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Assign assignee to project error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: "Assignee is already assigned to this project"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error assigning assignee to project" 
    });
  }
});

// DELETE /api/assignees/:assigneeId/projects/:projectId - Remove assignee from project
router.delete("/:assigneeId/projects/:projectId", async (req, res) => {
  try {
    const { assigneeId, projectId } = req.params;
    
    const result = await req.app.locals.db.query(`
      DELETE FROM project_assignees 
      WHERE assignee_id = $1 AND project_id = $2 
      RETURNING *
    `, [assigneeId, projectId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }
    
    res.json({
      success: true,
      message: "Assignee removed from project successfully"
    });
  } catch (error) {
    console.error("Remove assignee from project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error removing assignee from project" 
    });
  }
});

export default router;
```

## Routes - Projects (routes/projects.js)

```javascript
import express from "express";
const router = express.Router();

// Validation helper
const validateProject = (name) => {
  if (!name || name.trim().length < 2) {
    return "Name is required and must be at least 2 characters";
  }
  return null;
};

// GET /api/projects - Get all projects
router.get("/", async (req, res) => {
  try {
    const result = await req.app.locals.db.query(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching projects" 
    });
  }
});

// GET /api/projects/:id - Get single project
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.db.query(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching project" 
    });
  }
});

// POST /api/projects - Create new project
router.post("/", async (req, res) => {
  try {
    const { name, description, status = "Active" } = req.body;
    
    // Validation
    const validationError = validateProject(name);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }
    
    const result = await req.app.locals.db.query(`
      INSERT INTO projects (name, description, status) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [name.trim(), description || null, status]);
    
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error creating project" 
    });
  }
});

// PATCH /api/projects/:id - Update project (partial update)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters"
        });
      }
      updateFields.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await req.app.locals.db.query(`
      UPDATE projects 
      SET ${updateFields.join(", ")} 
      WHERE id = $${paramCount} 
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    res.json({
      success: true,
      message: "Project updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating project" 
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check how many tasks will be deleted
    const tasksResult = await req.app.locals.db.query(`
      SELECT COUNT(*) as count FROM tasks WHERE project_id = $1
    `, [id]);
    
    const taskCount = parseInt(tasksResult.rows[0].count);
    
    const result = await req.app.locals.db.query(`
      DELETE FROM projects 
      WHERE id = $1 
      RETURNING name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    res.json({
      success: true,
      message: "Project deleted successfully",
      details: {
        deletedProject: result.rows[0].name,
        cascadeDeleted: `${taskCount} tasks were also deleted due to CASCADE constraint`
      }
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting project" 
    });
  }
});

// GET /api/projects/:id/tasks - Get tasks in project
router.get("/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const projectResult = await req.app.locals.db.query(`
      SELECT name FROM projects WHERE id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      SELECT 
        t.*,
        a.name as assignee_name,
        a.email as assignee_email
      FROM tasks t
      LEFT JOIN assignees a ON t.assignee_id = a.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: result.rows,
      project: projectResult.rows[0].name
    });
  } catch (error) {
    console.error("Get project tasks error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching project tasks" 
    });
  }
});

// GET /api/projects/:id/assignees - Get assignees assigned to project
router.get("/:id/assignees", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const projectResult = await req.app.locals.db.query(`
      SELECT name FROM projects WHERE id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      SELECT 
        a.*,
        pa.role_in_project,
        pa.assigned_at
      FROM assignees a
      JOIN project_assignees pa ON a.id = pa.assignee_id
      WHERE pa.project_id = $1
      ORDER BY pa.assigned_at DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: result.rows,
      project: projectResult.rows[0].name
    });
  } catch (error) {
    console.error("Get project assignees error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching project assignees" 
    });
  }
});

// POST /api/projects/:id/assignees - Assign assignee to project
router.post("/:id/assignees", async (req, res) => {
  try {
    const { id } = req.params;
    const { assignee_id, role_in_project = "Team Member" } = req.body;
    
    if (!assignee_id) {
      return res.status(400).json({
        success: false,
        message: "Assignee ID is required"
      });
    }
    
    // Check if project exists
    const projectExists = await req.app.locals.db.query(`
      SELECT id FROM projects WHERE id = $1
    `, [id]);
    
    if (projectExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    // Check if assignee exists
    const assigneeExists = await req.app.locals.db.query(`
      SELECT id FROM assignees WHERE id = $1
    `, [assignee_id]);
    
    if (assigneeExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      INSERT INTO project_assignees (project_id, assignee_id, role_in_project) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [id, assignee_id, role_in_project]);
    
    res.status(201).json({
      success: true,
      message: "Assignee assigned to project successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Assign assignee to project error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: "Assignee is already assigned to this project"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error assigning assignee to project" 
    });
  }
});

// DELETE /api/projects/:projectId/assignees/:assigneeId - Remove assignee from project
router.delete("/:projectId/assignees/:assigneeId", async (req, res) => {
  try {
    const { projectId, assigneeId } = req.params;
    
    const result = await req.app.locals.db.query(`
      DELETE FROM project_assignees 
      WHERE project_id = $1 AND assignee_id = $2 
      RETURNING *
    `, [projectId, assigneeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }
    
    res.json({
      success: true,
      message: "Assignee removed from project successfully"
    });
  } catch (error) {
    console.error("Remove assignee from project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error removing assignee from project" 
    });
  }
});

export default router;
```

## Routes - Tasks (routes/tasks.js)

```javascript
import express from "express";
const router = express.Router();

// Validation helper
const validateTask = (title, project_id, assignee_id) => {
  if (!title || title.trim().length < 2) {
    return "Title is required and must be at least 2 characters";
  }
  if (!project_id) {
    return "Project ID is required";
  }
  if (!assignee_id) {
    return "Assignee ID is required";
  }
  return null;
};

// GET /api/tasks - Get all tasks with project and assignee info
router.get("/", async (req, res) => {
  try {
    const result = await req.app.locals.db.query(`
      SELECT 
        t.*,
        p.name as project_name,
        a.name as assignee_name,
        a.email as assignee_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN assignees a ON t.assignee_id = a.id
      ORDER BY t.created_at DESC
    `);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching tasks" 
    });
  }
});

// GET /api/tasks/:id - Get single task with project and assignee info
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.db.query(`
      SELECT 
        t.*,
        p.name as project_name,
        a.name as assignee_name,
        a.email as assignee_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN assignees a ON t.assignee_id = a.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching task" 
    });
  }
});

// POST /api/tasks - Create new task
router.post("/", async (req, res) => {
  try {
    const { 
      title, 
      description, 
      status = "Todo", 
      priority = "Medium", 
      due_date, 
      project_id, 
      assignee_id 
    } = req.body;
    
    // Validation
    const validationError = validateTask(title, project_id, assignee_id);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }
    
    // Check if project exists
    const projectExists = await req.app.locals.db.query(`
      SELECT id FROM projects WHERE id = $1
    `, [project_id]);
    
    if (projectExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project not found"
      });
    }
    
    // Check if assignee exists
    const assigneeExists = await req.app.locals.db.query(`
      SELECT id FROM assignees WHERE id = $1
    `, [assignee_id]);
    
    if (assigneeExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignee not found"
      });
    }
    
    const result = await req.app.locals.db.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `, [title.trim(), description || null, status, priority, due_date || null, project_id, assignee_id]);
    
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Create task error:", error);
    if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: "Invalid project_id or assignee_id"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error creating task" 
    });
  }
});

// PATCH /api/tasks/:id - Update task (partial update)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, project_id, assignee_id } = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      if (title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Title must be at least 2 characters"
        });
      }
      updateFields.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramCount++}`);
      values.push(due_date);
    }
    
    if (project_id !== undefined) {
      // Check if project exists
      const projectExists = await req.app.locals.db.query(`
        SELECT id FROM projects WHERE id = $1
      `, [project_id]);
      
      if (projectExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Project not found"
        });
      }
      
      updateFields.push(`project_id = $${paramCount++}`);
      values.push(project_id);
    }
    
    if (assignee_id !== undefined) {
      // Check if assignee exists (null is allowed)
      if (assignee_id !== null) {
        const assigneeExists = await req.app.locals.db.query(`
          SELECT id FROM assignees WHERE id = $1
        `, [assignee_id]);
        
        if (assigneeExists.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Assignee not found"
          });
        }
      }
      
      updateFields.push(`assignee_id = $${paramCount++}`);
      values.push(assignee_id);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await req.app.locals.db.query(`
      UPDATE tasks 
      SET ${updateFields.join(", ")} 
      WHERE id = $${paramCount} 
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    res.json({
      success: true,
      message: "Task updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Update task error:", error);
    if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: "Invalid project_id or assignee_id"
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error updating task" 
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.db.query(`
      DELETE FROM tasks 
      WHERE id = $1 
      RETURNING title
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    res.json({
      success: true,
      message: "Task deleted successfully",
      details: {
        deletedTask: result.rows[0].title
      }
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting task" 
    });
  }
});

export default router;
```

## Configuration Files

### package.json
```json
{
  "name": "project-manager-api",
  "version": "1.0.0",
  "description": "Project Manager API with 3 related entities",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  },
  "keywords": ["api", "express", "postgresql", "crud"],
  "author": "Your Name",
  "license": "MIT"
}
```

### .env
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/project_manager

# Server Configuration
PORT=8080
NODE_ENV=development

# Example for Railway/Heroku
# DATABASE_URL=postgresql://postgres:password@host:port/database
```

## Installation & Setup Instructions

### 1. Create Project Directory
```bash
mkdir project-manager-api
cd project-manager-api
```

### 2. Initialize Project
```bash
npm init -y
npm install express pg cors dotenv
npm install --save-dev nodemon
```

### 3. Create File Structure
```bash
mkdir routes
touch index.js .env
touch routes/assignees.js routes/projects.js routes/tasks.js
```

### 4. Setup Database
```bash
# Install PostgreSQL locally or use cloud service
# Create database: project_manager
# Update .env with your database URL
```

### 5. Run the Application
```bash
# Development
npm run dev

# Production
npm start
```

## Testing Commands

### Test All Endpoints
```bash
# Base URL
curl http://localhost:8080/

# Dashboard Stats
curl http://localhost:8080/api/dashboard/stats

# Assignees
curl http://localhost:8080/api/assignees
curl -X POST http://localhost:8080/api/assignees \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","role":"Developer"}'
curl -X PATCH http://localhost:8080/api/assignees/1 \
  -H "Content-Type: application/json" \
  -d '{"role":"Senior Developer"}'
curl http://localhost:8080/api/assignees/1/tasks
curl -X DELETE http://localhost:8080/api/assignees/1

# Projects
curl http://localhost:8080/api/projects
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test description"}'
curl -X PATCH http://localhost:8080/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'
curl http://localhost:8080/api/projects/1/tasks
curl -X DELETE http://localhost:8080/api/projects/1

# Test Tasks
curl http://localhost:8080/api/tasks
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Test description","project_id":1,"assignee_id":1}'
curl -X PATCH http://localhost:8080/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress","priority":"High"}'
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

## Features Implemented

### ✅ Database Features
- **4 related tables** with proper foreign keys
- **CASCADE DELETE** for projects → tasks
- **SET NULL** for assignees → tasks
- **🆕 CASCADE DELETE** for project_assignees (Many-to-Many)
- **🆕 Junction table** for assignees ↔ projects relationship
- **Auto-timestamps** for created_at/updated_at
- **Sample data** insertion

### ✅ API Features
- **Complete CRUD** for all 3 entities
- **PATCH endpoints** for partial updates
- **Relationship endpoints** (get tasks by project/assignee)
- **🆕 Many-to-Many endpoints** (assign/unassign assignees to projects)
- **Dashboard statistics** endpoint
- **Proper validation** and error handling
- **Foreign key validation** before inserts/updates

### ✅ Advanced Features
- **Dynamic query building** for PATCH operations
- **🆕 Many-to-Many relationship management** with role_in_project
- **Detailed error messages** with specific codes
- **Graceful shutdown** handling
- **Comprehensive logging** with emojis
- **Modular route structure** for maintainability

### ✅ Production Ready
- **Environment variables** configuration
- **Error handling** for all edge cases
- **Input validation** and sanitization
- **SQL injection protection** with parameterized queries
- **CORS enabled** for cross-origin requests

This implementation provides a complete, production-ready API that follows all the specifications from the project-manager.md document! 🚀
