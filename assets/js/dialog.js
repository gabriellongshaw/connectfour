// Get the dialog and close button elements from the DOM
const settingsModal = document.getElementById('modal');
const closeButton = settingsModal ? settingsModal.querySelector('.button.primary-button') : null;
const backdrop = document.getElementById('backdrop');

function _openDialogInternal() {
  if (!settingsModal || !backdrop) {
    console.error("Required elements not found.");
    return;
  }
  
  // Display the backdrop and dialog
  backdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
  });

  // Check if the dialog is not already open before showing it
  if (!settingsModal.open) {
    settingsModal.showModal();
    // Use requestAnimationFrame to apply the 'open' class after showModal()
    requestAnimationFrame(() => {
      settingsModal.classList.add('open');
      settingsModal.classList.remove('closing');
    });
  }
}

function _closeDialogInternal() {
  if (!settingsModal || !backdrop) {
    console.error("Required elements not found.");
    return;
  }
  
  // Add 'closing' class to trigger the CSS animation
  settingsModal.classList.remove('open');
  settingsModal.classList.add('closing');
  backdrop.classList.remove('show');
  
  // Wait for the animation to finish before closing the dialog
  setTimeout(() => {
    settingsModal.close();
    backdrop.classList.add('hidden');
    settingsModal.classList.remove('closing');
  }, 250); // The timeout duration should match the CSS transition duration
}

// Open the dialog on page load
document.addEventListener('DOMContentLoaded', () => {
  _openDialogInternal();
});

// Close the dialog when the close button is clicked
if (closeButton) {
  closeButton.addEventListener('click', _closeDialogInternal);
}
