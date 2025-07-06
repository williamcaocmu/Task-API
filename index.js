import express from "express";
import { Client } from "pg";

// DATABASE_URL = 'postgresql://postgres:qVeIKXpzDxNiSTekyguDTXwwLpFveujl@metro.proxy.rlwy.net:28734/railway'
const client = new Client({
  connectionString:
    "postgresql://postgres:qVeIKXpzDxNiSTekyguDTXwwLpFveujl@metro.proxy.rlwy.net:28734/railway",
});

await client.connect();

// Test the connection
const result = await client.query("SELECT NOW()");
console.log("Database connected successfully:", result.rows[0]);

// Create tasks table if it doesn't exist
async function createTasksTable() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tasks table created or already exists");
  } catch (error) {
    console.error("Error creating tasks table:", error);
  }
}

// Create the table on startup
await createTasksTable();

// Insert sample data if table is empty
async function insertSampleData() {
  try {
    const countResult = await client.query("SELECT COUNT(*) FROM tasks");
    const taskCount = parseInt(countResult.rows[0].count);

    if (taskCount === 0) {
      await client.query(`
        INSERT INTO tasks (title, description, completed) VALUES
        ('Learn Node.js', 'Complete Node.js tutorial', false),
        ('Build REST API', 'Create CRUD operations', true),
        ('Learn PostgreSQL', 'Study database fundamentals', false)
      `);
      console.log("Sample data inserted");
    }
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
}

// Insert sample data on startup
await insertSampleData();

const app = express();
const port = 8080;

app.use(express.json());

// No longer needed - using PostgreSQL database now
// const TASKS = [...];

// GET: /api/tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM tasks");

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// GET: /api/tasks/:id
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query("SELECT * FROM tasks WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// POST: /api/tasks
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const result = await client.query(
      "INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *",
      [title, description]
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// PUT: /api/tasks/:id
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    const result = await client.query(
      "UPDATE tasks SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [title, description, completed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// DELETE: /api/tasks/:id
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Graceful shutdown - close database connection when app stops
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await client.end();
  console.log("Database connection closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await client.end();
  console.log("Database connection closed");
  process.exit(0);
});

// 1. npm i nodemon -D: install nodemon as a dev dependency
// 2. scripts in package.json: "start": "nodemon index.js"
