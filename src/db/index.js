import { Client } from "pg";

const client = new Client({
  connectionString:
    "postgresql://postgres:qVeIKXpzDxNiSTekyguDTXwwLpFveujl@metro.proxy.rlwy.net:28734/railway",
});

await client.connect();

// Test the connection
const result = await client.query("SELECT NOW()");
console.log("Database connected successfully:", result.rows[0]);

// Drop existing tables and create new schema
async function initializeDatabase() {
  try {
    // Drop all tables with CASCADE to ensure complete cleanup
    console.log("🗑️  Dropping all existing tables with CASCADE...");

    await client.query(`DROP TABLE IF EXISTS tasks CASCADE`);
    await client.query(`DROP TABLE IF EXISTS projects CASCADE`);
    await client.query(`DROP TABLE IF EXISTS assignees CASCADE`);
    await client.query(`DROP TABLE IF EXISTS project_assignees CASCADE`);

    // Drop any potential additional tables that might exist
    await client.query(`DROP TABLE IF EXISTS users CASCADE`);
    await client.query(`DROP TABLE IF EXISTS sessions CASCADE`);
    await client.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await client.query(`DROP TABLE IF EXISTS attachments CASCADE`);
    await client.query(`DROP TABLE IF EXISTS comments CASCADE`);
    await client.query(`DROP TABLE IF EXISTS time_logs CASCADE`);

    console.log("✅ All existing tables dropped with CASCADE");

    // Create assignees table
    await client.query(`
        CREATE TABLE assignees (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) DEFAULT 'member',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

    // Create projects table
    await client.query(`
        CREATE TABLE projects (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          priority VARCHAR(50) DEFAULT 'medium',
          owner_id INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
          start_date DATE,
          end_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

    // Create tasks table (related to projects)
    await client.query(`
        CREATE TABLE tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          priority VARCHAR(50) DEFAULT 'medium',
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          assigned_to INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
          due_date DATE,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

    // Create project_assignees table for many-to-many relationship
    await client.query(`
        CREATE TABLE project_assignees (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          assignee_id INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
          role_in_project VARCHAR(100) DEFAULT 'Team Member',
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, assignee_id)
        )
      `);

    console.log(
      "✅ New database schema created successfully with CASCADE constraints"
    );
    console.log("🔄 CASCADE DELETE behavior:");
    console.log(
      "   - Deleting an assignee will CASCADE delete their owned projects, tasks, and project assignments"
    );
    console.log(
      "   - Deleting a project will CASCADE delete all its tasks and project assignments"
    );
  } catch (error) {
    console.error("❌ Error initializing database:", error);
  }
}

// Insert sample data only if tables are empty
async function insertSampleData() {
  try {
    console.log(
      "🔍 Checking if tables are empty before inserting sample data..."
    );

    // Check if assignees table is empty
    const assigneesCount = await client.query("SELECT COUNT(*) FROM assignees");
    const assigneesTotal = parseInt(assigneesCount.rows[0].count);

    // Check if projects table is empty
    const projectsCount = await client.query("SELECT COUNT(*) FROM projects");
    const projectsTotal = parseInt(projectsCount.rows[0].count);

    // Check if tasks table is empty
    const tasksCount = await client.query("SELECT COUNT(*) FROM tasks");
    const tasksTotal = parseInt(tasksCount.rows[0].count);

    // Check if project_assignees table is empty
    const projectAssigneesCount = await client.query(
      "SELECT COUNT(*) FROM project_assignees"
    );
    const projectAssigneesTotal = parseInt(projectAssigneesCount.rows[0].count);

    console.log(
      `📊 Current data count: ${assigneesTotal} assignees, ${projectsTotal} projects, ${tasksTotal} tasks, ${projectAssigneesTotal} project assignments`
    );

    // Only insert sample data if all tables are empty
    if (
      assigneesTotal === 0 &&
      projectsTotal === 0 &&
      tasksTotal === 0 &&
      projectAssigneesTotal === 0
    ) {
      console.log("📝 Tables are empty, inserting sample data...");

      // Insert sample assignees
      await client.query(`
          INSERT INTO assignees (name, email, role) VALUES
          ('John Doe', 'john@example.com', 'admin'),
          ('Jane Smith', 'jane@example.com', 'manager'),
          ('Bob Johnson', 'bob@example.com', 'member')
        `);
      console.log("✅ Sample assignees inserted");

      // Insert sample projects
      await client.query(`
          INSERT INTO projects (title, description, status, priority, owner_id, start_date, end_date) VALUES
          ('Website Redesign', 'Complete overhaul of company website', 'active', 'high', 1, '2024-01-01', '2024-03-31'),
          ('Mobile App Development', 'Create new mobile application', 'active', 'medium', 2, '2024-02-01', '2024-06-30'),
          ('Database Migration', 'Migrate from MySQL to PostgreSQL', 'planning', 'high', 1, '2024-03-01', '2024-04-30')
        `);
      console.log("✅ Sample projects inserted");

      // Insert sample tasks
      await client.query(`
          INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, due_date, completed) VALUES
          ('Design Homepage', 'Create new homepage design', 'in_progress', 'high', 1, 2, '2024-01-15', false),
          ('Setup Database', 'Configure PostgreSQL database', 'completed', 'high', 1, 1, '2024-01-10', true),
          ('Create API Endpoints', 'Build REST API for mobile app', 'pending', 'medium', 2, 3, '2024-02-20', false),
          ('User Authentication', 'Implement login/logout functionality', 'in_progress', 'high', 2, 2, '2024-02-25', false)
        `);
      console.log("✅ Sample tasks inserted");

      // Insert sample project_assignees (many-to-many relationships)
      await client.query(`
          INSERT INTO project_assignees (project_id, assignee_id, role_in_project) VALUES
          (1, 1, 'Project Lead'),
          (1, 2, 'Frontend Developer'),
          (2, 2, 'Backend Developer'),
          (2, 3, 'Mobile Developer'),
          (3, 1, 'Database Administrator'),
          (3, 3, 'Developer')
          ON CONFLICT (project_id, assignee_id) DO NOTHING
        `);
      console.log("✅ Sample project assignments inserted");

      console.log("🎉 All sample data inserted successfully!");
    } else {
      console.log(
        "📋 Tables already contain data, skipping sample data insertion"
      );
      console.log(
        "💡 Use POST /api/admin/reset to clear and recreate with sample data"
      );
    }
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
  }
}

// Initialize database on startup
await initializeDatabase();
await insertSampleData();

export default client;
