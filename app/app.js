const express = require("express");
const path = require("path");

// Create express app
var app = express();

// Add static files location
app.use(express.static(path.join(__dirname, "static")));

// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'services', 'views'));

console.log("Views directory set to:", path.join(__dirname, 'services', 'views'));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.render("index", { title: "Home" });
});

// Create a route for testing the db
app.get("/db_test", function(req, res) {
    // Assumes a table called test_table exists in your database
    sql = 'select * from test_table';
    db.query(sql).then(results => {
        console.log(results);
        res.send(results)
    });
});

// Create a route for /goodbye
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Create a dynamic route for /hello/<name>
app.get("/hello/:name", function(req, res) {
    console.log(req.params);
    res.send("Hello " + req.params.name);
});

// Create a route for /signup
app.get("/signup", function(req, res) {
    res.render("signup", { title: "Sign Up" });
});

// Create a route for /contact
app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact" });
});

// Create a route for /features
app.get("/features", function(req, res) {
    res.render("features", { title: "Features" });
});

// Create a route for /how_it_works
app.get("/how_it_works", function(req, res) {
    res.render("how_it_works", { title: "How It Works" });
});

// Start server on port 3000
app.listen(3000, function() {
    console.log(`Server running at http://127.0.0.1:3000/`);
});