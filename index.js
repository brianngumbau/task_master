import express from "express";
import bodyParser from "body-parser";
import pg from "pg";


const app = express();
const port = 4000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "taskmaster",
    password: "918190",
    port: 5432,
});
db.connect();

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let tasks = [
/*{
    id: 1,
    title: "Code reviews",
    category: "Work",
    description: "Review the latest code submissions from the development team. Ensure that the code adheres to our coding standards, is well-documented, and performs as expected.",
    duedate: "19/6/2024",
},
{
    id: 2,
    title: "Online course progress",
    category: "Educational",
    description: "Track and complete the next set of modules in the 'JavaScript Algorithms and Data Structures.",
    duedate: "21/6/2024",
}, */
];

let lastId = 2;



// get all tasks
app.get("/tasks", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM tasks ORDER BY id ASC");
        const tasks = result.rows;
        console.log(tasks);
        res.json(tasks);
    } catch (error) {
        console.log(error);
    }
});

// get a specific task by id
app.get("/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    //const task = tasks.find((task) => task.id === id);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE id = ($1)", [id]);
        const task = result.rows;
        console.log(task);
        res.json(task);
    } catch (error) {
        console.log(error);
    }
});

//posting a new task
app.post("/tasks", async (req, res) => {
    const newId = lastId += 1;
    const newTask = {
        id: newId,
        title: req.body.title,
        duedate: req.body.duedate,
        description: req.body.description,
        category: req.body.category,
    };
    //tasks.push(newTask);
    try {
        await db.query("INSERT INTO tasks (title, duedate, category, description) VALUES ($1, $2, $3, $4)", 
            [req.body.title, req.body.duedate, req.body.category, req.body.description]);
        
            res.status(201).json(newTask);
    } catch (error) {
        console.log(error);
    }
    
});

//patching a task

app.patch("/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existingTask = tasks.find((task) => task.id === id);
    const updatedTask = {
        id: id,
        title: req.body.title || existingTask.title,
        duedate: req.body.duedate || existingTask.duedate,
        description: req.body.description || existingTask.description,
        category: req.body.category || existingTask.category,
    };
    //const searchId = tasks.findIndex((task) => task.id === id);
    //tasks[searchId] = updatedTask;
    try {
        await db.query(
            "UPDATE tasks SET title = ($1), duedate = ($2), description = ($3), category = ($4)", 
        [updatedTask.title, updatedTask.duedate, updatedTask.description, updatedTask.category]);
        res.json(updatedTask);
    } catch (error) {
        console.log(error);
    } 
});

//deleting specific task using task id

app.delete("/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await db.query("DELETE FROM tasks WHERE id = ($1)", [id]);
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