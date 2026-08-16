// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const siteNav = document.querySelector(".site-nav");

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", isOpen);
});

// Close mobile nav after clicking a link
document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Contact email — built at runtime rather than written in the HTML/markup,
// so basic scrapers that just read the raw page source don't pick it up
// as easily. Not bulletproof (a scraper that runs JS can still find it),
// but it stops the majority of simple email-harvesting bots.
const emailUser = "christopherhendee01";
const emailDomain = "gmail.com";
const contactLink = document.getElementById("contactEmail");

if (contactLink) {
  const email = emailUser + "@" + emailDomain;
  contactLink.setAttribute("href", "mailto:" + email);
  document.getElementById("contactEmailText").textContent = email;
}
