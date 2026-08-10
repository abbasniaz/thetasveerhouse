const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// Contact form handling (client-side only)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const sendWhatsappBtn = document.getElementById('sendWhatsapp');
  const statusEl = document.getElementById('formStatus');

  if (!form) return;

  const siteWhatsAppNumber = '16269443531'; // business WhatsApp number (international format, no '+')
  const siteEmail = 'abbasniaz89@gmail.com'; // email for contact

  // Utility to URL-encode text for mailto / WhatsApp
  const encode = (s) => encodeURIComponent(String(s || ''));

  // When form is submitted: open mail client or WhatsApp depending on preferred method
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name') || '';
    const email = formData.get('email') || '';
    const phone = formData.get('phone') || '';
    const method = formData.get('method') || 'email';
    const message = formData.get('message') || '';

    // Simple client-side validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      statusEl.textContent = 'Please fill name, email, and message before sending.';
      return;
    }

    if (method === 'email') {
      const subject = `Inquiry from ${name} — The Tasveer House`;
      const body = `Name: ${encode(name)}%0AEmail: ${encode(email)}%0APhone: ${encode(phone)}%0A%0AMessage:%0A${encode(message)}`;
      // Open mail client addressed to site owner
      window.location.href = `mailto:${siteEmail}?subject=${encode(subject)}&body=${body}`;
      statusEl.textContent = 'Opening your mail app...';
      return;
    }

    if (method === 'whatsapp') {
      const text = `Hi, my name is ${encode(name)}.%0AEmail: ${encode(email)}%0APhone: ${encode(phone)}%0A%0AMessage:%0A${encode(message)}`;
      const waNumber = siteWhatsAppNumber;
      const url = `https://wa.me/${waNumber}?text=${text}`;
      window.open(url, '_blank');
      statusEl.textContent = 'Opening WhatsApp...';
      return;
    }

    statusEl.textContent = 'Message prepared. Please send using your email or WhatsApp.';
  });

  // Dedicated "Send via WhatsApp" button: open WhatsApp with the form contents
  if (sendWhatsappBtn) {
    sendWhatsappBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = form.querySelector('#name')?.value || '';
      const email = form.querySelector('#email')?.value || '';
      const phone = form.querySelector('#phone')?.value || '';
      const message = form.querySelector('#message')?.value || '';

      if (!name.trim() || !message.trim()) {
        statusEl.textContent = 'Please enter your name and message before sending via WhatsApp.';
        return;
      }

      const text = `Hi, my name is ${encode(name)}.%0AEmail: ${encode(email)}%0APhone: ${encode(phone)}%0A%0AMessage:%0A${encode(message)}`;
      const waNumber = siteWhatsAppNumber;
      const url = `https://wa.me/${waNumber}?text=${text}`;
      window.open(url, '_blank');
      statusEl.textContent = 'Opening WhatsApp...';
    });
  }
});
