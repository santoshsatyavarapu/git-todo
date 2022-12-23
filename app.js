const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("./node_modules/date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

function convertDate(date) {
  const dateObject = new Date(date);
  let day = dateObject.getDate();
  if (day < 10) {
    day = "0" + day;
  }
  let month = dateObject.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  let year = dateObject.getFullYear();
  return year + "-" + month + "-" + day;
}

function checkCondition(status, priority, category) {
  if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== ""
  ) {
    return "Invalid Todo Status";
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== ""
  ) {
    return "Invalid Todo Category";
  } else if (
    priority !== "HIGH" &&
    priority !== "LOW" &&
    priority !== "MEDIUM" &&
    priority !== ""
  ) {
    return "Invalid Todo Priority";
  } else {
    return "valid";
  }
}
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
module.exports = app;

//API 1
app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  const condition = checkCondition(status, priority, category);
  if (condition === "valid") {
    const getSearchQuery = `SELECT id,todo,priority,status,category,due_date as dueDate  FROM todo WHERE status LIKE '%${status}%' AND priority LIKE '%${priority}%' AND todo LIKE '%${search_q}%' AND category LIKE '%${category}%';`;
    const array = await db.all(getSearchQuery);
    response.send(array);
    response.status(200);
  } else {
    response.status(400);
    response.send(condition);
  }
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getSearchQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE id=${todoId};`;

  const array = await db.get(getSearchQuery);
  response.send(array);
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isValid(new Date(date))) {
    const dueDate = convertDate(date);
    const dateQuery = `select id,todo,priority,status,category,due_date as dueDate from todo where due_date='${dueDate}';`;
    const agendaQuery = await db.all(dateQuery);
    response.send(agendaQuery);
    response.status(200);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM 
      todo 
    WHERE
      id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

//API 4
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const condition = checkCondition(status, priority, category);

  if (condition === "valid" && isValid(new Date(dueDate))) {
    const insertQuery = `INSERT INTO todo(id,todo,priority,status,category,due_date) VALUES(${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
    const object = await db.run(insertQuery);
    response.send("Todo Successfully Added");
  } else {
    if (condition === "valid") {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.send(condition);
      response.status(400);
    }
  }
});

//API 5

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const {
    todo = "",
    priority = "",
    status = "",
    category = "",
    dueDate = "",
  } = request.body;

  let method = "";
  let value = "";
  let message = "";
  const condition = checkCondition(status, priority, category);

  if (todo !== "") {
    method = "todo";
    value = todo;
    message = "Todo Updated";
  } else if (priority !== "") {
    method = "priority";
    value = priority;
    message = "Priority Updated";
  } else if (status !== "") {
    method = "status";
    value = status;
    message = "Status Updated";
  } else if (category !== "") {
    method = "category";
    value = category;
    message = "Category Updated";
  } else {
    method = "due_date";
    value = dueDate;
    message = "Due Date Updated";
  }

  if (method === "due_date" && isValid(new Date(dueDate)) !== true) {
    response.send("Invalid Due Date");
    response.status(400);
  } else if (condition !== "valid") {
    response.send(condition);
    response.status(400);
  } else {
    const updateQuery = `UPDATE todo SET ${method}='${value}' WHERE id=${todoId};`;
    const result = await db.run(updateQuery);
    response.send(message);
    response.status(200);
  }
});
