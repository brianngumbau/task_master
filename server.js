import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";


app.use(express.static("public"));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//main page
app.get("/", async (req, res) => {
  try {
    const result = await axios.get(`${API_URL}/tasks`);
    console.log(result.data);
    res.render("index.ejs", { tasks: result.data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks"});
  }
});

//new task page and edit task page
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Task", submit: "Create New Task"});
});

app.get("/edit/:id", async (req, res) => {
    try {
        const result = await axios.get(`${API_URL}/tasks/${req.params.id}`);
        console.log(result.data);
        res.render("modify.ejs", {
            heading: "Edit Task",
            submit: "Update Task",
            task: result.data,
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching task"});
    }
});


// creating new task
app.post("/api/tasks", async (req, res) => {
    try {
        const result = await axios.post(`${API_URL}/tasks`, req.body);
        console.log(result.data);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error creating task"});
    }
});

// updating a task(partially)
app.post("/api/tasks/:id", async (req, res) => {
    try {
        const result = await axios.patch(`${API_URL}/tasks/${req.params.id}`, req.body);
        console.log(result.data);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error updating task"});
    }
});

//deleting a task
app.get("/api/tasks/delete/:id", async (req, res) => {
    try {
        await axios.delete(`${API_URL}/tasks/${req.params.id}`);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error deleting task" });
    }
});

app.listen(port, () => {
    console.log(`Backend is running at http://localhost:${port}`);
});



