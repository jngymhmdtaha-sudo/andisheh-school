// ============================================
// 🏛️ هنرستان اندیشه - Script با Supabase
// ============================================

window.addEventListener('error', (e) => {
  console.error('🔴 JS Error:', e.message, 'at', e.filename, ':', e.lineno);
});

const SUPABASE_URL = 'https://xtrufgkrqucukmbwzlvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cnVmZ2tycXVjdWttYnd6bHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Njc5NTksImV4cCI6MjEwNzA0Mzk1OX0.2UDzlKiurdOasxtGsM4h43sq0_0YJUPq1kSSsr01nj0';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'andisheh-school-auth',
  },
});

let currentUser = null;
let loginType = 'teacher';

const ANNOUNCEMENT_ICONS = {
  info: '📢',
  success: '✅',
  warning: '⚠️',
  danger: '🚨',
  urgent: '🔥',
};

// ===== انیمیشن reveal =====
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('active')),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ===== مودال ورود =====
function openLogin(type) {
  loginType = type;
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('loginTitle').textContent =
    type === 'teacher' ? 'ورود معلم' :
    type === 'student' ? 'ورود دانش‌آموز' : 'ورود مدیر';
}

function closeLogin() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

// ===== ورود =====
async function doLogin() {
  const email = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('❌ ایمیل و رمز عبور را وارد کنید!');
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { alert('❌ خطا: ' + error.message); return; }

  const { data: profile, error: profileError } = await sb
    .from('profiles').select('*').eq('id', data.user.id).single();

  if (profileError) { alert('❌ پروفایل یافت نشد!'); return; }

  if (loginType === 'teacher' && profile.role !== 'teacher' && profile.role !== 'admin') {
    alert('❌ این حساب معلم نیست!'); await sb.auth.signOut(); return;
  }
  if (loginType === 'student' && profile.role !== 'student') {
    alert('❌ این حساب دانش‌آموز نیست!'); await sb.auth.signOut(); return;
  }
  if (loginType === 'manager' && profile.role !== 'admin') {
    alert('❌ این حساب مدیر نیست!'); await sb.auth.signOut(); return;
  }

  currentUser = { email, ...profile };
  closeLogin();
  showDashboard();
}

// ===== داشبورد =====
async function showDashboard() {
  document.getElementById('login-section').style.display = 'none';

  if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
    document.getElementById('teacherPanel').style.display = 'block';
  }

  if (currentUser.role === 'admin') {
    document.getElementById('adminPanel').style.display = 'block';
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) adminNameEl.textContent = currentUser.full_name || '';
    await loadAdminStats();
    await loadAdminAnnouncements();
  }

  document.getElementById('assignmentsSection').style.display = 'block';
  await loadAssignments();
}

// ===== خروج =====
async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('teacherPanel').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('assignmentsSection').style.display = 'none';
  document.getElementById('login-section').style.display = 'flex';
  localStorage.removeItem('andisheh-school-auth');
}

// ===== ایجاد تکلیف =====
async function createAssignment() {
  if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) return;

  const classVal = document.getElementById('classSelect').value;
  const gradeVal = document.getElementById('gradeSelect').value;
  const subjectVal = document.getElementById('subjectSelect').value;
  const textVal = document.getElementById('assignmentText').value.trim();

  if (!textVal) { alert('❌ متن تکلیف را وارد کنید!'); return; }

  await sb.from('classes').upsert({ id: classVal, name: `${classVal} - پایه ${gradeVal}` });

  const { error } = await sb.from('assignments').insert({
    title: `${subjectVal} - پایه ${gradeVal}`,
    description: textVal,
    class_id: classVal,
    created_by: currentUser.id,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) { alert('❌ خطا: ' + error.message); return; }

  document.getElementById('assignmentText').value = '';
  alert('✅ تکلیف منتشر شد!');
  await loadAssignments();
}

