// ═══════════════════════════════════════════════════════════════════════════════
// New Job Pal - Main Application JavaScript (ES Module)
// Your AI-powered career companion
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = '';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────────────────────

let currentJobId = null;
let jobsCache = [];
let profileSkills = [];
let profileCertifications = [];
let modalConfirmCallback = null;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch wrapper that adds JSON headers and handles errors.
 */
async function api(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for requests without a body
  if (!config.body) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${path}`, config);

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // response body is not JSON, use default message
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Show a toast notification.
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger reflow for animation
  toast.offsetHeight;
  toast.classList.add('toast-visible');

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback removal if transition doesn't fire
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 500);
  }, 3000);
}

/**
 * Show the loading overlay with custom text.
 */
function showLoading(text = 'Working on it...') {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = overlay.querySelector('.loading-text');
  loadingText.textContent = text;
  overlay.hidden = false;
}

/**
 * Hide the loading overlay.
 */
function hideLoading() {
  document.getElementById('loading-overlay').hidden = true;
}

/**
 * Show a confirmation modal with custom content.
 */
function showModal(title, bodyHtml, onConfirm) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalConfirmCallback = onConfirm;
  modal.hidden = false;
}

/**
 * Close the modal.
 */
function closeModal() {
  document.getElementById('modal').hidden = true;
  modalConfirmCallback = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Navigate to a page by its ID. Handles nav highlighting and page visibility.
 */
function navigateTo(pageId) {
  // Remove active from all nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');
  });

  // Remove active from all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Activate the target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Activate the corresponding nav item (job-detail has no nav item)
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) {
    navItem.classList.add('active');
    navItem.setAttribute('aria-current', 'page');
  }

  // Update URL hash (skip job-detail to keep clean URLs)
  if (pageId !== 'job-detail') {
    window.location.hash = pageId;
  }

  // Scroll to top
  document.getElementById('main-content').scrollTo(0, 0);

  // Trigger page-specific loaders
  switch (pageId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'profile':
      loadProfile();
      break;
    case 'writing-samples':
      loadWritingSamples();
      break;
    case 'jobs':
      loadJobs();
      break;
    case 'contacts':
      loadContacts();
      break;
  }
}

function setupNavigation() {
  // Sidebar nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      navigateTo(pageId);
    });
  });

  // Quick action buttons on dashboard
  const quickAddJob = document.getElementById('quick-add-job');
  const quickSearchJobs = document.getElementById('quick-search-jobs');
  const quickUpdateProfile = document.getElementById('quick-update-profile');

  if (quickAddJob) {
    quickAddJob.addEventListener('click', () => navigateTo('jobs'));
  }
  if (quickSearchJobs) {
    quickSearchJobs.addEventListener('click', () => navigateTo('headhunter'));
  }
  if (quickUpdateProfile) {
    quickUpdateProfile.addEventListener('click', () => navigateTo('profile'));
  }

  // Initial page from hash or default
  const hash = window.location.hash.replace('#', '');
  const validPages = ['dashboard', 'profile', 'writing-samples', 'jobs', 'headhunter', 'contacts'];
  if (hash && validPages.includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('dashboard');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const INSPIRATIONAL_QUOTES = [
  { text: 'Every artist was first an amateur.', author: 'Ralph Waldo Emerson' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Creativity takes courage.', author: 'Henri Matisse' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Have no fear of perfection -- you\'ll never reach it.', author: 'Salvador Dali' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'The details are not the details. They make the design.', author: 'Charles Eames' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Inspiration exists, but it has to find you working.', author: 'Pablo Picasso' },
  { text: 'Your career is a canvas. Each day, you add a new stroke.', author: 'New Job Pal' },
];

const SKETCH_NOTES = [
  "You're doing great. Every application is a step forward.",
  "Remember: the right job is looking for you too.",
  "Take a breath. Good things take time.",
  "Your unique skills are your superpower.",
  "Progress, not perfection. Keep going!",
  "Today's effort is tomorrow's opportunity.",
  "You're building something beautiful here.",
  "Every 'no' brings you closer to a 'yes'.",
];

async function loadDashboard() {
  // Set greeting based on time of day
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) {
    greeting = 'Good morning -- let\'s sketch out your next chapter';
  } else if (hour < 17) {
    greeting = 'Good afternoon -- let\'s keep the ink flowing';
  } else {
    greeting = 'Good evening -- let\'s draft something great';
  }
  const greetingEl = document.querySelector('.welcome-greeting');
  if (greetingEl) {
    greetingEl.textContent = greeting;
  }

  // Cycle inspiration quote
  cycleInspiration();

  // Cycle sketch note
  const sketchNoteText = document.getElementById('sketch-note-text');
  if (sketchNoteText) {
    sketchNoteText.textContent = SKETCH_NOTES[Math.floor(Math.random() * SKETCH_NOTES.length)];
  }

  // Fetch jobs for stats
  try {
    const jobs = await api('/api/jobs');
    jobsCache = jobs || [];

    // Total jobs
    const statJobs = document.querySelector('#stat-jobs .stat-number');
    if (statJobs) statJobs.textContent = jobsCache.length;

    // Applied
    const applied = jobsCache.filter(j => j.status === 'applied').length;
    const statApplied = document.querySelector('#stat-applied .stat-number');
    if (statApplied) statApplied.textContent = applied;

    // Average match score
    const jobsWithScore = jobsCache.filter(j => j.matchScore != null && j.matchScore !== undefined);
    const avgScore = jobsWithScore.length > 0
      ? Math.round(jobsWithScore.reduce((sum, j) => sum + j.matchScore, 0) / jobsWithScore.length)
      : 0;
    const statMatch = document.querySelector('#stat-match .stat-number');
    if (statMatch) statMatch.textContent = `${avgScore}%`;

    // Interviewing
    const interviewing = jobsCache.filter(j => j.status === 'interviewing').length;
    const statInterviews = document.querySelector('#stat-interviews .stat-number');
    if (statInterviews) statInterviews.textContent = interviewing;

    // Recent activity
    renderRecentActivity(jobsCache);
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

function renderRecentActivity(jobs) {
  const container = document.getElementById('recent-activity');
  if (!container) return;

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9998;</span>
        <p>No recent activity yet. Start by adding a job or updating your profile!</p>
      </div>`;
    return;
  }

  // Sort by updatedAt descending, take last 5
  const sorted = [...jobs]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 5);

  container.innerHTML = sorted.map(job => {
    const date = new Date(job.updatedAt || job.createdAt);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <div class="activity-item">
        <span class="activity-icon" aria-hidden="true">&#9744;</span>
        <div class="activity-info">
          <p class="activity-text"><strong>${escapeHtml(job.title || 'Untitled')}</strong> at ${escapeHtml(job.company || 'Unknown')} - <em>${escapeHtml(job.status || 'saved')}</em></p>
          <time class="activity-date">${dateStr}</time>
        </div>
      </div>`;
  }).join('');
}

function cycleInspiration() {
  const container = document.getElementById('daily-inspiration');
  if (!container) return;

  const quote = INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
  container.innerHTML = `
    <blockquote class="inspiration-quote">
      <p>"${escapeHtml(quote.text)}"</p>
      <cite>- ${escapeHtml(quote.author)}</cite>
    </blockquote>
    <div class="inspiration-decoration" aria-hidden="true">&mdash; &#8226; &mdash;</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE MODULE
// ═══════════════════════════════════════════════════════════════════════════════

async function loadProfile() {
  try {
    const profile = await api('/api/profile');
    if (!profile) return;

    // Populate basic fields
    setVal('profile-name', profile.name);
    setVal('profile-email', profile.email);
    setVal('profile-phone', profile.phone);
    setVal('profile-location', profile.location);
    setVal('profile-title', profile.title);
    setVal('profile-summary', profile.summary);
    setVal('profile-linkedin', profile.links?.linkedin);
    setVal('profile-portfolio', profile.links?.portfolio);
    setVal('profile-github', profile.links?.github);

    // Skills
    profileSkills = Array.isArray(profile.skills) ? [...profile.skills] : [];
    renderSkillTags();

    // Certifications
    profileCertifications = Array.isArray(profile.certifications) ? [...profile.certifications] : [];
    renderCertTags();

    // Experience
    const expList = document.getElementById('profile-experience-list');
    if (expList) {
      expList.innerHTML = '';
      if (Array.isArray(profile.experience)) {
        profile.experience.forEach(exp => addExperienceEntry(exp));
      }
    }

    // Education
    const eduList = document.getElementById('profile-education-list');
    if (eduList) {
      eduList.innerHTML = '';
      if (Array.isArray(profile.education)) {
        profile.education.forEach(edu => addEducationEntry(edu));
      }
    }

    // Load templates
    loadTemplates();
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

// ── Skills ──

function renderSkillTags() {
  const container = document.getElementById('profile-skills-tags');
  if (!container) return;
  container.innerHTML = profileSkills.map((skill, i) => `
    <span class="tag" role="listitem">
      ${escapeHtml(skill)}
      <button type="button" class="tag-remove" data-index="${i}" aria-label="Remove ${escapeHtml(skill)}">&times;</button>
    </span>`).join('');

  // Attach remove listeners
  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      profileSkills.splice(idx, 1);
      renderSkillTags();
    });
  });
}

function setupSkillInput() {
  const input = document.getElementById('profile-skill-input');
  const addBtn = document.getElementById('profile-add-skill');

  function addSkill() {
    const val = input.value.trim();
    if (val && !profileSkills.includes(val)) {
      profileSkills.push(val);
      renderSkillTags();
    }
    input.value = '';
    input.focus();
  }

  if (addBtn) addBtn.addEventListener('click', addSkill);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkill();
      }
    });
  }
}

// ── Certifications ──

function renderCertTags() {
  const container = document.getElementById('profile-certs-tags');
  if (!container) return;
  container.innerHTML = profileCertifications.map((cert, i) => `
    <span class="tag" role="listitem">
      ${escapeHtml(cert)}
      <button type="button" class="tag-remove" data-index="${i}" aria-label="Remove ${escapeHtml(cert)}">&times;</button>
    </span>`).join('');

  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      profileCertifications.splice(idx, 1);
      renderCertTags();
    });
  });
}

