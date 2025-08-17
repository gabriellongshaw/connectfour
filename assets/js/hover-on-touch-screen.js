document.querySelectorAll(".start-screen-button, .restart-btn, #leaveGameBtn, .back-button").forEach(button => {
  button.addEventListener("touchstart", () => {
    button.classList.add("hover");
  });
  button.addEventListener("touchend", () => {
    button.classList.remove("hover");
  });
  button.addEventListener("touchcancel", () => {
    button.classList.remove("hover");
  });
});