// ===== نمایش تکالیف =====
async function loadAssignments() {
  const container = document.getElementById('assignmentsList');
  if (!container) return;

  let query = sb.from('assignments').select('*').order('created_at', { ascending: false });
  if (currentUser.role === 'student') {
    query = query.eq('class_id', currentUser.class_id);
  }

  const { data: assignments, error } = await query;

  if (error) { container.innerHTML = '<p style="color:#ff6666;">خطا در بارگذاری</p>'; return; }

  if (!assignments || assignments.length === 0) {
    container.innerHTML = '<p style="color:#a0a0b8;text-align:center;">📭 هنوز تکلیفی ثبت نشده.</p>';
    return;
  }

  container.innerHTML = assignments.map((a) => `
    <div class="assignment-card">
      <h3>${a.title}</h3>
      <p class="meta">📅 ${new Date(a.created_at).toLocaleDateString('fa-IR')}</p>
      <p>${a.description || ''}</p>
    </div>
  `).join('');
}

// ============================================
// 📢 سیستم اعلان‌ها
// ============================================

// ===== نمایش نوار اعلان (برای همه) =====
async function loadAndShowAnnouncements() {
  const banner = document.getElementById('announcementBanner');
  if (!banner) return;

  const closedId = localStorage.getItem('closedAnnouncement');

  const { data, error } = await sb
    .from('announcements')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;

  const ann = data[0];
  if (closedId === String(ann.id)) return;

  document.getElementById('announcementIcon').textContent = ANNOUNCEMENT_ICONS[ann.type] || '📢';
  document.getElementById('announcementTitleDisplay').textContent = ann.title;
  document.getElementById('announcementBodyDisplay').textContent = ann.body || '';

  banner.className = `announcement-banner type-${ann.type || 'info'}`;
  banner.dataset.id = ann.id;
  banner.style.display = 'flex';
}

function closeAnnouncement() {
  const banner = document.getElementById('announcementBanner');
  if (banner && banner.dataset.id) {
    localStorage.setItem('closedAnnouncement', banner.dataset.id);
  }
  if (banner) banner.style.display = 'none';
}

// ===== بارگذاری اعلان‌های پنل مدیر =====
async function loadAdminAnnouncements() {
  const container = document.getElementById('adminAnnouncementsList');
  if (!container) return;

  const { data, error } = await sb
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p style="color:#ff6666;">خطا در بارگذاری</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:#a0a0b8;text-align:center;">📭 هیچ اعلانی ثبت نشده.</p>';
    return;
  }

  container.innerHTML = data.map((ann) => {
    const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
    const expiryText = ann.expires_at
      ? `📅 انقضا: ${new Date(ann.expires_at).toLocaleDateString('fa-IR')}`
      : '📅 بدون انقضا';

    return `
      <div class="admin-announcement-item" style="${isExpired ? 'opacity:0.5;' : ''}">
        <div class="ann-content">
          <h4>${ANNOUNCEMENT_ICONS[ann.type] || '📢'} ${ann.title}</h4>
          <p>${ann.body || ''}</p>
          <div class="ann-meta">
            ${expiryText}
            ${isExpired ? ' • ⚠️ منقضی شده' : ' • ✅ فعال'}
          </div>
        </div>
        <button class="ann-delete-btn" onclick="deleteAnnouncement(${ann.id})">🗑️ حذف</button>
      </div>
    `;
  }).join('');
}

// ===== ساخت اعلان جدید =====
async function createAnnouncement() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('❌ فقط مدیر می‌تونه اعلان بسازه!');
    return;
  }

  const title = document.getElementById('announcementTitleInput').value.trim();
  const body = document.getElementById('announcementBodyInput').value.trim();
  const type = document.getElementById('announcementType').value;
  const expiryDays = parseInt(document.getElementById('announcementExpiry').value);

  if (!title) {
    alert('❌ عنوان اعلان رو وارد کن!');
    return;
  }

  let expiresAt = null;
  if (expiryDays > 0) {
    expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error } = await sb.from('announcements').insert({
    title: sanitizeInput(title),
    body: sanitizeInput(body),
    type: type,
    expires_at: expiresAt,
    active: true,
    created_by: currentUser.id,
  });

  if (error) {
    alert('❌ خطا: ' + error.message);
    return;
  }

  document.getElementById('announcementTitleInput').value = '';
  document.getElementById('announcementBodyInput').value = '';
  alert('✅ اعلان منتشر شد!');

  await loadAdminAnnouncements();
  await loadAndShowAnnouncements();
  await loadAdminStats();
}

