import express from "express";

const projectsRouter = express.Router();

projectsRouter.get("/", async (req, res) => {
  try {
    const result = await client.query(`
        SELECT p.*, a.name as owner_name, a.email as owner_email
        FROM projects p
        LEFT JOIN assignees a ON p.owner_id = a.id
        ORDER BY p.created_at DESC
      `);

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

// GET: /api/projects/:id - Get project by ID
projectsRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `
        SELECT p.*, a.name as owner_name, a.email as owner_email
        FROM projects p
        LEFT JOIN assignees a ON p.owner_id = a.id
        WHERE p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
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

// POST: /api/projects - Create new project
projectsRouter.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      status = "active",
      priority = "medium",
      owner_id,
      start_date,
      end_date,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const result = await client.query(
      "INSERT INTO projects (title, description, status, priority, owner_id, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, description, status, priority, owner_id, start_date, end_date]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
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

// PUT: /api/projects/:id - Update project
projectsRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      owner_id,
      start_date,
      end_date,
    } = req.body;

    const result = await client.query(
      "UPDATE projects SET title = $1, description = $2, status = $3, priority = $4, owner_id = $5, start_date = $6, end_date = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *",
      [title, description, status, priority, owner_id, start_date, end_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
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

// DELETE: /api/projects/:id - Delete project
projectsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      "DELETE FROM projects WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
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

export default projectsRouter;
