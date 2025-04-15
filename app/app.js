const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const socketIo = require("socket.io");

// Create express app
var app = express();

// Add static files location
app.use(express.static(path.join(__dirname, "..", "static")));

// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'services', 'views'));

console.log("Views directory set to:", path.join(__dirname, 'services', 'views'));

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // <-- This middleware parses JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up sessions
app.use(session({
  secret: 'supersecretkey',  // replace with a secure secret in production
  resave: false,
  saveUninitialized: false
}));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Routes
app.get("/", function(req, res) {
    res.render("index", { title: "Home", user: req.session.user });
});

app.get("/signup", function(req, res) {
    res.render("signup", { title: "Sign Up", user: req.session.user });
});

app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact", user: req.session.user });
});

app.get("/features", function(req, res) {
    res.render("features", { title: "Features", user: req.session.user });
});

app.get("/how_it_works", function(req, res) {
    res.render("how_it_works", { title: "How It Works", user: req.session.user });
});

app.get("/login", function(req, res) {
    res.render("login", { title: "Log In", user: req.session.user });
});

// GET route to render the settings page
app.get("/settings", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("settings", { title: "Settings", user: req.session.user });
});

// POST route to update settings
app.post("/settings_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const { emailNotifications, theme, privacy } = req.body;
  try {
    await db.query(
      "UPDATE users SET emailNotifications = ?, theme = ?, privacy = ? WHERE id = ?",
      [emailNotifications, theme, privacy, req.session.user.id]
    );
    // Update session object with new settings
    req.session.user.emailNotifications = emailNotifications;
    req.session.user.theme = theme;
    req.session.user.privacy = privacy;
    res.redirect("/settings");
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).send("Error updating settings");
  }
});

// Optional: POST route for account deletion
app.post("/delete_account", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.session.user.id]);
    req.session.destroy();
    res.redirect("/signup"); // Or homepage
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).send("Error deleting account");
  }
});

// Chat route
app.get("/chats", (req, res) => {
  if(!req.session.user) {
      return res.redirect("/login");
  }
  res.render("chats", { title: "Chats", user: req.session.user });
});

app.get("/chats", (req, res) => {
  // Ensure the user is logged in; if not, redirect to the login page.
  if (!req.session.user) {
    return res.redirect("/login");
  }
  // Render the chats view and pass the user data.
  res.render("chats", { title: "Chats", user: req.session.user });
});

app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("profile", { title: "Profile", user: req.session.user });
});

app.post("/profile_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const { username, name, email, password, interests } = req.body;
    // If you haven't added a "username" column, you may update just name, email, password, and interests.
    await db.query(
      "UPDATE users SET username = ?, name = ?, email = ?, password = ?, interests = ? WHERE id = ?",
      [username, name, email, password, interests, req.session.user.id]
    );
    // Update session data with the new information
    req.session.user = { ...req.session.user, username, name, email, interests };
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Error updating profile");
  }
});

app.post("/profile_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const { name, email, password, interests } = req.body;
    // For username, you can use name if you don't have a separate username field.
    await db.query(
      "UPDATE users SET name = ?, email = ?, password = ?, interests = ? WHERE id = ?",
      [name, email, password, interests, req.session.user.id]
    );
    // Update session data (excluding password for security)
    req.session.user = { ...req.session.user, name, email, interests };
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Error updating profile");
  }
});

// Dashboard route (requires a logged-in user)
app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("dashboard", { title: "Dashboard", user: req.session.user, name: req.session.user.name });
});
 
// Handle login process
app.post("/login_process", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login attempt with email:", email);

    // Fetch the user from the database
    const result = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    console.log("Database query result:", result);

    // Ensure the result is an array and contains at least one user
    if (!result || result.length === 0) {
      console.log("No user found with the provided email.");
      return res.render("login", { title: "Log In", error: "Invalid credentials.", user: null });
    }

    const user = result[0]; // Access the first user in the result array
    console.log("User fetched from database:", user);

    // Compare the entered password with the hashed password
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Password does not match.");
      return res.render("login", { title: "Log In", error: "Invalid credentials.", user: null });
    }

    // Save user data in session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      interests: user.interests,
    };
    console.log("User session created:", req.session.user);

    // Redirect to the dashboard after successful login
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error in /login_process:", err);
    res.status(500).send("Error processing login");
  }
});