// ===== حذف اعلان =====
async function deleteAnnouncement(id) {
  if (!confirm('مطمئنی می‌خوای این اعلان رو حذف کنی؟')) return;

  const { error } = await sb.from('announcements').delete().eq('id', id);

  if (error) {
    alert('❌ خطا: ' + error.message);
    return;
  }

  alert('✅ اعلان حذف شد!');
  await loadAdminAnnouncements();
  await loadAdminStats();
}

// ===== بارگذاری آمار پنل مدیر =====
async function loadAdminStats() {
  const [students, teachers, assignments, announcements] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
    sb.from('assignments').select('*', { count: 'exact', head: true }),
    sb.from('announcements').select('*', { count: 'exact', head: true }),
  ]);

  const setNum = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = toPersianNumber(n || 0);
  };

  setNum('statStudents', students.count);
  setNum('statTeachers', teachers.count);
  setNum('statAssignments', assignments.count);
  setNum('statAnnouncements', announcements.count);
}

// ============================================
// 🛠️ توابع کمکی
// ============================================

function sanitizeInput(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toPersianNumber(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (d) => persianDigits[d]);
}

// ============================================
// 🔐 چک کردن سشن در بارگذاری صفحه
// ============================================
async function checkSession() {
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) return;

    if (session && session.user) {
      const { data: profile, error: profileError } = await sb
        .from('profiles').select('*').eq('id', session.user.id).single();

      if (profile && !profileError) {
        currentUser = { email: session.user.email, ...profile };
        showDashboard();
      }
    }
  } catch (err) {
    console.log('خطا:', err);
  }
}

// ============================================
// 🎨 ذرات شناور
// ============================================
const canvas = document.getElementById('particles');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  class Particle {
    constructor() { this.reset(); this.y = Math.random() * height; }
    reset() {
      this.x = Math.random() * width; this.y = height + 10;
      this.size = Math.random() * 2 + 0.5;
      this.speedY = Math.random() * 0.5 + 0.2;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '212, 175, 55' : '0, 212, 255';
    }
    update() {
      this.y -= this.speedY; this.x += this.speedX;
      if (this.y < -10) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.shadowBlur = 15; ctx.shadowColor = `rgba(${this.color}, 0.6)`;
      ctx.fill();
    }
  }
  for (let i = 0; i < 70; i++) particles.push(new Particle());

  function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// ============================================
// 🖱️ موس سفارشی + دنباله ذرات (فقط دسکتاپ)
// ============================================
const isTouchDevice =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  window.matchMedia('(hover: none)').matches;

if (!isTouchDevice) {
  const cursor = document.createElement('div');
  cursor.style.cssText = `position:fixed;width:20px;height:20px;border:2px solid #d4af37;border-radius:50%;pointer-events:none;z-index:99999;transition:width 0.3s,height 0.3s,background 0.3s,border-color 0.3s;mix-blend-mode:difference;will-change:transform;`;
  document.body.appendChild(cursor);

  const cursorDot = document.createElement('div');
  cursorDot.style.cssText = `position:fixed;width:6px;height:6px;background:#ffd700;border-radius:50%;pointer-events:none;z-index:100000;box-shadow:0 0 15px #ffd700,0 0 30px rgba(255,215,0,0.5);will-change:transform;`;
  document.body.appendChild(cursorDot);

  const trailCanvas = document.createElement('canvas');
  trailCanvas.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;`;
  document.body.appendChild(trailCanvas);

  const tctx = trailCanvas.getContext('2d');
  let tw = (trailCanvas.width = window.innerWidth);
  let th = (trailCanvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    tw = trailCanvas.width = window.innerWidth;
    th = trailCanvas.height = window.innerHeight;
  });

  let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0, lastX = 0, lastY = 0;
  const trailParticles = [];
  const MAX_PARTICLES = 100;

  class TrailParticle {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.life = 1;
      this.size = Math.random() * 4 + 2;
      this.color = Math.random() > 0.5 ? { r: 212, g: 175, b: 55 } : { r: 0, g: 212, b: 255 };
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.vy += 0.05;
      this.life -= 0.02; this.size *= 0.97;
    }
    draw() {
      tctx.beginPath();
      tctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      tctx.fillStyle = `rgba(${this.color.r},${this.color.g},${this.color.b},${this.life})`;
      tctx.shadowBlur = 15;
      tctx.shadowColor = `rgba(${this.color.r},${this.color.g},${this.color.b},${this.life})`;
      tctx.fill();
    }
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;

    const dx = mouseX - lastX, dy = mouseY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const particleCount = Math.min(Math.floor(distance / 3), 5);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const px = lastX + dx * t + (Math.random() - 0.5) * 6;
      const py = lastY + dy * t + (Math.random() - 0.5) * 6;
      if (trailParticles.length < MAX_PARTICLES) {
        trailParticles.push(new TrailParticle(px, py));
      }
    }
    lastX = mouseX; lastY = mouseY;
  });

  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    cursor.style.transform = `translate(${cursorX - 10}px, ${cursorY - 10}px)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  function animateTrail() {
    tctx.clearRect(0, 0, tw, th);
    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const p = trailParticles[i];
      p.update(); p.draw();
      if (p.life <= 0 || p.size < 0.5) trailParticles.splice(i, 1);
    }
    requestAnimationFrame(animateTrail);
  }
  animateTrail();

  document.querySelectorAll('a, button, .feature-card, .contact-card, .btn-glow').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '50px'; cursor.style.height = '50px';
      cursor.style.background = 'rgba(212, 175, 55, 0.15)';
      cursor.style.borderColor = '#ffd700';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '20px'; cursor.style.height = '20px';
      cursor.style.background = 'transparent';
      cursor.style.borderColor = '#d4af37';
    });
  });

  document.body.style.cursor = 'none';
}

