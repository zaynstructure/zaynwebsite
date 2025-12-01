// bottom-nav.js
if (localStorage.getItem("logged_in") === "true") {
  document.getElementById("bottomNavContainer").innerHTML = `
    <footer class="main-footer">
      <div class="footer-nav">
        <a href="dashboard.html">Home</a>
        <a href="circles.html">Circles</a>
        <a href="library.html">Borrow</a>
        <a href="free.html">Free</a>
        <a href="info.html">Info</a>
      </div>
    </footer>
  `;
}
