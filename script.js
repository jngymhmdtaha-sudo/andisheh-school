// ============================================
// 🏛️ هنرستان اندیشه - Script با Supabase
// ============================================

const SUPABASE_URL = 'https://xtrufgkrqucukmbwzlvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cnVmZ2tycXVjdWttYnd6bHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Njc5NTksImV4cCI6MjEwNzA0Mzk1OX0.2UDzlKiurdOasxtGsM4h43sq0_0YJUPq1kSSsr01nj0';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let loginType = 'teacher';

// ===== انیمیشن reveal =====
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('active')),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ===== مودال =====
function openLogin(type) {
  loginType = type;
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('loginTitle').textContent =
    type === 'teacher' ? 'ورود معلم' : type === 'student' ? 'ورود دانش‌آموز' : 'ورود مدیر';
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

  if (loginType === 'teacher' && profile.role !== 'teacher') {
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

  if (currentUser.role === 'teacher') {
    document.getElementById('teacherPanel').style.display = 'block';
  }

  document.getElementById('assignmentsSection').style.display = 'block';
  await loadAssignments();
}

// ===== خروج =====
async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('teacherPanel').style.display = 'none';
  document.getElementById('assignmentsSection').style.display = 'none';
  document.getElementById('login-section').style.display = 'flex';
}

// ===== ایجاد تکلیف =====
async function createAssignment() {
  if (!currentUser || currentUser.role !== 'teacher') return;

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

// ===== ذرات شناور =====
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

// ===== موس سفارشی =====
const cursor = document.createElement('div');
cursor.style.cssText = `position:fixed;width:20px;height:20px;border:2px solid #d4af37;border-radius:50%;pointer-events:none;z-index:99999;transition:transform 0.15s,width 0.3s,height 0.3s,background 0.3s;mix-blend-mode:difference;`;
document.body.appendChild(cursor);

const cursorDot = document.createElement('div');
cursorDot.style.cssText = `position:fixed;width:6px;height:6px;background:#ffd700;border-radius:50%;pointer-events:none;z-index:100000;box-shadow:0 0 15px #ffd700;`;
document.body.appendChild(cursorDot);

let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorDot.style.left = mouseX - 3 + 'px';
  cursorDot.style.top = mouseY - 3 + 'px';
});
function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;
  cursor.style.left = cursorX - 10 + 'px';
  cursor.style.top = cursorY - 10 + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, .feature-card, .contact-card').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = '50px'; cursor.style.height = '50px';
    cursor.style.background = 'rgba(212, 175, 55, 0.15)';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = '20px'; cursor.style.height = '20px';
    cursor.style.background = 'transparent';
  });
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('loginModal');
  if (e.target === modal) closeLogin();
});

window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.style.background = 'rgba(5, 5, 15, 0.95)';
    navbar.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
  } else {
    navbar.style.background = 'rgba(5, 5, 15, 0.7)';
    navbar.style.boxShadow = 'none';
  }
});
// ============================================
// 📅 برنامه هفتگی - Modal
// ============================================

const scheduleBtn = document.getElementById('scheduleBtn');
const scheduleModal = document.getElementById('scheduleModal');

function openSchedule() {
  scheduleModal.classList.add('open');
  document.body.style.overflow = 'hidden'; // جلوگیری از اسکرول پس‌زمینه
}

function closeSchedule() {
  scheduleModal.classList.remove('open');
  document.body.style.overflow = ''; // برگردوندن اسکرول
}

// باز کردن با کلیک (touch رو هم پشتیبانی می‌کنه)
if (scheduleBtn) {
  scheduleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openSchedule();
  });
}

// بستن با کلیک روی پس‌زمینه
if (scheduleModal) {
  scheduleModal.addEventListener('click', (e) => {
    if (e.target === scheduleModal) {
      closeSchedule();
    }
  });
}

// بستن با کلید Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && scheduleModal.classList.contains('open')) {
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
    images: [
      'workshop-computer-1.png',
      'workshop-computer-2.png',
      'workshop-computer-3.png',
    ],
    video: 'workshop-computer-video.mp4',
  },
  mechanic: {
    title: 'کارگاه مکانیک ما',
    background: 'workshop-mechanic-bg.png',
    text: `کارگاه مکانیک هنرستان اندیشه، محیطی حرفه‌ای برای یادگیری مهارت‌های فنی و صنعتی است.

این کارگاه به ابزارها و تجهیزات حرفه‌ای مجهز است و دانش‌آموزان می‌توانند به صورت عملی با موتورها، سیستم‌های انتقال قدرت و تکنیک‌های تعمیرات خودرو کار کنند. آموزش عملی در این کارگاه، دانش‌آموزان را برای ورود به بازار کار و ادامه تحصیل در رشته‌های مهندسی مکانیک آماده می‌کند.

هدف ما تربیت نیروی متخصص و ماهر است که بتواند با اعتماد به نفس، در صنعت کشور خدمت کند.`,
    images: [
      'workshop-mechanic-1.png',
      'workshop-mechanic-2.png',
      'workshop-mechanic-3.png',
    ],
    video: 'workshop-mechanic-video.mp4',
  },
};

function openWorkshop(type) {
  const data = workshopData[type];
  if (!data) return;

  const modal = document.getElementById('workshopModal');
  const content = modal.querySelector('.workshop-content');

  // تنظیم عنوان
  document.getElementById('workshopTitle').textContent = data.title;

  // تنظیم بک‌گراند
  const heroBg = modal.querySelector('.workshop-hero-bg');
  heroBg.style.backgroundImage = `url('${data.background}')`;

  // تنظیم متن
  document.getElementById('workshopText').textContent = data.text;

  // تنظیم گالری
  const gallery = document.getElementById('workshopGallery');
  gallery.innerHTML = data.images
    .map((img, i) => `<img src="${img}" alt="تصویر ${i + 1}" class="workshop-fade-up">`)
    .join('');

  // تنظیم ویدیو
  const videoSource = document.getElementById('workshopVideoSource');
  const video = document.getElementById('workshopVideo');
  videoSource.src = data.video;
  video.load();

  // باز کردن مودال
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  content.scrollTop = 0;
  modal.scrollTop = 0;

  // راه‌اندازی انیمیشن اسکرول بعد از باز شدن
  setTimeout(() => {
    setupWorkshopReveal();
  }, 100);
}

function closeWorkshop() {
  const modal = document.getElementById('workshopModal');
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');

  // متوقف کردن ویدیو
  const video = document.getElementById('workshopVideo');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
}

// انیمیشن اسکرول داخل مودال
function setupWorkshopReveal() {
  const modal = document.getElementById('workshopModal');
  const elements = modal.querySelectorAll('.workshop-fade-up');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      root: modal,
      threshold: 0.15,
    }
  );

  elements.forEach((el) => observer.observe(el));
}

// بستن با کلید Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('workshopModal');
    if (modal && modal.classList.contains('open')) {
      closeWorkshop();
    }
  }
});