// ============================================
// 📅 برنامه هفتگی
// ============================================
const scheduleBtn = document.getElementById('scheduleBtn');
const scheduleModal = document.getElementById('scheduleModal');

function openSchedule() {
  if (!scheduleModal) return;
  scheduleModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSchedule() {
  if (!scheduleModal) return;
  scheduleModal.classList.remove('open');
  document.body.style.overflow = '';
}

if (scheduleBtn) {
  scheduleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openSchedule();
  });
}

if (scheduleModal) {
  scheduleModal.addEventListener('click', (e) => {
    if (e.target === scheduleModal) closeSchedule();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && scheduleModal && scheduleModal.classList.contains('open')) {
    closeSchedule();
  }
});

// ============================================
// 🔧 مودال کارگاه‌ها
// ============================================
const workshopData = {
  computer: {
    title: 'کارگاه کامپیوتر ما',
    background: 'workshop-computer-bg.png',
    text: `کارگاه کامپیوتر هنرستان اندیشه، یکی از مجهزترین کارگاه‌های فنی منطقه است.

در این کارگاه، هر دانش‌آموز به یک سیستم اختصاصی با آخرین نسخه‌های نرم‌افزاری دسترسی دارد. سیستم‌ها به‌روز و پرسرعت هستند و برای یادگیری برنامه‌نویسی، طراحی گرافیک، امنیت سایبری و مهارت‌های دیجیتال، بهترین بستر را فراهم می‌کنند.

ما باور داریم که کیفیت آموزش، مستقیماً به کیفیت امکانات بستگی دارد. به همین دلیل، سرمایه‌گذاری روی تجهیزات به‌روز و محیط آموزشی مدرن، اولویت ماست.`,
    images: ['workshop-computer-1.png', 'workshop-computer-2.png', 'workshop-computer-3.png'],
    video: 'workshop-computer-video.mp4',
  },
  mechanic: {
    title: 'کارگاه مکانیک ما',
    background: 'workshop-mechanic-bg.png',
    text: `کارگاه مکانیک هنرستان اندیشه، محیطی حرفه‌ای برای یادگیری مهارت‌های فنی و صنعتی است.

این کارگاه به ابزارها و تجهیزات حرفه‌ای مجهز است و دانش‌آموزان می‌توانند به صورت عملی با موتورها، سیستم‌های انتقال قدرت و تکنیک‌های تعمیرات خودرو کار کنند. آموزش عملی در این کارگاه، دانش‌آموزان را برای ورود به بازار کار و ادامه تحصیل در رشته‌های مهندسی مکانیک آماده می‌کند.

هدف ما تربیت نیروی متخصص و ماهر است که بتواند با اعتماد به نفس، در صنعت کشور خدمت کند.`,
    images: ['workshop-mechanic-1.png', 'workshop-mechanic-2.png', 'workshop-mechanic-3.png'],
    video: 'workshop-mechanic-video.mp4',
  },
};

