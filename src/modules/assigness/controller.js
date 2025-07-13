import client from "../../db/index.js";

export const getAllAssignees = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM assignees ORDER BY created_at DESC"
    );

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
};

export const getAssigneeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query("SELECT * FROM assignees WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found",
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
};

export const createAssignee = async (req, res) => {
  try {
    const { name, email, role = "member" } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const result = await client.query(
      "INSERT INTO assignees (name, email, role) VALUES ($1, $2, $3) RETURNING *",
      [name, email, role]
    );

    res.status(201).json({
      success: true,
      message: "Assignee created successfully",
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
};

export const updateAssignee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const result = await client.query(
      `
          UPDATE assignees 
          SET name = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $4 RETURNING *
          `,
      [name, email, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Assignee updated successfully",
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
};

export const deleteAssignee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      "DELETE FROM assignees WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Assignee deleted successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
};