// Handle signup process
app.post("/signup_process", async function (req, res) {
  try {
    console.log("Raw signup data:", req.body); // Debugging log

    const { name, email, password, confirmPassword, interests } = req.body;

    console.log("Parsed signup data:", { name, email, password, confirmPassword, interests });

    // Validate input
    if (!name || !email || !password || !confirmPassword || !interests) {
      console.log("Validation failed: Missing fields");
      return res.render("signup", {
        title: "Sign Up",
        error: "All fields are required.",
        user: null,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validation failed: Invalid email format");
      return res.render("signup", {
        title: "Sign Up",
        error: "Invalid email format.",
        user: null,
      });
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
      console.log("Validation failed: Invalid password");
      return res.render("signup", {
        title: "Sign Up",
        error: "Password must be at least 8 characters long, include at least 1 uppercase letter, 1 lowercase letter, and 1 special character.",
        user: null,
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      console.log("Validation failed: Passwords do not match");
      return res.render("signup", {
        title: "Sign Up",
        error: "Passwords do not match.",
        user: null,
      });
    }

    // Convert interests array to a comma-separated string
    const interestsString = Array.isArray(interests) ? interests.join(", ") : interests;
    console.log("Interests string:", interestsString);

    // Hash the password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password generated");

    // Insert the user into the database
    const insertQuery = `
      INSERT INTO users (name, email, password, interests) 
      VALUES (?, ?, ?, ?)
    `;
    const result = await db.query(insertQuery, [name, email, hashedPassword, interestsString]);
    console.log("User successfully inserted into the database:", result);

    res.redirect("/login");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.log("Duplicate email error");
      return res.render("signup", {
        title: "Sign Up",
        error: "An account with this email already exists.",
        user: null,
      });
    }
    console.error("Error in /signup_process:", err);
    res.status(500).send("Error signing up");
  }
});









app.get("/find_buddy", (req, res) => {
  if (!req.session.user) { 
    return res.redirect("/login");
  }
  res.render("find_buddy", { title: "Find Your Buddy", user: req.session.user });
});

// Find buddy endpoint
app.get("/find_buddy/:module", async (req, res) => {
  const { module } = req.params;
  try {
    const buddies = await db.query(
      "SELECT id, name, email FROM users WHERE FIND_IN_SET(?, interests)",
      [module]
    );
    res.json(buddies);
  } catch (error) {
    console.error("Error retrieving buddy list:", error);
    res.status(500).json({ error: "Error retrieving buddy list" });
  }
});

// Add buddy endpoint
app.post("/add_buddy", async (req, res) => {
  const { currentUserId, buddyId } = req.body;
  try {
    await db.query(
      "INSERT INTO buddies (user_id, buddy_id) VALUES (?, ?)",
      [currentUserId, buddyId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding buddy:", error);
    res.status(500).json({ error: "Error adding buddy" });
  }
});

app.post("/respond_friend_request", async (req, res) => {
  const { userId, action } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (action === "accept") {
      // Add the user as a friend in the database
      await db.query(
        "INSERT INTO friends (user_id, friend_id) VALUES (?, ?), (?, ?)",
        [req.session.user.id, userId, userId, req.session.user.id]
      );

      // Optionally, remove the friend request from the database
      await db.query(
        "DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ?",
        [userId, req.session.user.id]
      );

      return res.json({ message: "Friend request accepted." });
    } else if (action === "ignore") {
      // Remove the friend request from the database
      await db.query(
        "DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ?",
        [userId, req.session.user.id]
      );

      return res.json({ message: "Friend request ignored." });
    } else {
      return res.status(400).json({ error: "Invalid action." });
    }
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return res.status(500).json({ error: "An error occurred while processing the request." });
  }
});

// Logout route: destroy the session and redirect to home
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/");
    });
});

app.get("/get_buddies", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    // Assuming buddies table stores user_id (the current user) and buddy_id (the buddy)
    const buddies = await db.query(
      "SELECT u.id, u.name, u.email FROM buddies b JOIN users u ON b.buddy_id = u.id WHERE b.user_id = ?",
      [req.session.user.id]
    );
    res.json(buddies);
  } catch (error) {
    console.error("Error retrieving buddy list for dashboard:", error);
    res.status(500).json({ error: "Error retrieving buddy list" });
  }
});

// Route to render the Buddies page
app.get("/buddies", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login"); // Redirect to login if the user is not logged in
  }

  try {
    // Fetch the list of buddies for the logged-in user
    const [buddies] = await db.query(
      `SELECT u.id AS buddyId, u.name AS buddyName, b.rating 
       FROM buddies b
       JOIN users u ON b.buddy_id = u.id
       WHERE b.user_id = ?`,
      [req.session.user.id]
    );

    console.log("Buddies fetched:", buddies); // Debugging log

    // Render the Buddies page with the fetched data
    res.render("buddies", {
      title: "Buddies",
      user: req.session.user,
      buddies: buddies || [],
    });
  } catch (error) {
    console.error("Error fetching buddies:", error.message);
    res.status(500).send("Error loading buddies page");
  }
});