function openWorkshop(type) {
  const data = workshopData[type];
  if (!data) return;

  const modal = document.getElementById('workshopModal');
  if (!modal) return;

  const content = modal.querySelector('.workshop-content');
  document.getElementById('workshopTitle').textContent = data.title;

  const heroBg = modal.querySelector('.workshop-hero-bg');
  heroBg.style.backgroundImage = `url('${data.background}')`;

  document.getElementById('workshopText').textContent = data.text;

  const gallery = document.getElementById('workshopGallery');
  gallery.innerHTML = data.images
    .map((img, i) => `<img src="${img}" alt="تصویر ${i + 1}" class="workshop-fade-up">`)
    .join('');

  const videoSource = document.getElementById('workshopVideoSource');
  const video = document.getElementById('workshopVideo');
  videoSource.src = data.video;
  video.load();

  modal.classList.add('open');
  document.body.classList.add('modal-open');
  if (content) content.scrollTop = 0;
  modal.scrollTop = 0;

  setTimeout(() => setupWorkshopReveal(), 100);
}

function closeWorkshop() {
  const modal = document.getElementById('workshopModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');

  const video = document.getElementById('workshopVideo');
  if (video) { video.pause(); video.currentTime = 0; }
}

function setupWorkshopReveal() {
  const modal = document.getElementById('workshopModal');
  if (!modal) return;
  const elements = modal.querySelectorAll('.workshop-fade-up');

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')),
    { root: modal, threshold: 0.15 }
  );

  elements.forEach((el) => observer.observe(el));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('workshopModal');
    if (modal && modal.classList.contains('open')) closeWorkshop();
  }
});

// ============================================
// ⏳ Preloader
// ============================================
window.addEventListener('load', () => {
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 800);
    }
  }, 2200);
});

// ============================================
// 🌙 تم روشن/تاریک
// ============================================
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}
loadTheme();

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    localStorage.setItem('theme', 'dark');
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', (e) => {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';

    if (!document.startViewTransition) { applyTheme(newTheme); return; }

    const rect = themeToggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxX = Math.max(x, window.innerWidth - x);
    const maxY = Math.max(y, window.innerHeight - y);
    const radius = Math.sqrt(maxX * maxX + maxY * maxY);

    document.body.classList.add('dark-mode-transition');
    setTimeout(() => document.body.classList.remove('dark-mode-transition'), 600);

    const transition = document.startViewTransition(() => applyTheme(newTheme));

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });
}

// ============================================
// 🔢 شمارنده آمار
// ============================================
const statNumbers = document.querySelectorAll('.stat-number');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = target / (2000 / 16);

      const counter = setInterval(() => {
        current += step;
        if (current >= target) {
          el.textContent = toPersianNumber(target) + '+';
          clearInterval(counter);
        } else {
          el.textContent = toPersianNumber(Math.floor(current));
        }
      }, 16);

      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach((el) => counterObserver.observe(el));

// ============================================
// ✨ Split Text Animation
// ============================================
window.addEventListener('load', () => {
  setTimeout(() => {
    const heroLines = document.querySelectorAll('.hero-title .line');
    heroLines.forEach((line) => {
      const original = line.textContent;
      line.textContent = '';
      line.style.opacity = '1';

      const words = original.split(/\s+/);
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'split-word';
        span.style.animationDelay = (i * 0.15) + 's';
        span.textContent = word;
        line.appendChild(span);
        line.appendChild(document.createTextNode(' '));
      });
    });
  }, 2300);
});

// ============================================
// 💧 Ripple Effect
// ============================================
document.addEventListener('click', (e) => {
  if (isTouchDevice) return;
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = e.clientX - 25 + 'px';
  ripple.style.top = e.clientY - 25 + 'px';
  ripple.style.width = '50px';
  ripple.style.height = '50px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);
});

// ============================================
// 🚀 اجرای اولیه
// ============================================
checkSession();

window.addEventListener('load', () => {
  setTimeout(() => loadAndShowAnnouncements(), 3000);
});