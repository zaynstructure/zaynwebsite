/* ================================
   LOAD EXISTING USERS OR CREATE EMPTY
================================ */
let users = JSON.parse(localStorage.getItem("users") || "{}");

/* ================================
   CREATE ACCOUNT
================================ */
document.getElementById("signupBtn").onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  if (users[email]) {
    alert("Account already exists");
    return;
  }

  users[email] = {
    email,
    password, // can hash later
    name: email.split("@")[0],
    joined: new Date().toISOString().slice(0,10),
    circles: [],
    items_shared: [],
    activity: []
  };

  localStorage.setItem("users", JSON.stringify(users));

  localStorage.setItem("logged_in", "true");
  localStorage.setItem("logged_in_user", email);

  window.location.href = "welcome.html";
};

/* ================================
   LOGIN
================================ */
document.getElementById("loginBtn").onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!users[email] || users[email].password !== password) {
    alert("Incorrect email or password");
    return;
  }

  localStorage.setItem("logged_in", "true");
  localStorage.setItem("logged_in_user", email);

  window.location.href = "dashboard.html";
};
