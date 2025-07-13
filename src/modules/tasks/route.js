import express from "express";

const tasksRouter = express.Router();

tasksRouter.get("/", async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = `
        SELECT t.*, p.title as project_title, a.name as assigned_to_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN assignees a ON t.assigned_to = a.id
      `;

    let params = [];

    if (project_id) {
      query += " WHERE t.project_id = $1";
      params.push(project_id);
    }

    query += " ORDER BY t.created_at DESC";

    const result = await client.query(query, params);

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

// GET: /api/tasks/:id - Get task by ID
tasksRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `
        SELECT t.*, p.title as project_title, a.name as assigned_to_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN assignees a ON t.assigned_to = a.id
        WHERE t.id = $1
      `,
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

// POST: /api/tasks - Create new task
tasksRouter.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      status = "pending",
      priority = "medium",
      project_id,
      assigned_to,
      due_date,
      completed = false,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const result = await client.query(
      "INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, due_date, completed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        title,
        description,
        status,
        priority,
        project_id,
        assigned_to,
        due_date,
        completed,
      ]
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

// PUT: /api/tasks/:id - Update task
tasksRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      project_id,
      assigned_to,
      due_date,
      completed,
    } = req.body;

    const result = await client.query(
      "UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, project_id = $5, assigned_to = $6, due_date = $7, completed = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *",
      [
        title,
        description,
        status,
        priority,
        project_id,
        assigned_to,
        due_date,
        completed,
        id,
      ]
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

// DELETE: /api/tasks/:id - Delete task
tasksRouter.delete("/:id", async (req, res) => {
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

export default tasksRouter;
