import express from "express";
import bodyParser from "body-parser";


const app = express();
const port = 4000;

let tasks = [];

let lastId = 0;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// get all tasks
app.get("/tasks", (req, res) => {
    res.json(tasks);
});

// get a specific task by id
app.get("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find((task) => task.id === id);
    res.json(task);
});

//posting a new task
app.post("/tasks", (req, res) => {
    const newId = lastId += 1;
    const newTask = {
        id: newId,
        title: req.body.title,
        duedate: req.body.duedate,
        description: req.body.description,
        category: req.body.category,
    };
    tasks.push(newTask);
    res.status(201).json(newTask)
});

//patching a task

app.patch("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const existingTask = tasks.find((task) => task.id === id);
    const updatedTask = {
        id: id,
        title: req.body.title || existingTask.title,
        duedate: req.body.duedate || existingTask.duedate,
        description: req.body.description || existingTask.description,
        category: req.body.category || existingTask.category,
    };
    const searchId = tasks.findIndex((task) => task.id === id);
    tasks[searchId] = updatedTask;
    res.json(updatedTask);
});

//deleting specific task using task id

app.delete("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const searchId = tasks.findIndex((task) => task.id === id);
    if (searchId > -1) {
        tasks.splice(searchId, 1);
        res.sendStatus(200);
    } else {
        res
        .status(404)
        .json({ error: "task not found"});
    }
});


app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
  });