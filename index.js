import express from "express";
import client from "./src/db/index.js";
import assigneesRouter from "./src/modules/assigness/route.js";
import projectsRouter from "./src/modules/projects/route.js";
import tasksRouter from "./src/modules/tasks/route.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "express-validator";
// import { auth } from "./src/middleware/auth.js";

const prisma = new PrismaClient();

const app = express();
const port = 8080;

app.use(express.json());

// ===================
// ASSIGNEES ROUTES
// ===================
app.use("/api/assignees", assigneesRouter);

// ===================
// PROJECTS ROUTES
// ===================
app.use("/api/projects", projectsRouter);

// ===================
// TASKS ROUTES
// ===================
app.use("/api/tasks", tasksRouter);

// ===================
// ADDITIONAL ROUTES
// ===================

// GET: /api/projects/:id/tasks - Get all tasks for a specific project
app.get("/api/projects/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `
      SELECT t.*, a.name as assigned_to_name
      FROM tasks t
      LEFT JOIN assignees a ON t.assigned_to = a.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `,
      [id]
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
});

// GET: /api/assignees/:id/tasks - Get all tasks assigned to a specific assignee
app.get("/api/assignees/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `
      SELECT t.*, p.title as project_title
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = $1
      ORDER BY t.created_at DESC
    `,
      [id]
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
});

// GET: /api/dashboard - Get dashboard statistics
app.get("/api/dashboard", async (req, res) => {
  try {
    const [projectsResult, tasksResult, assigneesResult] = await Promise.all([
      client.query(
        "SELECT COUNT(*) as total_projects, COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects FROM projects"
      ),
      client.query(
        "SELECT COUNT(*) as total_tasks, COUNT(CASE WHEN completed = true THEN 1 END) as completed_tasks FROM tasks"
      ),
      client.query("SELECT COUNT(*) as total_assignees FROM assignees"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        projects: projectsResult.rows[0],
        tasks: tasksResult.rows[0],
        assignees: assigneesResult.rows[0],
      },
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

// ===================
// ADMIN ROUTES
// ===================

// POST: /api/admin/cleanup - Complete database cleanup with CASCADE
app.post("/api/admin/cleanup", async (req, res) => {
  try {
    await cleanupDatabase();

    res.status(200).json({
      success: true,
      message: "Database cleanup completed with CASCADE",
      warning: "All tables, sequences, and data have been permanently deleted",
    });
  } catch (error) {
    console.error("Database cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Database cleanup failed",
      error: error.message,
    });
  }
});

// POST: /api/admin/reset - Reset database (cleanup + recreate + sample data)
app.post("/api/admin/reset", async (req, res) => {
  try {
    await cleanupDatabase();
    await initializeDatabase();
    await insertSampleData();

    res.status(200).json({
      success: true,
      message: "Database reset completed successfully",
      details:
        "All tables dropped with CASCADE, recreated, and sample data inserted",
    });
  } catch (error) {
    console.error("Database reset error:", error);
    res.status(500).json({
      success: false,
      message: "Database reset failed",
      error: error.message,
    });
  }
});

// AUthentication
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  const saltRound = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, saltRound);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
});

// DDD

app.post(
  "/api/auth/login",
  validator.body("email").isEmail().withMessage("Invalid email"),
  validator
    .body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // NODEJS : process.env.<name>

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_KEY,
      {
        expiresIn: "8h",
      }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: token,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
    });
  }
);

app.get("/api/auth/whoami", async (req, res) => {
  const user = req.user;
  return res.status(200).json({
    success: true,
    message: "Authenticated",
    data: user,
  });
});

app.get("/api/auth/logout", async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      accessToken: null,
    },
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

app.app.listen(port, () => {
  console.log(
    `🚀 Project Management API listening at http://localhost:${port}`
  );
  console.log(`📊 Dashboard: http://localhost:${port}/api/dashboard`);
  console.log(
    `🔧 Admin Cleanup: POST http://localhost:${port}/api/admin/cleanup`
  );
  console.log(`🔄 Admin Reset: POST http://localhost:${port}/api/admin/reset`);
  console.log(`⚠️  Admin routes will DELETE ALL DATA with CASCADE`);
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

// npx prisma db push : push the schema to the database
// npx prisma studio : open the prisma studio
// npx prisma migrate dev : push the schema to the database

/**
 * offset pagination: 1. page,
 * cursor pagination: 1. next cursor
 */