function setupCertInput() {
  const input = document.getElementById('profile-cert-input');
  const addBtn = document.getElementById('profile-add-cert');

  function addCert() {
    const val = input.value.trim();
    if (val && !profileCertifications.includes(val)) {
      profileCertifications.push(val);
      renderCertTags();
    }
    input.value = '';
    input.focus();
  }

  if (addBtn) addBtn.addEventListener('click', addCert);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCert();
      }
    });
  }
}

// ── Experience ──

function addExperienceEntry(data = {}) {
  const template = document.getElementById('experience-template');
  const list = document.getElementById('profile-experience-list');
  if (!template || !list) return;

  const clone = template.content.cloneNode(true);
  const entry = clone.querySelector('.experience-entry');

  // Populate fields if data provided
  if (data.company) entry.querySelector('[name="experience-company"]').value = data.company;
  if (data.title) entry.querySelector('[name="experience-title"]').value = data.title;
  if (data.startDate) entry.querySelector('[name="experience-start"]').value = data.startDate;
  if (data.endDate) entry.querySelector('[name="experience-end"]').value = data.endDate;
  if (data.current) entry.querySelector('[name="experience-current"]').checked = true;
  if (data.description) entry.querySelector('[name="experience-description"]').value = data.description;

  // Field tags for this entry
  const fieldTags = Array.isArray(data.fields) ? [...data.fields] : [];
  const tagsContainer = entry.querySelector('.experience-field-tags');
  const fieldInput = entry.querySelector('[name="experience-field-input"]');
  const addFieldBtn = entry.querySelector('.btn--add-field-tag');

  function renderFieldTags() {
    tagsContainer.innerHTML = fieldTags.map((tag, i) => `
      <span class="tag" role="listitem">
        ${escapeHtml(tag)}
        <button type="button" class="tag-remove" data-index="${i}" aria-label="Remove ${escapeHtml(tag)}">&times;</button>
      </span>`).join('');

    tagsContainer.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        fieldTags.splice(parseInt(btn.dataset.index, 10), 1);
        renderFieldTags();
      });
    });
  }

  function addFieldTag() {
    const val = fieldInput.value.trim();
    if (val && !fieldTags.includes(val)) {
      fieldTags.push(val);
      renderFieldTags();
    }
    fieldInput.value = '';
    fieldInput.focus();
  }

  if (addFieldBtn) addFieldBtn.addEventListener('click', addFieldTag);
  if (fieldInput) {
    fieldInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFieldTag();
      }
    });
  }

  // Store field tags reference on the entry element for collection later
  entry._fieldTags = fieldTags;

  // Remove button
  const removeBtn = entry.querySelector('.btn--remove-entry');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => entry.remove());
  }

  renderFieldTags();
  list.appendChild(entry);
}

function setupExperienceButton() {
  const btn = document.getElementById('profile-add-experience');
  if (btn) {
    btn.addEventListener('click', () => addExperienceEntry());
  }
}

// ── Education ──

function addEducationEntry(data = {}) {
  const template = document.getElementById('education-template');
  const list = document.getElementById('profile-education-list');
  if (!template || !list) return;

  const clone = template.content.cloneNode(true);
  const entry = clone.querySelector('.education-entry');

  if (data.institution) entry.querySelector('[name="education-institution"]').value = data.institution;
  if (data.degree) entry.querySelector('[name="education-degree"]').value = data.degree;
  if (data.field) entry.querySelector('[name="education-field"]').value = data.field;
  if (data.year) entry.querySelector('[name="education-year"]').value = data.year;

  const removeBtn = entry.querySelector('.btn--remove-entry');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => entry.remove());
  }

  list.appendChild(entry);
}

function setupEducationButton() {
  const btn = document.getElementById('profile-add-education');
  if (btn) {
    btn.addEventListener('click', () => addEducationEntry());
  }
}

// ── Resume Upload ──

function setupResumeUpload() {
  const form = document.getElementById('resume-upload-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('resume-file-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please select a resume file to upload.', 'error');
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('resume', file);

    try {
      showLoading('Parsing your resume...');

      const response = await fetch(`${API_BASE}/api/resume/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // not JSON
        }
        throw new Error(errorMessage);
      }

      const parsed = await response.json();
      hideLoading();

      // Populate basic fields
      if (parsed.name) setVal('profile-name', parsed.name);
      if (parsed.email) setVal('profile-email', parsed.email);
      if (parsed.phone) setVal('profile-phone', parsed.phone);
      if (parsed.location) setVal('profile-location', parsed.location);
      if (parsed.title) setVal('profile-title', parsed.title);
      if (parsed.summary) setVal('profile-summary', parsed.summary);

      // Links
      if (parsed.links) {
        if (parsed.links.linkedin) setVal('profile-linkedin', parsed.links.linkedin);
        if (parsed.links.portfolio) setVal('profile-portfolio', parsed.links.portfolio);
        if (parsed.links.github) setVal('profile-github', parsed.links.github);
      }

      // Skills
      if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
        profileSkills = [...parsed.skills];
        renderSkillTags();
      }

      // Certifications
      if (Array.isArray(parsed.certifications) && parsed.certifications.length > 0) {
        profileCertifications = [...parsed.certifications];
        renderCertTags();
      }

      // Experience
      if (Array.isArray(parsed.experience) && parsed.experience.length > 0) {
        const expList = document.getElementById('profile-experience-list');
        if (expList) expList.innerHTML = '';
        parsed.experience.forEach(exp => addExperienceEntry(exp));
      }

      // Education
      if (Array.isArray(parsed.education) && parsed.education.length > 0) {
        const eduList = document.getElementById('profile-education-list');
        if (eduList) eduList.innerHTML = '';
        parsed.education.forEach(edu => addEducationEntry(edu));
      }

      showToast('Resume parsed! Review your profile below and click Save when ready.', 'success');

      // Scroll to the form so the user can review
      document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      hideLoading();
      showToast(`Failed to parse resume: ${err.message}`, 'error');
    }
  });
}

// ── Document Templates ──

async function loadTemplates() {
  try {
    const templates = await api('/api/templates');
    renderTemplateStatus('resume', templates);
    renderTemplateStatus('cover-letter', templates);
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function renderTemplateStatus(type, templates) {
  const container = document.getElementById(`template-status-${type}`);
  if (!container) return;

  const template = templates.find(t => t.type === type);
  if (template) {
    container.innerHTML = `
      <div class="template-active">
        <span class="template-active-icon" aria-hidden="true">&#10003;</span>
        <span class="template-active-name">${escapeHtml(template.originalName)}</span>
        <button type="button" class="btn btn--danger btn--small template-remove-btn" data-id="${template.id}" aria-label="Remove template">Remove</button>
      </div>`;
    container.querySelector('.template-remove-btn')?.addEventListener('click', async () => {
      try {
        await api(`/api/templates/${template.id}`, { method: 'DELETE' });
        showToast('Template removed.', 'success');
        loadTemplates();
      } catch (err) {
        showToast(`Failed to remove template: ${err.message}`, 'error');
      }
    });
  } else {
    container.innerHTML = '<p class="template-empty-text">No template uploaded</p>';
  }
}

function setupTemplateUpload() {
  document.querySelectorAll('.template-upload-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = form.dataset.type;
      const fileInput = form.querySelector('.template-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a .docx file.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('template', fileInput.files[0]);
      formData.append('type', type);

      try {
        showLoading('Uploading template...');
        const response = await fetch(`${API_BASE}/api/templates/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `Upload failed (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch { /* not JSON */ }
          throw new Error(errorMessage);
        }

        hideLoading();
        showToast('Template uploaded!', 'success');
        fileInput.value = '';
        loadTemplates();
      } catch (err) {
        hideLoading();
        showToast(`Failed to upload template: ${err.message}`, 'error');
      }
    });
  });
}

// ── Document History ──

async function loadDocumentHistory(jobId) {
  const container = document.getElementById('documents-list');
  if (!container) return;

  try {
    const [resumes, coverLetters] = await Promise.all([
      api('/api/resumes'),
      api('/api/cover-letters'),
    ]);

    const jobResumes = (resumes || []).filter(r => r.jobId === jobId);
    const jobCoverLetters = (coverLetters || []).filter(cl => cl.jobId === jobId);

    if (jobResumes.length === 0 && jobCoverLetters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon" aria-hidden="true">&#9999;</span>
          <p>No documents generated yet. Generate a resume or cover letter first.</p>
        </div>`;
      return;
    }

    let html = '';

    jobResumes.forEach(r => {
      const date = new Date(r.updatedAt || r.createdAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const txtBtn = `<button type="button" class="btn btn--secondary btn--small doc-download-txt" data-type="resume" data-id="${r.id}">Download .txt</button>`;
      const docxBtn = r.docxPath
        ? `<a href="${API_BASE}/api/generated/${r.id}/download" class="btn btn--primary btn--small" download>Download .docx</a>`
        : '';
      html += `
        <div class="document-row">
          <span class="document-type-badge document-type-badge--resume">Resume</span>
          <span class="document-info">${escapeHtml(r.company || '')} &mdash; ${dateStr}</span>
          <div class="document-actions">${txtBtn} ${docxBtn}</div>
        </div>`;
    });

    jobCoverLetters.forEach(cl => {
      const date = new Date(cl.updatedAt || cl.createdAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const txtBtn = `<button type="button" class="btn btn--secondary btn--small doc-download-txt" data-type="cover-letter" data-id="${cl.id}">Download .txt</button>`;
      const docxBtn = cl.docxPath
        ? `<a href="${API_BASE}/api/generated/${cl.id}/download" class="btn btn--primary btn--small" download>Download .docx</a>`
        : '';
      html += `
        <div class="document-row">
          <span class="document-type-badge document-type-badge--cover">Cover Letter</span>
          <span class="document-info">${escapeHtml(cl.company || '')} &mdash; ${dateStr}</span>
          <div class="document-actions">${txtBtn} ${docxBtn}</div>
        </div>`;
    });

    container.innerHTML = html;

    // Attach txt download listeners
    container.querySelectorAll('.doc-download-txt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        try {
          let entry;
          if (type === 'resume') {
            const resumes = await api('/api/resumes');
            entry = resumes.find(r => r.id === id);
            if (entry) downloadAsFile(entry.resume || '', `resume-${(entry.company || 'document').replace(/[^a-zA-Z0-9]/g, '-')}.txt`);
          } else {
            const cls = await api('/api/cover-letters');
            entry = cls.find(cl => cl.id === id);
            if (entry) downloadAsFile(entry.coverLetter || '', `cover-letter-${(entry.company || 'document').replace(/[^a-zA-Z0-9]/g, '-')}.txt`);
          }
        } catch (err) {
          showToast(`Download failed: ${err.message}`, 'error');
        }
      });
    });
  } catch (err) {
    console.error('Failed to load document history:', err);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9999;</span>
        <p>Failed to load document history.</p>
      </div>`;
  }
}

// ── Profile Save ──

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect basic fields
    const profile = {
      name: document.getElementById('profile-name')?.value || '',
      email: document.getElementById('profile-email')?.value || '',
      phone: document.getElementById('profile-phone')?.value || '',
      location: document.getElementById('profile-location')?.value || '',
      title: document.getElementById('profile-title')?.value || '',
      summary: document.getElementById('profile-summary')?.value || '',
      skills: [...profileSkills],
      certifications: [...profileCertifications],
      links: {
        linkedin: document.getElementById('profile-linkedin')?.value || '',
        portfolio: document.getElementById('profile-portfolio')?.value || '',
        github: document.getElementById('profile-github')?.value || '',
      },
      experience: [],
      education: [],
    };

    // Collect experience entries
    document.querySelectorAll('#profile-experience-list .experience-entry').forEach(entry => {
      profile.experience.push({
        company: entry.querySelector('[name="experience-company"]')?.value || '',
        title: entry.querySelector('[name="experience-title"]')?.value || '',
        startDate: entry.querySelector('[name="experience-start"]')?.value || '',
        endDate: entry.querySelector('[name="experience-end"]')?.value || '',
        current: entry.querySelector('[name="experience-current"]')?.checked || false,
        description: entry.querySelector('[name="experience-description"]')?.value || '',
        fields: entry._fieldTags ? [...entry._fieldTags] : [],
      });
    });

    // Collect education entries
    document.querySelectorAll('#profile-education-list .education-entry').forEach(entry => {
      profile.education.push({
        institution: entry.querySelector('[name="education-institution"]')?.value || '',
        degree: entry.querySelector('[name="education-degree"]')?.value || '',
        field: entry.querySelector('[name="education-field"]')?.value || '',
        year: entry.querySelector('[name="education-year"]')?.value || '',
      });
    });

    try {
      await api('/api/profile', {
        method: 'POST',
        body: JSON.stringify(profile),
      });
      showToast('Profile saved successfully!', 'success');
    } catch (err) {
      showToast(`Failed to save profile: ${err.message}`, 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITING SAMPLES MODULE
// ═══════════════════════════════════════════════════════════════════════════════

async function loadWritingSamples() {
  try {
    const samples = await api('/api/writing-samples');
    renderWritingSamples(samples || []);
  } catch (err) {
    console.error('Failed to load writing samples:', err);
  }
}

function renderWritingSamples(samples) {
  const container = document.getElementById('samples-list');
  if (!container) return;

  if (!samples || samples.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9999;</span>
        <p>No writing samples yet. Add your first sample above to help New Job Pal learn your voice!</p>
      </div>`;
    return;
  }

  container.innerHTML = samples.map(sample => {
    const date = new Date(sample.createdAt || Date.now());
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const preview = (sample.content || '').substring(0, 150) + ((sample.content || '').length > 150 ? '...' : '');
    return `
      <article class="sample-card" data-id="${sample._id || sample.id}">
        <div class="sample-card-header">
          <h4 class="sample-title">${escapeHtml(sample.title || 'Untitled')}</h4>
          <span class="badge badge--type">${escapeHtml(sample.type || 'other')}</span>
        </div>
        <p class="sample-preview">${escapeHtml(preview)}</p>
        <div class="sample-card-footer">
          <time class="sample-date">${dateStr}</time>
          <button type="button" class="btn btn--danger btn--small btn--delete-sample" data-id="${sample._id || sample.id}" aria-label="Delete sample">
            Delete
          </button>
        </div>
      </article>`;
  }).join('');

  // Attach delete listeners
  container.querySelectorAll('.btn--delete-sample').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await api(`/api/writing-samples/${id}`, { method: 'DELETE' });
        showToast('Writing sample deleted.', 'success');
        loadWritingSamples();
      } catch (err) {
        showToast(`Failed to delete sample: ${err.message}`, 'error');
      }
    });
  });
}

