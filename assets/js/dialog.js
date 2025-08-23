document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('close-modal');
  
  if (modal && typeof modal.showModal === 'function') {
    
    modal.showModal();
    
    setTimeout(() => {
      modal.classList.add('open');
    }, 10);
    
    closeModalBtn.addEventListener('click', () => {
      
      modal.classList.add('closing');
      modal.classList.remove('open');
      
      modal.addEventListener('transitionend', () => {
        
        modal.close();
        modal.classList.remove('closing');
      }, { once: true });
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
        modal.classList.remove('open');
      }
    });
    
  } else {
    
    console.warn('The <dialog> element is not supported in this browser.');
    
  }
});