// Route to handle buddy rating
app.post("/rate_buddy", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { buddyId, rating } = req.body;

  console.log("Buddy ID:", buddyId); // Debugging log
  console.log("Rating:", rating); // Debugging log
  console.log("User ID:", req.session.user.id); // Debugging log

  try {
    // Update the buddy's rating in the database
    const [result] = await db.query(
      `UPDATE buddies 
       SET rating = ? 
       WHERE user_id = ? AND buddy_id = ?`,
      [rating, req.session.user.id, buddyId]
    );

    console.log("Database update result:", result); // Debugging log

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Buddy not found or already rated." });
    }

    res.json({ success: true, message: "Buddy rated successfully" });
  } catch (error) {
    console.error("Error rating buddy:", error.message);
    res.status(500).json({ error: "Error rating buddy" });
  }
});

app.get("/activity", async (req, res) => {
  if (!req.session.user) {
    console.log("User not logged in. Redirecting to login.");
    return res.redirect("/login");
  }

  try {
    console.log("Fetching friend requests for user:", req.session.user.id);

    // Fetch pending friend requests
    const friendRequests = await db.query(
      "SELECT fr.sender_id AS userId, u.name AS userName FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = ?",
      [req.session.user.id]
    );
    console.log("Friend requests:", friendRequests);

    // Fetch unread messages
    const unreadMessages = await db.query(
      `SELECT m.sender_id AS userId, u.name AS userName, COUNT(m.id) AS messageCount
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ? AND m.is_read = 0
       GROUP BY m.sender_id`,
      [req.session.user.id]
    );
    console.log("Unread messages:", unreadMessages);

    // Render the activity page with the fetched data
    res.render("activity", {
      title: "Activity",
      user: req.session.user,
      friendRequests,
      unreadMessages,
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    res.status(500).send("Error loading activity page");
  }
});

// -------------------------------
// Socket.io Messaging Integration
// -------------------------------
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("New client connected");

  // Listen for chat messages
  socket.on("chatMessage", async (msg) => {
    console.log("Message received:", msg);

    try {
      // Save the message to the database
      await db.query(
        "INSERT INTO messages (sender_id, recipient_id, message, timestamp) VALUES (?, ?, ?, NOW())",
        [msg.from, msg.to, msg.message]
      );

      // Emit the message to the sender and recipient
      socket.emit("chatMessage", msg); // Send to the sender
      socket.to(msg.to).emit("chatMessage", msg); // Send to the recipient
    } catch (error) {
      console.error("Error saving message to database:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const userSockets = new Map(); // Map to store user IDs and their socket IDs

io.on("connection", (socket) => {
  console.log("New client connected");

  // Store the user's socket ID when they connect
  socket.on("registerUser", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID ${socket.id}`);
  });

  // Listen for chat messages
  socket.on("chatMessage", async (msg) => {
    console.log("Message received:", msg);

    try {
      // Save the message to the database
      await db.query(
        "INSERT INTO messages (sender_id, recipient_id, message, timestamp) VALUES (?, ?, ?, NOW())",
        [msg.from, msg.to, msg.message]
      );

      // Emit the message to the sender
      socket.emit("chatMessage", msg);

      // Emit the message to the recipient if they are connected
      const recipientSocketId = userSockets.get(msg.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("chatMessage", msg);
      }
    } catch (error) {
      console.error("Error saving message to database:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove the user from the map when they disconnect
    userSockets.forEach((value, key) => {
      if (value === socket.id) {
        userSockets.delete(key);
      }
    });
  });
});


// Route to authenticate with Google Calendar
app.get('/auth/google', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// OAuth2 callback route
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    setTokens(tokens);
    res.send('Authentication successful! You can now create events.');
  } catch (error) {
    console.error('Error during authentication:', error.message);
    res.status(500).send('Authentication failed.');
  }
});

// Route to create a calendar event
app.post('/create_event', async (req, res) => {
  const eventDetails = {
    summary: 'Study Session',
    location: 'Library',
    description: 'Group study session for the upcoming exam.',
    startDateTime: '2025-04-10T10:00:00-07:00',
    endDateTime: '2025-04-10T12:00:00-07:00',
    timeZone: 'America/Los_Angeles',
    attendees: [{ email: 'example1@gmail.com' }, { email: 'example2@gmail.com' }],
  };

  try {
    const event = await createEvent(eventDetails);
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event.' });
  }
});


app.get('/coordinate_study_times', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Redirect to login if the user is not logged in
  }
  res.render('coordinate_study_times', { title: 'Coordinate Study Times', user: req.session.user });
});
// Start server using the HTTP server (not app.listen)
server.listen(3000, function() {
    console.log("Server running on port 3000");
});