function setupWritingSampleForm() {
  const form = document.getElementById('writing-sample-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('sample-title')?.value || '';
    const type = document.getElementById('sample-type')?.value || '';
    let content = document.getElementById('sample-content')?.value || '';

    const fileInput = document.getElementById('sample-file');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      try {
        content = await readFileAsText(fileInput.files[0]);
      } catch (err) {
        showToast('Failed to read file. Please paste the content instead.', 'error');
        return;
      }
    }

    if (!title || !content) {
      showToast('Please provide a title and content.', 'error');
      return;
    }

    try {
      await api('/api/writing-samples', {
        method: 'POST',
        body: JSON.stringify({ title, type, content }),
      });
      showToast('Writing sample added!', 'success');
      form.reset();
      loadWritingSamples();
    } catch (err) {
      showToast(`Failed to add sample: ${err.message}`, 'error');
    }
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOBS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

async function loadJobs() {
  try {
    const jobs = await api('/api/jobs');
    jobsCache = jobs || [];
    applyJobsFilterAndSort();
  } catch (err) {
    console.error('Failed to load jobs:', err);
    renderJobsList([]);
  }
}

function applyJobsFilterAndSort() {
  let jobs = [...jobsCache];

  // Filter by status
  const filterStatus = document.getElementById('jobs-filter-status')?.value || 'all';
  if (filterStatus !== 'all') {
    jobs = jobs.filter(j => j.status === filterStatus);
  }

  // Sort
  const sortBy = document.getElementById('jobs-sort')?.value || 'newest';
  switch (sortBy) {
    case 'newest':
      jobs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case 'match':
      jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      break;
    case 'company':
      jobs.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
      break;
  }

  // Starred jobs always float to top
  jobs.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));

  renderJobsList(jobs);
}

const STATUS_COLORS = {
  saved: 'lavender',
  applied: 'sage',
  interviewing: 'honey',
  offer: 'rose',
  rejected: 'coral',
  withdrawn: 'muted',
};

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return '';
  const type = job.salaryType || 'hourly';
  const suffix = type === 'annual' ? '/yr' : '/hr';
  const fmt = (n) => {
    if (!n) return '';
    if (type === 'annual' && n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${Number(n).toLocaleString()}`;
  };
  const min = fmt(job.salaryMin);
  const max = fmt(job.salaryMax);
  if (min && max) return `${min} - ${max} ${suffix}`;
  if (min) return `${min}+ ${suffix}`;
  if (max) return `Up to ${max} ${suffix}`;
  return '';
}

function renderJobsList(jobs) {
  const container = document.getElementById('jobs-list');
  if (!container) return;

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9744;</span>
        <p>No jobs saved yet. Add your first opportunity using the button above!</p>
      </div>`;
    return;
  }

  container.innerHTML = jobs.map(job => {
    const id = job._id || job.id;
    const date = new Date(job.createdAt || Date.now());
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const status = job.status || 'saved';
    const colorClass = STATUS_COLORS[status] || 'lavender';
    const matchHtml = job.matchScore != null
      ? `<span class="job-card-match ${job.matchScore >= 70 ? 'match--green' : job.matchScore >= 40 ? 'match--yellow' : 'match--red'}">${job.matchScore}%</span>`
      : `<button type="button" class="job-card-run-match" data-id="${id}" title="Run Match Analysis">&#9678; Match</button>`;
    const salaryStr = formatSalary(job);
    const salaryHtml = salaryStr ? `<p class="job-card-salary">${escapeHtml(salaryStr)}</p>` : '';
    const starChar = job.starred ? '&#9733;' : '&#9734;';
    const starClass = job.starred ? 'starred' : '';

    return `
      <article class="job-card" data-id="${id}" tabindex="0" role="button" aria-label="View ${escapeHtml(job.title || 'Untitled')} at ${escapeHtml(job.company || 'Unknown')}">
        <button type="button" class="job-card-star ${starClass}" data-id="${id}" aria-label="Toggle favorite" title="Favorite">${starChar}</button>
        <div class="job-card-header">
          <h4 class="job-card-title">${escapeHtml(job.title || 'Untitled')}</h4>
          <span class="badge badge--status badge--${colorClass}">${escapeHtml(status)}</span>
        </div>
        <p class="job-card-company">${escapeHtml(job.company || 'Unknown Company')}</p>
        <p class="job-card-location">${escapeHtml(job.location || '')}</p>
        ${salaryHtml}
        <div class="job-card-footer">
          ${matchHtml}
          <time class="job-card-date">${dateStr}</time>
        </div>
      </article>`;
  }).join('');

  // Attach star toggle listeners
  container.querySelectorAll('.job-card-star').forEach(starBtn => {
    starBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = starBtn.dataset.id;
      try {
        const updated = await api(`/api/jobs/${id}/star`, { method: 'PUT' });
        const job = jobsCache.find(j => (j._id || j.id) === id);
        if (job) job.starred = updated.starred;
        applyJobsFilterAndSort();
      } catch (err) {
        showToast(`Failed to toggle star: ${err.message}`, 'error');
      }
    });
  });

  // Attach "Run Match" button listeners on cards
  container.querySelectorAll('.job-card-run-match').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      try {
        const result = await api(`/api/jobs/${id}/match`, { method: 'POST' });
        const score = result.score ?? result.matchScore ?? 0;
        const job = jobsCache.find(j => (j._id || j.id) === id);
        if (job) {
          job.matchScore = score;
          job.matchResults = result;
        }
        applyJobsFilterAndSort();
        showToast(`Match analysis complete: ${score}%`, 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '&#9678; Match';
        showToast(`Match analysis failed: ${err.message}`, 'error');
      }
    });
  });

  // Attach click listeners on cards
  container.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.job-card-star') || e.target.closest('.job-card-run-match')) return;
      const id = card.dataset.id;
      showJobDetail(id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showJobDetail(card.dataset.id);
      }
    });
  });
}

