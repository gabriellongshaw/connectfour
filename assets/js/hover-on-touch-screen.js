document.querySelectorAll(".start-screen-button, .restart-btn, #leaveGameBtn, .back-button").forEach(button => {
  button.addEventListener("touchstart", (e) => {
    button.classList.add("hover");
  }, { passive: true });
  
  const removeHover = () => button.classList.remove("hover");
  
  button.addEventListener("touchend", removeHover, { passive: true });
  button.addEventListener("touchcancel", removeHover, { passive: true });
  button.addEventListener("touchmove", removeHover, { passive: true });
});