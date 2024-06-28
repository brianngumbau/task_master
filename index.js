import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import passport from "passport";
import session from "express-session";
import env from "dotenv";


const app = express();
const port = 4000;
env.config();

/*const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PG_PORT,
});
db.connect();
*/

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error("Connection error", err.stack);
    } else {
        console.log("Connected to the database");
    }
});

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());


let tasks = [];
// get all tasks
app.get("/tasks/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log(userId);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC", [userId]);
        const tasks = result.rows;
        console.log(tasks);
        res.json(tasks);
    } catch (error) {
        console.log(error);
    }
});

// get a specific task by id
app.get("/tasks/:id/user/:userId", async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    //const task = tasks.find((task) => task.id === id);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE id = ($1) AND user_id = ($2)", [id, userId]);
        const task = result.rows[0];
        console.log(task);
        res.json(task);
    } catch (error) {
        console.log(error);
    }
});

//posting a new task
app.post("/tasks/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId)
    const newTask = {
        title: req.body.title,
        duedate: req.body.duedate,
        description: req.body.description,
        category: req.body.category,
    };
    //tasks.push(newTask);
    try {
        await db.query("INSERT INTO tasks (title, duedate, category, description, user_id) VALUES ($1, $2, $3, $4, $5)", 
            [req.body.title, req.body.duedate, req.body.category, req.body.description, userId]);
        
            res.status(201).json(newTask);
    } catch (error) {
        console.log(error);
    }
    
});

//patching a task

app.patch("/tasks/:id/user/:userId", async (req, res) => {
    const taskId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId)
    try {
        const result = await db.query("SELECT * FROM tasks WHERE id = ($1) AND user_id = ($2)", [taskId, userId]);
        const existingTask = result.rows[0];
        console.log(result.rows);

        if (!existingTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        const updatedTask = {
            id: taskId,
            title: req.body.title || existingTask.title,
            duedate: req.body.duedate || existingTask.duedate,
            description: req.body.description || existingTask.description,
            category: req.body.category || existingTask.category,
        };
        //const searchId = tasks.findIndex((task) => task.id === id);
        //tasks[searchId] = updatedTask;
        await db.query(
            "UPDATE tasks SET title = ($1), duedate = ($2), description = ($3), category = ($4) WHERE id = ($5) AND user_id = ($6)", 
            [updatedTask.title, updatedTask.duedate, updatedTask.description, updatedTask.category,  taskId, userId]);
            res.json(updatedTask);

    } catch (error) {
        console.log(error);
    }   
});

//deleting specific task using task id

app.delete("/tasks/delete/:id/user/:userId", async (req, res) => {
    const taskId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    try {
        await db.query("DELETE FROM tasks WHERE id = ($1) AND user_id = $2", [taskId, userId]);
        res.sendStatus(200)
    } catch (error) {
        console.log(error);
    }
    /*const searchId = tasks.findIndex((task) => task.id === id);
    if (searchId > -1) {
        tasks.splice(searchId, 1);
        res.sendStatus(200);
    } else {
        res
        .status(404)
        .json({ error: "task not found"});
    }*/
});
app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
  });