function setupJobsModule() {
  // Toggle add-job panel
  const toggleBtn = document.getElementById('toggle-add-job');
  const panel = document.getElementById('add-job-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
    });
  }

  // Tab switching in add-job-panel
  document.querySelectorAll('#add-job-panel .tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabName = tabBtn.dataset.tab;

      // Deactivate all tabs and panels in this context
      document.querySelectorAll('#add-job-panel .tab-btn').forEach(tb => {
        tb.classList.remove('active');
        tb.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('#add-job-panel .tab-panel').forEach(tp => {
        tp.classList.remove('active');
        tp.hidden = true;
      });

      // Activate selected
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(`panel-${tabName}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.hidden = false;
      }
    });
  });

  // Quick Add (URL extraction) form
  const urlForm = document.getElementById('job-url-form');
  if (urlForm) {
    urlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('job-url-input')?.value || '';

      if (!url.trim()) {
        showToast('Please enter a job posting URL.', 'error');
        return;
      }

      try {
        showLoading('Extracting job info from URL...');
        const parsed = await api('/api/jobs/extract-url', {
          method: 'POST',
          body: JSON.stringify({ url }),
        });
        hideLoading();

        // Save the extracted job
        const saved = await api('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(parsed),
        });

        showToast('Job added successfully!', 'success');
        urlForm.reset();
        panel.hidden = true;
        loadJobs();
      } catch (err) {
        hideLoading();
        showToast(`${err.message}`, 'error');
      }
    });
  }

  // Manual form
  const manualForm = document.getElementById('job-manual-form');
  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const salaryMinVal = document.getElementById('job-manual-salary-min')?.value;
      const salaryMaxVal = document.getElementById('job-manual-salary-max')?.value;
      const jobData = {
        title: document.getElementById('job-manual-title')?.value || '',
        company: document.getElementById('job-manual-company')?.value || '',
        location: document.getElementById('job-manual-location')?.value || '',
        type: document.getElementById('job-manual-type')?.value || '',
        salaryMin: salaryMinVal ? Number(salaryMinVal) : undefined,
        salaryMax: salaryMaxVal ? Number(salaryMaxVal) : undefined,
        salaryType: document.getElementById('job-manual-salary-type')?.value || '',
        url: document.getElementById('job-manual-url')?.value || '',
        description: document.getElementById('job-manual-description')?.value || '',
      };

      if (!jobData.title || !jobData.company) {
        showToast('Please provide at least a job title and company.', 'error');
        return;
      }

      try {
        await api('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(jobData),
        });
        showToast('Job added successfully!', 'success');
        manualForm.reset();
        panel.hidden = true;
        loadJobs();
      } catch (err) {
        showToast(`Failed to save job: ${err.message}`, 'error');
      }
    });
  }

  // Filter and sort
  const filterStatus = document.getElementById('jobs-filter-status');
  const sortSelect = document.getElementById('jobs-sort');
  if (filterStatus) filterStatus.addEventListener('change', applyJobsFilterAndSort);
  if (sortSelect) sortSelect.addEventListener('change', applyJobsFilterAndSort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB DETAIL MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function showJobDetail(jobId) {
  const job = jobsCache.find(j => (j._id || j.id) === jobId);
  if (!job) {
    showToast('Job not found.', 'error');
    return;
  }

  currentJobId = jobId;

  // Populate header
  const titleEl = document.querySelector('[data-bind="job-title"]');
  const companyEl = document.querySelector('[data-bind="job-company"]');
  const locationEl = document.querySelector('[data-bind="job-location"]');

  if (titleEl) titleEl.textContent = job.title || 'Untitled';
  if (companyEl) companyEl.textContent = job.company || '';
  if (locationEl) locationEl.textContent = job.location || '';

  // Salary
  const salaryEl = document.getElementById('job-detail-salary');
  if (salaryEl) salaryEl.textContent = formatSalary(job);

  // Star
  const starBtn = document.getElementById('job-detail-star-btn');
  if (starBtn) {
    starBtn.innerHTML = `<span class="star-icon">${job.starred ? '&#9733;' : '&#9734;'}</span>`;
    starBtn.classList.toggle('starred', !!job.starred);
  }

  // Status select
  const statusSelect = document.getElementById('job-detail-status');
  if (statusSelect) statusSelect.value = job.status || 'saved';

  // Description
  const descEl = document.getElementById('job-detail-description');
  if (descEl) {
    descEl.innerHTML = job.description
      ? `<p>${escapeHtml(job.description).replace(/\n/g, '<br>')}</p>`
      : '<p class="text-muted">No description available.</p>';
  }

  // Requirements
  const reqList = document.getElementById('job-requirements-list');
  const reqSection = document.getElementById('job-detail-requirements');
  if (reqList && reqSection) {
    if (Array.isArray(job.requirements) && job.requirements.length > 0) {
      reqList.innerHTML = job.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('');
      reqSection.hidden = false;
    } else {
      reqList.innerHTML = '';
      reqSection.hidden = true;
    }
  }

  // Nice to have
  const niceList = document.getElementById('job-nice-list');
  const niceSection = document.getElementById('job-detail-nice-to-have');
  if (niceList && niceSection) {
    if (Array.isArray(job.niceToHave) && job.niceToHave.length > 0) {
      niceList.innerHTML = job.niceToHave.map(n => `<li>${escapeHtml(n)}</li>`).join('');
      niceSection.hidden = false;
    } else {
      niceList.innerHTML = '';
      niceSection.hidden = true;
    }
  }

  // Job URL
  const urlEl = document.getElementById('job-detail-url');
  if (urlEl) {
    if (job.url) {
      urlEl.href = job.url;
      urlEl.hidden = false;
    } else {
      urlEl.hidden = true;
    }
  }

  // Notes
  const notesEl = document.getElementById('job-detail-notes');
  if (notesEl) notesEl.value = job.notes || '';

  // Reset match results and generated content
  const matchResults = document.getElementById('match-results');
  if (matchResults) matchResults.hidden = true;
  const runMatchBtn = document.getElementById('run-match-btn');
  if (runMatchBtn) {
    runMatchBtn.querySelector('.btn-icon').nextSibling.textContent = ' Run Match Analysis';
  }

  // Reset resume preview
  const resumePreview = document.getElementById('resume-preview');
  if (resumePreview) {
    resumePreview.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9999;</span>
        <p>Click "Generate Resume" to create a resume tailored for this position.</p>
      </div>`;
  }
  document.getElementById('copy-resume-btn')?.setAttribute('hidden', '');
  document.getElementById('download-resume-btn')?.setAttribute('hidden', '');
  document.getElementById('download-resume-docx-btn')?.setAttribute('hidden', '');

  // Reset cover letter preview
  const coverPreview = document.getElementById('cover-preview');
  if (coverPreview) {
    coverPreview.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9999;</span>
        <p>Click "Generate Cover Letter" to create a cover letter tailored for this position.</p>
      </div>`;
  }
  document.getElementById('copy-cover-btn')?.setAttribute('hidden', '');
  document.getElementById('download-cover-btn')?.setAttribute('hidden', '');
  document.getElementById('download-cover-docx-btn')?.setAttribute('hidden', '');

  // Reset to first tab (description)
  document.querySelectorAll('#job-detail .tab-btn').forEach(tb => {
    tb.classList.remove('active');
    tb.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('#job-detail .tab-panel').forEach(tp => {
    tp.classList.remove('active');
    tp.hidden = true;
  });
  const descTab = document.getElementById('jd-tab-description');
  const descPanel = document.getElementById('jd-panel-description');
  if (descTab) {
    descTab.classList.add('active');
    descTab.setAttribute('aria-selected', 'true');
  }
  if (descPanel) {
    descPanel.classList.add('active');
    descPanel.hidden = false;
  }

  // If the job already has match data, pre-populate
  if (job.matchScore != null && job.matchResults) {
    renderMatchResults(job.matchResults, job.matchScore);
  }

  navigateTo('job-detail');
}

function setupJobDetail() {
  // Back button
  const backBtn = document.getElementById('job-detail-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigateTo('jobs'));
  }

  // Star button in detail header
  const starBtn = document.getElementById('job-detail-star-btn');
  if (starBtn) {
    starBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      try {
        const updated = await api(`/api/jobs/${currentJobId}/star`, { method: 'PUT' });
        const job = jobsCache.find(j => (j._id || j.id) === currentJobId);
        if (job) job.starred = updated.starred;
        starBtn.innerHTML = `<span class="star-icon">${updated.starred ? '&#9733;' : '&#9734;'}</span>`;
        starBtn.classList.toggle('starred', !!updated.starred);
      } catch (err) {
        showToast(`Failed to toggle star: ${err.message}`, 'error');
      }
    });
  }

  // Status change
  const statusSelect = document.getElementById('job-detail-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', async () => {
      if (!currentJobId) return;
      try {
        await api(`/api/jobs/${currentJobId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: statusSelect.value }),
        });
        // Update cache
        const job = jobsCache.find(j => (j._id || j.id) === currentJobId);
        if (job) job.status = statusSelect.value;
        showToast('Status updated.', 'success');
      } catch (err) {
        showToast(`Failed to update status: ${err.message}`, 'error');
      }
    });
  }

  // Tab switching within job detail
  document.querySelectorAll('#job-detail .job-detail-tabs .tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabName = tabBtn.dataset.tab;

      document.querySelectorAll('#job-detail .job-detail-tabs .tab-btn').forEach(tb => {
        tb.classList.remove('active');
        tb.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('#job-detail .tab-panel').forEach(tp => {
        tp.classList.remove('active');
        tp.hidden = true;
      });

      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(`jd-panel-${tabName}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.hidden = false;
      }

      // Load document history when Documents tab is selected
      if (tabName === 'documents' && currentJobId) {
        loadDocumentHistory(currentJobId);
      }
      // Load mock interviews when Interview tab is selected
      if (tabName === 'interview' && currentJobId) {
        loadMockInterviews(currentJobId);
      }
    });
  });

  // Run match analysis
  const runMatchBtn = document.getElementById('run-match-btn');
  if (runMatchBtn) {
    runMatchBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      try {
        showLoading('Analyzing match...');
        const result = await api(`/api/jobs/${currentJobId}/match`, {
          method: 'POST',
        });
        hideLoading();

        const score = result.score ?? result.matchScore ?? 0;
        renderMatchResults(result, score);

        // Update cache
        const job = jobsCache.find(j => (j._id || j.id) === currentJobId);
        if (job) {
          job.matchScore = score;
          job.matchResults = result;
        }

        // Update button text
        const btnTextNode = runMatchBtn.childNodes;
        for (const node of btnTextNode) {
          if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('btn-icon'))) {
            // skip
          }
        }
        runMatchBtn.innerHTML = '<span class="btn-icon" aria-hidden="true">&#9678;</span> Re-run Analysis';
      } catch (err) {
        hideLoading();
        showToast(`Match analysis failed: ${err.message}`, 'error');
      }
    });
  }

  // Generate resume
  const genResumeBtn = document.getElementById('generate-resume-btn');
  if (genResumeBtn) {
    genResumeBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      try {
        showLoading('Tailoring resume...');
        const result = await api('/api/resume/tailor', {
          method: 'POST',
          body: JSON.stringify({ jobId: currentJobId }),
        });
        hideLoading();

        const resumeText = result.resume || result.content || result.text || JSON.stringify(result, null, 2);
        const preview = document.getElementById('resume-preview');
        if (preview) {
          preview.innerHTML = `<pre class="generated-text">${escapeHtml(resumeText)}</pre>`;
        }

        document.getElementById('copy-resume-btn')?.removeAttribute('hidden');
        document.getElementById('download-resume-btn')?.removeAttribute('hidden');

        // Show .docx download if template was used
        const docxBtn = document.getElementById('download-resume-docx-btn');
        if (docxBtn) {
          if (result.docxPath) {
            docxBtn.hidden = false;
            docxBtn.onclick = () => {
              window.location.href = `${API_BASE}/api/generated/${result.id}/download`;
            };
          } else {
            docxBtn.hidden = true;
          }
        }

        showToast('Resume generated!', 'success');
      } catch (err) {
        hideLoading();
        showToast(`Resume generation failed: ${err.message}`, 'error');
      }
    });
  }

  // Copy resume
  const copyResumeBtn = document.getElementById('copy-resume-btn');
  if (copyResumeBtn) {
    copyResumeBtn.addEventListener('click', () => {
      const text = document.querySelector('#resume-preview .generated-text')?.textContent || '';
      copyToClipboard(text, 'Resume copied to clipboard!');
    });
  }

  // Download resume
  const dlResumeBtn = document.getElementById('download-resume-btn');
  if (dlResumeBtn) {
    dlResumeBtn.addEventListener('click', () => {
      const text = document.querySelector('#resume-preview .generated-text')?.textContent || '';
      downloadAsFile(text, 'tailored-resume.txt');
    });
  }

  // Generate cover letter
  const genCoverBtn = document.getElementById('generate-cover-btn');
  if (genCoverBtn) {
    genCoverBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      try {
        showLoading('Writing cover letter...');
        const result = await api('/api/cover-letter/generate', {
          method: 'POST',
          body: JSON.stringify({ jobId: currentJobId }),
        });
        hideLoading();

        const coverText = result.coverLetter || result.content || result.text || JSON.stringify(result, null, 2);
        const preview = document.getElementById('cover-preview');
        if (preview) {
          preview.innerHTML = `<pre class="generated-text">${escapeHtml(coverText)}</pre>`;
        }

        document.getElementById('copy-cover-btn')?.removeAttribute('hidden');
        document.getElementById('download-cover-btn')?.removeAttribute('hidden');

        // Show .docx download if template was used
        const docxBtn = document.getElementById('download-cover-docx-btn');
        if (docxBtn) {
          if (result.docxPath) {
            docxBtn.hidden = false;
            docxBtn.onclick = () => {
              window.location.href = `${API_BASE}/api/generated/${result.id}/download`;
            };
          } else {
            docxBtn.hidden = true;
          }
        }

        showToast('Cover letter generated!', 'success');
      } catch (err) {
        hideLoading();
        showToast(`Cover letter generation failed: ${err.message}`, 'error');
      }
    });
  }

  // Copy cover letter
  const copyCoverBtn = document.getElementById('copy-cover-btn');
  if (copyCoverBtn) {
    copyCoverBtn.addEventListener('click', () => {
      const text = document.querySelector('#cover-preview .generated-text')?.textContent || '';
      copyToClipboard(text, 'Cover letter copied to clipboard!');
    });
  }

  // Download cover letter
  const dlCoverBtn = document.getElementById('download-cover-btn');
  if (dlCoverBtn) {
    dlCoverBtn.addEventListener('click', () => {
      const text = document.querySelector('#cover-preview .generated-text')?.textContent || '';
      downloadAsFile(text, 'cover-letter.txt');
    });
  }

  // Save notes
  const saveNotesBtn = document.getElementById('save-job-notes-btn');
  if (saveNotesBtn) {
    saveNotesBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      const notes = document.getElementById('job-detail-notes')?.value || '';
      try {
        await api(`/api/jobs/${currentJobId}`, {
          method: 'PUT',
          body: JSON.stringify({ notes }),
        });
        // Update cache
        const job = jobsCache.find(j => (j._id || j.id) === currentJobId);
        if (job) job.notes = notes;
        showToast('Notes saved.', 'success');
      } catch (err) {
        showToast(`Failed to save notes: ${err.message}`, 'error');
      }
    });
  }

  // Delete job
  const deleteJobBtn = document.getElementById('delete-job-btn');
  if (deleteJobBtn) {
    deleteJobBtn.addEventListener('click', () => {
      showModal(
        'Delete Job',
        '<p>Are you sure you want to delete this job? This action cannot be undone.</p>',
        async () => {
          try {
            await api(`/api/jobs/${currentJobId}`, { method: 'DELETE' });
            showToast('Job deleted.', 'success');
            currentJobId = null;
            closeModal();
            navigateTo('jobs');
          } catch (err) {
            showToast(`Failed to delete job: ${err.message}`, 'error');
            closeModal();
          }
        }
      );
    });
  }
}

function renderMatchResults(result, score) {
  const matchResults = document.getElementById('match-results');
  if (!matchResults) return;

  // Score
  const scoreValue = document.getElementById('match-score-value');
  const scoreCircle = document.getElementById('match-score-circle');
  if (scoreValue) scoreValue.textContent = `${score}%`;
  if (scoreCircle) {
    scoreCircle.classList.remove('match-score--green', 'match-score--yellow', 'match-score--red');
    if (score > 70) {
      scoreCircle.classList.add('match-score--green');
    } else if (score > 40) {
      scoreCircle.classList.add('match-score--yellow');
    } else {
      scoreCircle.classList.add('match-score--red');
    }
  }

  // Matching skills
  const matchingContainer = document.getElementById('match-skills-matching');
  const matchingSkills = result.matchingSkills || result.matching || [];
  if (matchingContainer) {
    matchingContainer.innerHTML = matchingSkills.map(skill =>
      `<span class="tag tag--match">${escapeHtml(skill)}</span>`
    ).join('') || '<p class="text-muted">No matching skills found.</p>';
  }

  // Skill gaps — clickable to add to profile
  const gapsContainer = document.getElementById('match-skills-gaps');
  const gapSkills = result.missingSkills || result.gaps || [];
  if (gapsContainer) {
    if (gapSkills.length > 0) {
      gapsContainer.innerHTML =
        '<p class="text-muted" style="font-size:0.78rem;margin-bottom:8px;font-style:italic;">Click a skill to add it to your profile</p>' +
        gapSkills.map(skill => {
          const alreadyHave = profileSkills.includes(skill);
          return alreadyHave
            ? `<span class="tag tag--added" title="Already in your profile">&#10003; ${escapeHtml(skill)}</span>`
            : `<button type="button" class="tag tag--gap tag--clickable" data-skill="${escapeHtml(skill)}" title="Click to add to your skills">+ ${escapeHtml(skill)}</button>`;
        }).join('');

      // Attach click listeners
      gapsContainer.querySelectorAll('.tag--clickable').forEach(btn => {
        btn.addEventListener('click', async () => {
          const skill = btn.dataset.skill;
          if (!skill || profileSkills.includes(skill)) return;

          profileSkills.push(skill);

          // Save to profile immediately
          try {
            const profile = await api('/api/profile');
            profile.skills = [...profileSkills];
            await api('/api/profile', {
              method: 'POST',
              body: JSON.stringify(profile),
            });
          } catch (err) {
            console.error('Failed to save skill to profile:', err);
          }

          // Update the tag visually
          btn.classList.remove('tag--gap', 'tag--clickable');
          btn.classList.add('tag--added');
          btn.disabled = true;
          btn.innerHTML = `&#10003; ${escapeHtml(skill)}`;
          btn.title = 'Added to your profile';

          showToast(`"${skill}" added to your skills!`, 'success');
        });
      });
    } else {
      gapsContainer.innerHTML = '<p class="text-muted">No skill gaps identified.</p>';
    }
  }

  // Recommendations
  const recsContainer = document.getElementById('match-recommendations');
  const recommendations = result.recommendations || [];
  if (recsContainer) {
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      recsContainer.innerHTML = `<ul class="recommendations-list">${
        recommendations.map(rec => `<li>${escapeHtml(rec)}</li>`).join('')
      }</ul>`;
    } else if (typeof recommendations === 'string') {
      recsContainer.innerHTML = `<p>${escapeHtml(recommendations)}</p>`;
    } else {
      recsContainer.innerHTML = '<p class="text-muted">No recommendations at this time.</p>';
    }
  }

  matchResults.hidden = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADHUNTER MODULE
