const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// Contact form handling: try serverless POST -> fallback to mailto/WhatsApp
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const sendWhatsappBtn = document.getElementById('sendWhatsapp');
  const statusEl = document.getElementById('formStatus');

  if (!form) return;

  const siteWhatsAppNumber = '16269443531'; // business WhatsApp number (international format, no '+')
  const siteEmail = 'abbasniaz89@gmail.com'; // email for contact

  const encode = (s) => encodeURIComponent(String(s || ''));

  async function fallbackSend(emailTarget, name, email, phone, message) {
    // fallback opens mail client addressed to emailTarget
    const subject = `Inquiry from ${name} — The Tasveer House`;
    const body = `Name: ${encode(name)}%0AEmail: ${encode(email)}%0APhone: ${encode(phone)}%0A%0AMessage:%0A${encode(message)}`;
    window.location.href = `mailto:${emailTarget}?subject=${encode(subject)}&body=${body}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const formObj = Object.fromEntries(fd.entries());

    const name = formObj.name || '';
    const email = formObj.email || '';
    const phone = formObj.phone || '';
    const method = formObj.method || 'email';
    const message = formObj.message || '';

    if (!name.trim() || !email.trim() || !message.trim()) {
      statusEl.textContent = 'Please fill name, email, and message before sending.';
      return;
    }

    statusEl.textContent = 'Sending...';

    // Try server endpoint first
    try {
      const resp = await fetch('/api/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formObj, page: window.location.href })
      });

      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json.issueUrl) {
        statusEl.innerHTML = `Thanks — your message has been received. <a href="${json.issueUrl}" target="_blank">View in inbox</a>`;
        form.reset();
        return;
      }

      // If server returned 4xx/5xx or missing issueUrl, fall back based on preferred method
      console.error('Server create-issue failed', resp.status, json);
      statusEl.textContent = 'Server submission failed; falling back to direct email/WhatsApp.';
    } catch (err) {
      console.error('Network/server error posting to /api/create-issue', err);
      statusEl.textContent = 'Server unreachable; falling back to direct email/WhatsApp.';
    }

    // Fallback behavior
    if (method === 'whatsapp') {
      const text = `Hi, my name is ${encode(name)}.%0AEmail: ${encode(email)}%0APhone: ${encode(phone)}%0A%0AMessage:%0A${encode(message)}`;
      const url = `https://wa.me/${siteWhatsAppNumber}?text=${text}`;
      window.open(url, '_blank');
      statusEl.textContent = 'Opening WhatsApp...';
      return;
    }

    // Default fallback: open mailto to your site email
    await fallbackSend(siteEmail, name, email, phone, message);
    statusEl.textContent = 'Opening your mail app...';
  });

  // Dedicated "Send via WhatsApp" button
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
      const url = `https://wa.me/${siteWhatsAppNumber}?text=${text}`;
      window.open(url, '_blank');
      statusEl.textContent = 'Opening WhatsApp...';
    });
  }
});