// ═══════════════════════════════════════════════════════════════════════════════

async function loadCustomBoards() {
  const grid = document.getElementById('job-boards-grid');
  if (!grid) return;

  // Remove any previously rendered custom boards
  grid.querySelectorAll('.job-board-card--custom').forEach(el => el.remove());

  try {
    const boards = await api('/api/custom-boards');
    boards.forEach(board => {
      const card = document.createElement('a');
      card.href = board.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'job-board-card job-board-card--custom';
      card.dataset.id = board.id;
      card.innerHTML = `
        <button type="button" class="job-board-delete" title="Remove board">&times;</button>
        <span class="job-board-icon">&#9741;</span>
        <span class="job-board-name">${escapeHtml(board.name)}</span>
        ${board.description ? `<span class="job-board-desc">${escapeHtml(board.description)}</span>` : ''}
      `;
      grid.appendChild(card);

      // Delete handler
      card.querySelector('.job-board-delete').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await api(`/api/custom-boards/${board.id}`, { method: 'DELETE' });
          card.remove();
          showToast('Board removed', 'info');
        } catch (err) {
          showToast(`Failed to remove: ${err.message}`, 'error');
        }
      });
    });
  } catch {
    // silently fail — custom boards are optional
  }
}

function setupCustomBoardForm() {
  const addBtn = document.getElementById('add-board-btn');
  const form = document.getElementById('add-board-form');
  const cancelBtn = document.getElementById('cancel-board-btn');
  if (!addBtn || !form) return;

  addBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) document.getElementById('board-name').focus();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.hidden = true;
      form.reset();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('board-name').value.trim();
    const url = document.getElementById('board-url').value.trim();
    const description = document.getElementById('board-desc').value.trim();

    if (!name || !url) return;

    try {
      await api('/api/custom-boards', {
        method: 'POST',
        body: JSON.stringify({ name, url, description }),
      });
      form.reset();
      form.hidden = true;
      await loadCustomBoards();
      showToast(`${name} added to your boards`, 'success');
    } catch (err) {
      showToast(`Failed to add board: ${err.message}`, 'error');
    }
  });
}

function setupHeadhunter() {
  const form = document.getElementById('headhunter-form');
  if (!form) return;

  // Load custom boards and setup the add form
  loadCustomBoards();
  setupCustomBoardForm();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = document.getElementById('headhunter-query')?.value || '';
    const useProfile = document.getElementById('headhunter-use-profile')?.checked || false;

    if (!query.trim()) {
      showToast('Please enter a search query.', 'error');
      return;
    }

    try {
      showLoading('Searching for opportunities...');
      const result = await api('/api/headhunter/search', {
        method: 'POST',
        body: JSON.stringify({ query, useProfile }),
      });
      hideLoading();

      // Show results
      const resultsSection = document.getElementById('headhunter-results');
      if (resultsSection) resultsSection.hidden = false;

      renderHeadhunterResults(result);
    } catch (err) {
      hideLoading();
      showToast(`Search failed: ${err.message}`, 'error');
    }
  });
}

function renderHeadhunterResults(result) {
  // Strategy summary
  const summaryEl = document.getElementById('headhunter-summary');
  if (summaryEl) {
    summaryEl.textContent = result.summary || 'Search complete. See your personalized results below.';
  }

  // Recommended titles (clickable — opens LinkedIn search)
  const titlesContainer = document.getElementById('headhunter-titles');
  const titles = result.recommendedTitles || result.titles || result.jobTitles || [];
  if (titlesContainer) {
    if (titles.length > 0) {
      titlesContainer.innerHTML = titles.map(title => {
        const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`;
        return `<a href="${escapeHtml(linkedInUrl)}" target="_blank" rel="noopener noreferrer" class="tag tag--large tag--clickable">${escapeHtml(title)} &nearr;</a>`;
      }).join('');
    } else {
      document.getElementById('headhunter-titles-section').hidden = true;
    }
  }

  // Personalized search queries
  const queriesContainer = document.getElementById('headhunter-queries');
  const queries = result.searchQueries || result.queries || [];
  if (queriesContainer) {
    if (queries.length > 0) {
      queriesContainer.innerHTML = queries.map(q => {
        const platform = q.platform || q.site || 'Search';
        const queryText = q.query || q.text || '';
        const url = q.url || '#';
        return `
          <div class="headhunter-query-row">
            <span class="query-platform">${escapeHtml(platform)}</span>
            <span class="query-text">${escapeHtml(queryText)}</span>
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn--small btn--secondary">Search &nearr;</a>
          </div>`;
      }).join('');
    } else {
      document.getElementById('headhunter-queries-section').hidden = true;
    }
  }

  // Target companies
  const companiesContainer = document.getElementById('headhunter-companies');
  const companies = result.suggestedCompanies || result.companies || [];
  if (companiesContainer) {
    if (companies.length > 0) {
      companiesContainer.innerHTML = companies.map(company => {
        const name = company.name || 'Unknown';
        const reason = company.reason || company.description || '';
        const careerUrl = company.careerPageUrl || company.careerPage || company.careersUrl || '';
        const careerLink = careerUrl
          ? `<a href="${escapeHtml(careerUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--small btn--ghost">Careers Page &nearr;</a>`
          : '';
        return `
          <div class="headhunter-company-card">
            <h4 class="company-name">${escapeHtml(name)}</h4>
            <p class="company-reason">${escapeHtml(reason)}</p>
            ${careerLink}
          </div>`;
      }).join('');
    } else {
      document.getElementById('headhunter-companies-section').hidden = true;
    }
  }

  // Niche / industry-specific boards
  const nicheContainer = document.getElementById('headhunter-niche-boards');
  const nicheBoards = result.industryBoards || [];
  if (nicheContainer) {
    if (nicheBoards.length > 0) {
      nicheContainer.innerHTML = nicheBoards.map(board => {
        const name = board.name || 'Job Board';
        const url = board.url || '#';
        const desc = board.description || '';
        return `
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="headhunter-link-card">
            <div>
              <span class="link-name">${escapeHtml(name)}</span>
              ${desc ? `<span class="link-desc">${escapeHtml(desc)}</span>` : ''}
            </div>
            <span class="link-arrow" aria-hidden="true">&nearr;</span>
          </a>`;
      }).join('');
    } else {
      document.getElementById('headhunter-niche-section').hidden = true;
    }
  }

  // Search tips
  const tipsContainer = document.getElementById('headhunter-tips');
  const tips = result.searchTips || [];
  if (tipsContainer) {
    if (tips.length > 0) {
      tipsContainer.innerHTML = tips.map(tip =>
        `<li class="scout-tip">${escapeHtml(tip)}</li>`
      ).join('');
    } else {
      document.getElementById('headhunter-tips-section').hidden = true;
    }
  }

  // Un-hide all sections for next search (in case they were hidden from a previous search)
  ['headhunter-titles-section', 'headhunter-queries-section', 'headhunter-companies-section', 'headhunter-niche-section', 'headhunter-tips-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  });
  // Now re-hide empty ones
  if (!titles.length) document.getElementById('headhunter-titles-section').hidden = true;
  if (!queries.length) document.getElementById('headhunter-queries-section').hidden = true;
  if (!companies.length) document.getElementById('headhunter-companies-section').hidden = true;
  if (!nicheBoards.length) document.getElementById('headhunter-niche-section').hidden = true;
  if (!tips.length) document.getElementById('headhunter-tips-section').hidden = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function setupChat() {
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const overlay = document.getElementById('chat-overlay');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');

  function openChat() {
    if (panel) panel.hidden = false;
    if (overlay) overlay.hidden = false;
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (input) input.focus();
  }

  function closeChat() {
    if (panel) panel.hidden = true;
    if (overlay) overlay.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle) toggle.addEventListener('click', openChat);
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (overlay) overlay.addEventListener('click', closeChat);

  // Suggestion buttons
  document.querySelectorAll('.chat-suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (input) input.value = prompt;
      sendChatMessage(prompt);
    });
  });

  // Chat form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input?.value?.trim();
      if (message) {
        sendChatMessage(message);
      }
    });
  }

  async function sendChatMessage(message) {
    if (!messages || !input) return;

    // Add user message
    appendChatMessage(message, 'user');
    input.value = '';

    // Hide suggestions after first message
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.hidden = true;

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message chat-message--assistant chat-typing';
    typingIndicator.innerHTML = `
      <div class="chat-avatar" aria-hidden="true">&#9998;</div>
      <div class="chat-bubble">
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>`;
    messages.appendChild(typingIndicator);
    scrollChatToBottom();

    try {
      const result = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      // Remove typing indicator
      typingIndicator.remove();

      const reply = result.reply || result.message || result.response || 'I\'m not sure how to respond to that.';
      appendChatMessage(reply, 'assistant');
    } catch (err) {
      typingIndicator.remove();
      appendChatMessage(`Sorry, I encountered an error: ${err.message}`, 'assistant');
    }
  }

  function appendChatMessage(text, role) {
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message--${role}`;

    if (role === 'assistant') {
      messageDiv.innerHTML = `
        <div class="chat-avatar" aria-hidden="true">&#9998;</div>
        <div class="chat-bubble">
          <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        </div>`;
    } else {
      messageDiv.innerHTML = `
        <div class="chat-bubble">
          <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        </div>`;
    }

    messages.appendChild(messageDiv);
    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function setupSettings() {
  const btn = document.getElementById('settings-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = 'Settings';
    modalBody.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label class="form-label" for="settings-api-key">Anthropic API Key</label>
          <input type="password" id="settings-api-key" class="form-input" placeholder="sk-ant-..." autocomplete="off">
          <p class="form-hint">Stored server-side in your .env file. Leave blank to keep the current key.</p>
        </div>
        <div>
          <label class="form-label">Data</label>
          <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:8px;">Your profile, jobs, and writing samples are saved locally in the <code>data/</code> folder.</p>
          <button type="button" id="settings-export" class="btn btn--outline btn--small">Export All Data</button>
        </div>
      </div>`;

    // Wire up export button
    const exportBtn = document.getElementById('settings-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const [profile, jobs, samples, contacts] = await Promise.all([
            api('/api/profile'),
            api('/api/jobs'),
            api('/api/writing-samples'),
            api('/api/contacts'),
          ]);
          const exportData = { profile, jobs, writingSamples: samples, contacts, exportedAt: new Date().toISOString() };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'job-pal-export.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Data exported!', 'success');
        } catch (err) {
          showToast(`Export failed: ${err.message}`, 'error');
        }
      });
    }

    // Override confirm to save the API key
    modalConfirmCallback = async () => {
      const keyInput = document.getElementById('settings-api-key');
      const newKey = keyInput?.value?.trim();
      if (newKey) {
        try {
          await api('/api/settings/api-key', {
            method: 'POST',
            body: JSON.stringify({ key: newKey }),
          });
          showToast('API key updated!', 'success');
        } catch (err) {
          showToast(`Failed to update API key: ${err.message}`, 'error');
        }
      }
      closeModal();
    };

    // Change confirm button text
    const confirmBtn = document.getElementById('modal-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Save';
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.textContent = 'Close';

    modal.hidden = false;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL EVENT SETUP
// ═══════════════════════════════════════════════════════════════════════════════

function setupModal() {
  const confirmBtn = document.getElementById('modal-confirm');
  const cancelBtn = document.getElementById('modal-cancel');
  const closeBtn = document.getElementById('modal-close');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (typeof modalConfirmCallback === 'function') {
        modalConfirmCallback();
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

let contactsCache = [];
let currentContactId = null;

async function loadContacts() {
  try {
    const contacts = await api('/api/contacts');
    contactsCache = contacts || [];
    renderContactsList(contactsCache);
  } catch (err) {
    console.error('Failed to load contacts:', err);
  }
}

function renderContactsList(contacts) {
  const container = document.getElementById('contacts-grid');
  if (!container) return;

  // Apply search filter
  const searchVal = (document.getElementById('contacts-search')?.value || '').toLowerCase();
  let filtered = contacts;
  if (searchVal) {
    filtered = contacts.filter(c =>
      (c.name || '').toLowerCase().includes(searchVal) ||
      (c.company || '').toLowerCase().includes(searchVal) ||
      (c.role || '').toLowerCase().includes(searchVal)
    );
  }

  if (!filtered || filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">&#9742;</span>
        <p>${searchVal ? 'No contacts match your search.' : 'No contacts yet. Add a recruiter or hiring manager to get started!'}</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(contact => {
    const notesCount = (contact.notes || []).length;
    return `
      <article class="contact-card" data-id="${contact.id}" tabindex="0" role="button">
        <h4 class="contact-card-name">${escapeHtml(contact.name || 'Unnamed')}</h4>
        <p class="contact-card-role">${escapeHtml(contact.role || '')}</p>
        <p class="contact-card-company">${escapeHtml(contact.company || '')}</p>
        <div class="contact-card-footer">
          <span class="contact-card-notes-count">${notesCount} note${notesCount !== 1 ? 's' : ''}</span>
        </div>
      </article>`;
  }).join('');

  container.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', () => showContactDetail(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showContactDetail(card.dataset.id);
      }
    });
  });
}

function showContactDetail(contactId) {
  const contact = contactsCache.find(c => c.id === contactId);
  if (!contact) return;

  currentContactId = contactId;

  // Hide list, show detail
  document.getElementById('contacts-list-view').hidden = true;
  document.querySelector('.contacts-toolbar').hidden = true;
  const detailView = document.getElementById('contact-detail-view');
  detailView.hidden = false;

  // Populate fields
  document.getElementById('contact-detail-name').textContent = contact.name || 'Unnamed';
  document.getElementById('contact-detail-role').textContent = contact.role || '';
  document.getElementById('contact-detail-company').textContent = contact.company || '';

  const emailEl = document.getElementById('contact-detail-email');
  const phoneEl = document.getElementById('contact-detail-phone');
  const linkedinEl = document.getElementById('contact-detail-linkedin');

  if (emailEl) emailEl.textContent = contact.email || '—';
  if (phoneEl) phoneEl.textContent = contact.phone || '—';
  if (linkedinEl) {
    if (contact.linkedIn) {
      linkedinEl.innerHTML = `<a href="${escapeHtml(contact.linkedIn)}" target="_blank" rel="noopener">${escapeHtml(contact.linkedIn)}</a>`;
    } else {
      linkedinEl.textContent = '—';
    }
  }

  // Linked jobs
  const jobsList = document.getElementById('contact-jobs-list');
  if (jobsList) {
    if (contact.jobIds && contact.jobIds.length > 0) {
      const linkedJobs = contact.jobIds
        .map(jid => jobsCache.find(j => (j._id || j.id) === jid))
        .filter(Boolean);
      if (linkedJobs.length > 0) {
        jobsList.innerHTML = linkedJobs.map(j =>
          `<button type="button" class="tag tag--clickable contact-job-link" data-id="${j._id || j.id}">${escapeHtml(j.title || 'Untitled')} at ${escapeHtml(j.company || '')}</button>`
        ).join(' ');
        jobsList.querySelectorAll('.contact-job-link').forEach(btn => {
          btn.addEventListener('click', () => showJobDetail(btn.dataset.id));
        });
      } else {
        jobsList.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">No linked jobs.</p>';
      }
    } else {
      jobsList.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">No linked jobs.</p>';
    }
  }

  // Render notes
  renderContactNotes(contact);
}

function renderContactNotes(contact) {
  const container = document.getElementById('contact-notes-timeline');
  if (!container) return;

  const notes = contact.notes || [];
  if (notes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No notes yet.</p></div>';
    return;
  }

  container.innerHTML = [...notes].reverse().map(note => {
    const date = new Date(note.createdAt);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `
      <div class="note-item" data-id="${note.id}">
        <p class="note-item-text">${escapeHtml(note.text)}</p>
        <div class="note-item-meta">
          <span class="note-item-date">${dateStr} at ${timeStr}</span>
          <button type="button" class="btn btn--danger btn--small note-delete-btn" data-id="${note.id}" style="padding:3px 8px;font-size:0.72rem;">Delete</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.note-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/contacts/${currentContactId}/notes/${btn.dataset.id}`, { method: 'DELETE' });
        const contact = contactsCache.find(c => c.id === currentContactId);
        if (contact) {
          contact.notes = contact.notes.filter(n => n.id !== btn.dataset.id);
          renderContactNotes(contact);
        }
        showToast('Note deleted.', 'success');
      } catch (err) {
        showToast(`Failed to delete note: ${err.message}`, 'error');
      }
    });
  });
}

function setupContacts() {
  // Add contact button
  const addBtn = document.getElementById('add-contact-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => showContactModal());
  }

  // Back button
  const backBtn = document.getElementById('contact-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('contact-detail-view').hidden = true;
      document.getElementById('contacts-list-view').hidden = false;
      document.querySelector('.contacts-toolbar').hidden = false;
      currentContactId = null;
    });
  }

  // Edit button
  const editBtn = document.getElementById('edit-contact-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const contact = contactsCache.find(c => c.id === currentContactId);
      if (contact) showContactModal(contact);
    });
  }

  // Delete button
  const deleteBtn = document.getElementById('delete-contact-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showModal('Delete Contact', '<p>Are you sure you want to delete this contact?</p>', async () => {
        try {
          await api(`/api/contacts/${currentContactId}`, { method: 'DELETE' });
          showToast('Contact deleted.', 'success');
          closeModal();
          document.getElementById('contact-detail-view').hidden = true;
          document.getElementById('contacts-list-view').hidden = false;
          document.querySelector('.contacts-toolbar').hidden = false;
          currentContactId = null;
          loadContacts();
        } catch (err) {
          showToast(`Failed to delete: ${err.message}`, 'error');
          closeModal();
        }
      });
    });
  }

  // Add note
  const addNoteBtn = document.getElementById('add-note-btn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async () => {
      const input = document.getElementById('contact-note-input');
      const text = input?.value?.trim();
      if (!text) { showToast('Please enter a note.', 'error'); return; }
      try {
        const note = await api(`/api/contacts/${currentContactId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        const contact = contactsCache.find(c => c.id === currentContactId);
        if (contact) {
          contact.notes.push(note);
          renderContactNotes(contact);
        }
        input.value = '';
        showToast('Note added.', 'success');
      } catch (err) {
        showToast(`Failed to add note: ${err.message}`, 'error');
      }
    });
  }

  // Search
  const searchInput = document.getElementById('contacts-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderContactsList(contactsCache));
  }
}

function showContactModal(existingContact = null) {
  const isEdit = !!existingContact;
  const title = isEdit ? 'Edit Contact' : 'Add Contact';

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Name</label>
        <input type="text" id="modal-contact-name" class="form-input" value="${escapeHtml(existingContact?.name || '')}" placeholder="Full name">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Role</label>
        <input type="text" id="modal-contact-role" class="form-input" value="${escapeHtml(existingContact?.role || '')}" placeholder="e.g. Senior Recruiter">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Company</label>
        <input type="text" id="modal-contact-company" class="form-input" value="${escapeHtml(existingContact?.company || '')}" placeholder="Company name">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Email</label>
        <input type="email" id="modal-contact-email" class="form-input" value="${escapeHtml(existingContact?.email || '')}" placeholder="email@example.com">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Phone</label>
        <input type="tel" id="modal-contact-phone" class="form-input" value="${escapeHtml(existingContact?.phone || '')}" placeholder="(555) 123-4567">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">LinkedIn</label>
        <input type="url" id="modal-contact-linkedin" class="form-input" value="${escapeHtml(existingContact?.linkedIn || '')}" placeholder="https://linkedin.com/in/...">
      </div>
    </div>`;

  showModal(title, bodyHtml, async () => {
    const data = {
      name: document.getElementById('modal-contact-name')?.value || '',
      role: document.getElementById('modal-contact-role')?.value || '',
      company: document.getElementById('modal-contact-company')?.value || '',
      email: document.getElementById('modal-contact-email')?.value || '',
      phone: document.getElementById('modal-contact-phone')?.value || '',
      linkedIn: document.getElementById('modal-contact-linkedin')?.value || '',
    };

    if (!data.name) {
      showToast('Name is required.', 'error');
      return;
    }

    try {
      if (isEdit) {
        await api(`/api/contacts/${existingContact.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        showToast('Contact updated.', 'success');
      } else {
        await api('/api/contacts', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        showToast('Contact added!', 'success');
      }
      closeModal();
      loadContacts();
      if (isEdit && currentContactId) {
        // Refresh detail view
        const contacts = await api('/api/contacts');
        contactsCache = contacts || [];
        showContactDetail(currentContactId);
      }
    } catch (err) {
      showToast(`Failed to save contact: ${err.message}`, 'error');
    }
  });

  const confirmBtn = document.getElementById('modal-confirm');
  if (confirmBtn) confirmBtn.textContent = isEdit ? 'Update' : 'Add';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK INTERVIEW MODULE
// ═══════════════════════════════════════════════════════════════════════════════

let currentInterviewSession = null;

async function loadMockInterviews(jobId) {
  const historyContainer = document.getElementById('interview-history');
  if (!historyContainer) return;

  try {
    const sessions = await api(`/api/jobs/${jobId}/mock-interviews`);
    if (!sessions || sessions.length === 0) {
      historyContainer.innerHTML = '<div class="empty-state"><p>No past interview sessions.</p></div>';
      return;
    }

    historyContainer.innerHTML = sessions.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    ).map(session => {
      const date = new Date(session.createdAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const score = session.feedback?.overallScore;
      const scoreClass = score >= 7 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low';
      const scoreHtml = score ? `<span class="interview-session-score ${scoreClass}">${score}/10</span>` : '<span class="text-muted" style="font-size:0.82rem;">In progress</span>';
      const summary = session.feedback?.summary || '';

      return `
        <div class="interview-session-card" data-id="${session.id}">
          <div class="interview-session-header">
            <span class="interview-session-date">${dateStr} &mdash; ${session.questionCount || 0} questions</span>
            ${scoreHtml}
          </div>
          ${summary ? `<div class="interview-session-detail">${escapeHtml(summary)}</div>` : ''}
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Failed to load mock interviews:', err);
    historyContainer.innerHTML = '<div class="empty-state"><p>Failed to load sessions.</p></div>';
  }
}

function setupMockInterview() {
  const startBtn = document.getElementById('start-interview-btn');
  const sendBtn = document.getElementById('send-answer-btn');
  const endBtn = document.getElementById('end-interview-btn');

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (!currentJobId) return;
      try {
        showLoading('Preparing your interview...');
        const session = await api(`/api/jobs/${currentJobId}/mock-interview/start`, { method: 'POST' });
        hideLoading();
        currentInterviewSession = session;
        showInterviewChat(session);
      } catch (err) {
        hideLoading();
        showToast(`Failed to start interview: ${err.message}`, 'error');
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendInterviewAnswer());
  }

  // Allow Enter to send (Shift+Enter for new line)
  const answerInput = document.getElementById('interview-answer');
  if (answerInput) {
    answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendInterviewAnswer();
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      if (!currentInterviewSession || !currentJobId) return;
      try {
        showLoading('Getting your feedback...');
        const session = await api(`/api/jobs/${currentJobId}/mock-interview/${currentInterviewSession.id}/end`, { method: 'POST' });
        hideLoading();
        currentInterviewSession = session;
        showInterviewFeedback(session);
      } catch (err) {
        hideLoading();
        showToast(`Failed to end interview: ${err.message}`, 'error');
      }
    });
  }
}

async function sendInterviewAnswer() {
  if (!currentInterviewSession || !currentJobId) return;

  const input = document.getElementById('interview-answer');
  const answer = input?.value?.trim();
  if (!answer) { showToast('Please type your answer.', 'error'); return; }

  const messagesContainer = document.getElementById('interview-messages');

  // Add user message to chat
  appendInterviewMessage(answer, 'user');
  input.value = '';

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'interview-typing';
  typingEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  messagesContainer.appendChild(typingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const session = await api(`/api/jobs/${currentJobId}/mock-interview/${currentInterviewSession.id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });

    typingEl.remove();
    currentInterviewSession = session;

    // Get the latest assistant message
    const lastMsg = session.messages[session.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      if (lastMsg.feedback) {
        appendInterviewFeedbackBubble(lastMsg.feedback);
      }
      appendInterviewMessage(lastMsg.content, 'interviewer', lastMsg.questionType, lastMsg.tip);
    }
  } catch (err) {
    typingEl.remove();
    showToast(`Failed to send answer: ${err.message}`, 'error');
  }
}

function showInterviewChat(session) {
  const controls = document.getElementById('interview-controls');
  const chat = document.getElementById('interview-chat');
  const feedback = document.getElementById('interview-feedback');
  const inputArea = document.getElementById('interview-input-area');

  if (controls) controls.hidden = true;
  if (chat) chat.hidden = false;
  if (feedback) feedback.hidden = true;
  if (inputArea) inputArea.hidden = false;

  const messagesContainer = document.getElementById('interview-messages');
  if (messagesContainer) messagesContainer.innerHTML = '';

  // Render existing messages
  for (const msg of session.messages) {
    if (msg.role === 'assistant') {
      if (msg.feedback) appendInterviewFeedbackBubble(msg.feedback);
      appendInterviewMessage(msg.content, 'interviewer', msg.questionType, msg.tip);
    } else {
      appendInterviewMessage(msg.content, 'user');
    }
  }
}

function appendInterviewMessage(text, role, questionType, tip) {
  const container = document.getElementById('interview-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `interview-msg interview-msg--${role === 'interviewer' ? 'interviewer' : 'user'}`;

  let metaHtml = '';
  if (questionType) metaHtml = `<div class="interview-msg-meta">${escapeHtml(questionType)} question</div>`;

  let tipHtml = '';
  if (tip) tipHtml = `<div class="interview-msg-tip">Tip: ${escapeHtml(tip)}</div>`;

  div.innerHTML = `
    ${metaHtml}
    <div class="interview-msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
    ${tipHtml}`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendInterviewFeedbackBubble(feedbackText) {
  const container = document.getElementById('interview-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'interview-msg interview-msg--interviewer';
  div.innerHTML = `<div class="interview-msg-feedback">${escapeHtml(feedbackText).replace(/\n/g, '<br>')}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showInterviewFeedback(session) {
  const chat = document.getElementById('interview-chat');
  const feedback = document.getElementById('interview-feedback');
  const inputArea = document.getElementById('interview-input-area');
  const controls = document.getElementById('interview-controls');

  if (inputArea) inputArea.hidden = true;
  if (feedback) {
    feedback.hidden = false;
    const fb = session.feedback;
    if (fb) {
      const score = fb.overallScore || 0;
      const scoreClass = score >= 7 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low';
      feedback.innerHTML = `
        <div class="interview-feedback-card">
          <div class="interview-feedback-header">
            <div class="interview-score-circle ${scoreClass}">${score}/10</div>
            <p class="interview-feedback-summary">${escapeHtml(fb.summary || '')}</p>
          </div>
          <div class="interview-feedback-section">
            <h5>Strengths</h5>
            <ul>${(fb.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          </div>
          <div class="interview-feedback-section">
            <h5>Areas for Improvement</h5>
            <ul>${(fb.improvements || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          </div>
          <div class="interview-feedback-section">
            <h5>Tips for the Real Interview</h5>
            <ul>${(fb.tips || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          </div>
          <button type="button" class="btn btn--primary" id="interview-new-session-btn" style="margin-top:16px;">
            Start New Session
          </button>
        </div>`;

      document.getElementById('interview-new-session-btn')?.addEventListener('click', () => {
        currentInterviewSession = null;
        if (controls) controls.hidden = false;
        if (chat) chat.hidden = true;
        if (feedback) feedback.hidden = true;
        loadMockInterviews(currentJobId);
      });
    }
  }

  loadMockInterviews(currentJobId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text) {
  if (!text) return '';
  const str = String(text);
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Copy text to clipboard and show a toast.
 */
async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  } catch {
    showToast('Failed to copy to clipboard.', 'error');
  }
}

/**
 * Download text content as a .txt file.
 */
function downloadAsFile(text, filename = 'download.txt') {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Set up navigation
  setupNavigation();

  // Set up modal
  setupModal();

  // Set up settings
  setupSettings();

  // Set up profile module
  setupResumeUpload();
  setupTemplateUpload();
  setupSkillInput();
  setupCertInput();
  setupExperienceButton();
  setupEducationButton();
  setupProfileForm();

  // Set up writing samples module
  setupWritingSampleForm();

  // Set up jobs module
  setupJobsModule();

  // Set up job detail module
  setupJobDetail();

  // Set up headhunter module
  setupHeadhunter();

  // Set up chat module
  setupChat();

  // Set up contacts module
  setupContacts();

  // Set up mock interview module
  setupMockInterview();
});
