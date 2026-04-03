// ============================================================
// AgencyFlow - Complete Figma Design Plugin
// ============================================================
// HOW TO USE:
// 1. Open Figma (desktop or web)
// 2. Go to Plugins > Development > New Plugin
// 3. Choose "Run once" and paste this entire code
// 4. Or: Plugins > Development > Open Console, paste & run
// ============================================================

const W = 1440; // Frame width
const H = 900;  // Frame height

// ─── Design Tokens ──────────────────────────────────────────
const COLOR = {
  primary:    { r: 0.216, g: 0.220, b: 0.639 }, // #3730A3
  primaryBtn: { r: 0.239, g: 0.298, b: 0.996 }, // #3D4CFE
  accent:     { r: 0.239, g: 0.804, b: 1.000 }, // #3DCDFF
  bg:         { r: 1.000, g: 1.000, b: 1.000 }, // #FFFFFF
  bgGray:     { r: 0.949, g: 0.957, b: 0.969 }, // #F1F5F9
  bgCard:     { r: 1.000, g: 1.000, b: 1.000 }, // #FFFFFF
  border:     { r: 0.886, g: 0.910, b: 0.941 }, // #E2E8F0
  textDark:   { r: 0.059, g: 0.090, b: 0.165 }, // #0F172A
  textMid:    { r: 0.278, g: 0.333, b: 0.412 }, // #475569
  textLight:  { r: 0.596, g: 0.635, b: 0.694 }, // #98A2B3 (approx)
  danger:     { r: 0.937, g: 0.267, b: 0.267 }, // #EF4444
  success:    { r: 0.133, g: 0.773, b: 0.369 }, // #22C55E (approx)
  warning:    { r: 0.984, g: 0.749, b: 0.090 }, // #FBBF17 (approx)
  info:       { r: 0.239, g: 0.620, b: 0.996 }, // #3D9EFE
  navBg:      { r: 0.059, g: 0.090, b: 0.165 }, // #0F172A
  navText:    { r: 1.000, g: 1.000, b: 1.000 },
  purple:     { r: 0.549, g: 0.361, b: 0.996 }, // #8C5CFE
  teal:       { r: 0.078, g: 0.722, b: 0.651 }, // #14B8A6
};

// ─── Helpers ─────────────────────────────────────────────────

function hex(r255, g255, b255) {
  return { r: r255/255, g: g255/255, b: b255/255 };
}

function rect(parent, x, y, w, h, fill, radius = 0, name = '') {
  const node = figma.createRectangle();
  node.x = x; node.y = y;
  node.resize(w, h);
  node.fills = [{ type: 'SOLID', color: fill }];
  if (radius) node.cornerRadius = radius;
  if (name) node.name = name;
  parent.appendChild(node);
  return node;
}

async function text(parent, x, y, content, size, color, weight = 'Regular', width = 0) {
  await figma.loadFontAsync({ family: 'Inter', style: weight });
  const t = figma.createText();
  t.x = x; t.y = y;
  t.fontName = { family: 'Inter', style: weight };
  t.fontSize = size;
  t.fills = [{ type: 'SOLID', color }];
  t.characters = content;
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, 50); }
  parent.appendChild(t);
  return t;
}

function frame(parent, x, y, w, h, fill = COLOR.bg, name = 'Frame', radius = 0) {
  const f = figma.createFrame();
  f.name = name;
  f.x = x; f.y = y;
  f.resize(w, h);
  f.fills = [{ type: 'SOLID', color: fill }];
  if (radius) f.cornerRadius = radius;
  if (parent) parent.appendChild(f);
  return f;
}

function card(parent, x, y, w, h, name = 'Card') {
  const c = frame(parent, x, y, w, h, COLOR.bgCard, name, 12);
  c.strokes = [{ type: 'SOLID', color: COLOR.border }];
  c.strokeWeight = 1;
  c.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.06 },
    offset: { x: 0, y: 2 },
    radius: 8, spread: 0, visible: true, blendMode: 'NORMAL'
  }];
  return c;
}

async function badge(parent, x, y, label, color, textColor = COLOR.bg) {
  const bg = frame(parent, x, y, 1, 24, color, 'Badge', 12);
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: 'Medium' };
  t.fontSize = 11;
  t.characters = label;
  t.fills = [{ type: 'SOLID', color: textColor }];
  bg.appendChild(t);
  bg.resize(t.width + 16, 24);
  t.x = 8; t.y = 4;
  return bg;
}

async function button(parent, x, y, label, fill = COLOR.primaryBtn, textColor = COLOR.navText, w = 0, radius = 8) {
  await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
  const btn = frame(parent, x, y, w || 140, 40, fill, label, radius);
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: 'SemiBold' };
  t.fontSize = 14;
  t.characters = label;
  t.fills = [{ type: 'SOLID', color: textColor }];
  btn.appendChild(t);
  const btnW = w || t.width + 32;
  btn.resize(btnW, 40);
  t.x = (btnW - t.width) / 2;
  t.y = 11;
  return btn;
}

async function input(parent, x, y, w, placeholder, label = '') {
  if (label) {
    await text(parent, x, y - 22, label, 13, COLOR.textMid, 'Medium');
  }
  const bg = frame(parent, x, y, w, 44, COLOR.bg, 'Input', 8);
  bg.strokes = [{ type: 'SOLID', color: COLOR.border }];
  bg.strokeWeight = 1;
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: 'Regular' };
  t.fontSize = 14;
  t.characters = placeholder;
  t.fills = [{ type: 'SOLID', color: COLOR.textLight }];
  bg.appendChild(t);
  t.x = 14; t.y = 14;
  return bg;
}

// ─── Navbar Component ────────────────────────────────────────

async function navbar(parent, active = 'Dashboard') {
  const nav = frame(parent, 0, 0, W, 64, COLOR.navBg, 'Navbar');
  // Logo
  rect(nav, 24, 16, 32, 32, COLOR.primary, 8, 'Logo-Icon');
  await text(nav, 64, 20, 'AgencyFlow', 18, COLOR.navText, 'Bold');
  // Links
  const links = ['How it Works', active];
  let lx = W - 400;
  for (const l of links) {
    const isActive = l === active;
    if (isActive) {
      const pill = frame(nav, lx - 8, 16, 1, 32, COLOR.primary, l, 20);
      await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
      const lt = figma.createText();
      lt.fontName = { family: 'Inter', style: 'SemiBold' };
      lt.fontSize = 14; lt.characters = l;
      lt.fills = [{ type: 'SOLID', color: COLOR.navText }];
      pill.appendChild(lt);
      pill.resize(lt.width + 16, 32);
      lt.x = 8; lt.y = 8;
      lx += pill.width + 20;
    } else {
      await text(nav, lx, 22, l, 14, COLOR.textLight, 'Regular');
      lx += 120;
    }
  }
  // Right icons
  rect(nav, W - 120, 20, 24, 24, COLOR.textLight, 4, 'Bell');
  rect(nav, W - 80, 20, 24, 24, COLOR.textLight, 4, 'Theme');
  rect(nav, W - 48, 16, 32, 32, COLOR.primary, 16, 'Avatar');
  return nav;
}

// ─── Sidebar Component ───────────────────────────────────────

async function sidebar(parent, items, activeItem) {
  const sb = frame(parent, 0, 64, 240, H - 64, hex(15, 23, 42), 'Sidebar');
  let iy = 16;
  for (const item of items) {
    const isActive = item === activeItem;
    if (isActive) {
      const row = frame(sb, 12, iy, 216, 40, COLOR.primary, item, 8);
      await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
      const t = figma.createText();
      t.fontName = { family: 'Inter', style: 'SemiBold' };
      t.fontSize = 14; t.characters = '  ' + item;
      t.fills = [{ type: 'SOLID', color: COLOR.navText }];
      row.appendChild(t);
      t.x = 12; t.y = 11;
    } else {
      await text(sb, 28, iy + 11, item, 14, COLOR.textMid, 'Regular');
    }
    iy += 48;
  }
  return sb;
}

// ─── Stat Card ───────────────────────────────────────────────

async function statCard(parent, x, y, title, value, sub, color) {
  const c = card(parent, x, y, 260, 110, title);
  rect(c, 0, 0, 4, 110, color, 0, 'Accent-Bar');
  rect(c, 16, 16, 40, 40, { ...color, ...{} }, 8, 'Icon-Bg');
  await text(c, 68, 18, title, 12, COLOR.textMid, 'Medium');
  await text(c, 68, 38, value, 28, COLOR.textDark, 'Bold');
  await text(c, 68, 74, sub, 11, COLOR.textLight, 'Regular');
  return c;
}

// ─── Page Creation Functions ─────────────────────────────────

// 1. HOME PAGE
async function createHomePage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bg, '🏠 Home');
  page.appendChild(f);

  // Hero background
  rect(f, 0, 0, W, H, hex(15, 23, 42), 0, 'Hero-BG');
  // Gradient overlay
  const grad = figma.createRectangle();
  grad.x = 0; grad.y = 0; grad.resize(W, H);
  grad.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 0.216, g: 0.220, b: 0.639, a: 0.8 } },
      { position: 1, color: { r: 0.059, g: 0.090, b: 0.165, a: 0.95 } }
    ]
  }];
  f.appendChild(grad);

  await navbar(f, '');

  // Hero content
  await text(f, W/2 - 300, 160, 'Streamline Your Agency', 56, COLOR.navText, 'Bold', 600);
  await text(f, W/2 - 300, 230, 'Workflow & Growth', 56, COLOR.accent, 'Bold', 600);
  await text(f, W/2 - 300, 310, 'AgencyFlow brings your entire creative agency together —\nprojects, briefs, tasks, and team management in one place.', 18, COLOR.textLight, 'Regular', 560);

  await button(f, W/2 - 300, 400, 'Get Started Free', COLOR.primaryBtn, COLOR.navText, 180);
  await button(f, W/2 - 105, 400, 'How It Works', hex(255,255,255), COLOR.textDark, 160);

  // Feature cards
  const features = [
    { title: 'Smart Briefs', desc: 'AI-guided brief builder\nwith n8n automation', color: COLOR.primary },
    { title: 'Project Hub', desc: 'Track all projects with\nstatus & payment info', color: COLOR.purple },
    { title: 'Team Tasks', desc: 'Assign, review, and\napprove work easily', color: COLOR.teal },
    { title: 'Role Access', desc: 'Client, Manager, Worker\n& Admin dashboards', color: COLOR.info },
  ];
  let fx = W/2 - 560;
  for (const feat of features) {
    const fc = card(f, fx, 530, 260, 160, feat.title);
    rect(fc, 20, 20, 44, 44, feat.color, 12, 'Icon');
    await text(fc, 20, 76, feat.title, 16, COLOR.textDark, 'SemiBold');
    await text(fc, 20, 100, feat.desc, 13, COLOR.textMid, 'Regular', 220);
    fx += 280;
  }

  return f;
}

// 2. HOW IT WORKS PAGE
async function createHowItWorksPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '📖 How It Works');
  page.appendChild(f);
  await navbar(f, 'How it Works');

  rect(f, 0, 64, W, 4, COLOR.primary, 0, 'Header-Line');

  await text(f, W/2 - 240, 100, 'How AgencyFlow Works', 40, COLOR.textDark, 'Bold');
  await text(f, W/2 - 300, 158, 'A simple 4-step process to take your project from idea to delivery', 18, COLOR.textMid, 'Regular', 600);

  const steps = [
    { num: '01', title: 'Submit a Brief', desc: 'Clients answer guided questions\nusing our AI-assisted brief builder\nto capture full project requirements.' },
    { num: '02', title: 'Manager Reviews', desc: 'Project managers validate briefs,\nrequest clarifications, and convert\nthem into active projects.' },
    { num: '03', title: 'Team Executes', desc: 'Workers receive task assignments,\nsubmit deliverables, and get\nAI-scored feedback in real time.' },
    { num: '04', title: 'Client Approves', desc: 'Clients review deliverables, approve\nwork, and track payment status\nthrough their dedicated portal.' },
  ];

  let sx = 80;
  for (const step of steps) {
    const sc = card(f, sx, 240, 300, 280, step.title);
    // Step number circle
    const circle = figma.createEllipse();
    circle.x = 20; circle.y = 20;
    circle.resize(56, 56);
    circle.fills = [{ type: 'SOLID', color: COLOR.primary }];
    sc.appendChild(circle);
    await text(sc, 34, 34, step.num, 20, COLOR.navText, 'Bold');
    await text(sc, 20, 96, step.title, 20, COLOR.textDark, 'Bold');
    await text(sc, 20, 128, step.desc, 14, COLOR.textMid, 'Regular', 260);

    // Arrow connector
    if (sx < 80 + 3 * 320) {
      await text(f, sx + 316, 360, '→', 28, COLOR.primary, 'Bold');
    }
    sx += 320;
  }

  // CTA
  const ctaBox = frame(f, 80, 580, W - 160, 200, COLOR.navBg, 'CTA', 16);
  await text(ctaBox, 80, 50, 'Ready to Transform Your Agency?', 32, COLOR.navText, 'Bold');
  await text(ctaBox, 80, 100, 'Join hundreds of agencies already using AgencyFlow to deliver better projects.', 16, COLOR.textLight, 'Regular', 700);
  await button(ctaBox, 80, 140, 'Start for Free Today', COLOR.primaryBtn, COLOR.navText, 200);

  return f;
}

// 3. LOGIN PAGE
async function createLoginPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '🔐 Login');
  page.appendChild(f);

  // Split layout
  rect(f, 0, 0, W/2, H, hex(15, 23, 42), 0, 'Left-Panel');
  const grad2 = figma.createRectangle();
  grad2.x = 0; grad2.y = 0; grad2.resize(W/2, H);
  grad2.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 0.216, g: 0.220, b: 0.639, a: 0.9 } },
      { position: 1, color: { r: 0.059, g: 0.090, b: 0.165, a: 1 } }
    ]
  }];
  f.appendChild(grad2);

  // Left side text
  rect(f, 80, 80, 48, 48, COLOR.primary, 12, 'Logo-Left');
  await text(f, 140, 88, 'AgencyFlow', 22, COLOR.navText, 'Bold');
  await text(f, 80, 200, 'Welcome Back', 44, COLOR.navText, 'Bold', 400);
  await text(f, 80, 260, 'Sign in to manage your projects,\nteam, and client workflows.', 18, COLOR.textLight, 'Regular', 400);

  // Testimonial card
  const tc = card(f, 80, H - 260, W/2 - 160, 160, 'Testimonial');
  tc.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.08 } }];
  tc.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.15 } }];
  await text(tc, 20, 20, '"AgencyFlow completely transformed how we\nmanage client projects. Highly recommended!"', 14, COLOR.navText, 'Regular', 560);
  rect(tc, 20, 110, 36, 36, COLOR.primary, 18, 'Review-Avatar');
  await text(tc, 64, 118, 'Sarah M.  •  Creative Director', 13, COLOR.textLight, 'Medium');

  // Right side form
  const formX = W/2 + 80;
  await text(f, formX, 120, 'Sign In', 32, COLOR.textDark, 'Bold');
  await text(f, formX, 164, "Don't have an account?  Sign up", 14, COLOR.primary, 'Regular');

  await input(f, formX, 230, 440, 'you@example.com', 'Email Address');
  await input(f, formX, 320, 440, '••••••••••', 'Password');

  await text(f, formX, 382, 'Forgot password?', 13, COLOR.primary, 'Regular');
  await button(f, formX, 420, 'Sign In', COLOR.primaryBtn, COLOR.navText, 440);

  // Divider
  rect(f, formX, 480, 196, 1, COLOR.border, 0);
  await text(f, formX + 200, 472, 'OR', 13, COLOR.textLight, 'Medium');
  rect(f, formX + 240, 480, 200, 1, COLOR.border, 0);

  // Social buttons
  const google = frame(f, formX, 500, 210, 44, COLOR.bg, 'Google', 8);
  google.strokes = [{ type: 'SOLID', color: COLOR.border }];
  google.strokeWeight = 1;
  await text(google, 30, 13, 'G  Continue with Google', 14, COLOR.textDark, 'Medium');

  const ms = frame(f, formX + 230, 500, 210, 44, COLOR.bg, 'Microsoft', 8);
  ms.strokes = [{ type: 'SOLID', color: COLOR.border }];
  ms.strokeWeight = 1;
  await text(ms, 30, 13, '⊞  Microsoft', 14, COLOR.textDark, 'Medium');

  return f;
}

// 4. SIGNUP PAGE
async function createSignupPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '📝 Sign Up');
  page.appendChild(f);

  rect(f, 0, 0, W/2, H, hex(15, 23, 42), 0, 'Left');
  await text(f, 80, 80, 'AgencyFlow', 22, COLOR.navText, 'Bold');
  await text(f, 80, 200, 'Join AgencyFlow', 40, COLOR.navText, 'Bold', 400);
  await text(f, 80, 260, 'Start managing your agency\nworkflows smarter, not harder.', 18, COLOR.textLight, 'Regular', 400);

  const bullets = ['✓  AI-Powered Brief Builder', '✓  Role-based Team Access', '✓  Real-time Notifications', '✓  Task & Project Tracking'];
  let by = 360;
  for (const b of bullets) {
    await text(f, 80, by, b, 16, COLOR.accent, 'Regular');
    by += 36;
  }

  const fx = W/2 + 80;
  await text(f, fx, 100, 'Create your account', 32, COLOR.textDark, 'Bold');
  await text(f, fx, 144, 'Already have an account?  Sign in', 14, COLOR.primary, 'Regular');

  await input(f, fx, 200, 210, 'First Name', 'First Name');
  await input(f, fx + 230, 200, 210, 'Last Name', 'Last Name');
  await input(f, fx, 290, 440, 'you@example.com', 'Email');
  await input(f, fx, 380, 210, 'Select role', 'Role');
  await input(f, fx + 230, 380, 210, 'Your company', 'Company');
  await input(f, fx, 470, 440, '••••••••', 'Password');

  rect(f, fx, 536, 20, 20, COLOR.bgGray, 4, 'Checkbox');
  await text(f, fx + 28, 537, 'I agree to the Terms of Service and Privacy Policy', 13, COLOR.textMid, 'Regular');

  await button(f, fx, 576, 'Create Account', COLOR.primaryBtn, COLOR.navText, 440);

  return f;
}

// 5. CLIENT DASHBOARD
async function createClientDashboard(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '👤 Client Dashboard');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  const sideItems = ['Overview', 'My Projects', 'Briefs', 'Notifications', 'Profile'];
  await sidebar(f, sideItems, 'Overview');

  const mainX = 256;
  const mainW = W - mainX - 32;

  await text(f, mainX + 16, 80, 'Welcome back, Sarah 👋', 28, COLOR.textDark, 'Bold');
  await text(f, mainX + 16, 116, 'Here\'s an overview of your active projects and briefs.', 14, COLOR.textMid, 'Regular');

  // Stats row
  await statCard(f, mainX + 16, 152, 'Active Projects', '4', '+1 this month', COLOR.primary);
  await statCard(f, mainX + 296, 152, 'Pending Briefs', '2', '1 needs clarification', COLOR.warning);
  await statCard(f, mainX + 576, 152, 'Completed', '12', 'All time', COLOR.success);
  await statCard(f, mainX + 856, 152, 'Payment Due', '1', '$2,400 outstanding', COLOR.danger);

  // Projects table
  const tbl = card(f, mainX + 16, 284, mainW - 16, 380, 'Projects');
  await text(tbl, 20, 20, 'My Projects', 18, COLOR.textDark, 'SemiBold');
  await button(tbl, tbl.width - 160, 14, '+ New Brief', COLOR.primaryBtn, COLOR.navText, 140);

  // Table header
  rect(tbl, 0, 60, tbl.width, 1, COLOR.border, 0);
  const cols = ['Project Name', 'Status', 'Manager', 'Progress', 'Payment', 'Action'];
  const colW = [240, 120, 140, 160, 120, 100];
  let cx = 20;
  for (let i = 0; i < cols.length; i++) {
    await text(tbl, cx, 68, cols[i], 12, COLOR.textMid, 'SemiBold');
    cx += colW[i];
  }

  // Table rows
  const rows = [
    { name: 'Brand Identity 2025', status: 'Active', manager: 'John D.', progress: 65, payment: 'Paid', payColor: COLOR.success },
    { name: 'Website Redesign', status: 'In Review', manager: 'Lisa K.', progress: 88, payment: 'Pending', payColor: COLOR.warning },
    { name: 'Social Media Kit', status: 'Briefing', manager: 'Mark R.', progress: 20, payment: 'Pending', payColor: COLOR.warning },
    { name: 'Product Launch', status: 'Planning', manager: 'Anna W.', progress: 40, payment: 'Paid', payColor: COLOR.success },
  ];
  let ry = 100;
  for (const row of rows) {
    rect(tbl, 0, ry - 4, tbl.width, 1, COLOR.bgGray, 0);
    await text(tbl, 20, ry + 4, row.name, 14, COLOR.textDark, 'Medium');
    await badge(tbl, 260, ry, row.status, row.status === 'Active' ? COLOR.success : row.status === 'Briefing' ? COLOR.info : COLOR.warning);
    await text(tbl, 380, ry + 4, row.manager, 14, COLOR.textMid, 'Regular');

    // Progress bar
    rect(tbl, 520, ry + 10, 120, 6, COLOR.bgGray, 3);
    rect(tbl, 520, ry + 10, row.progress * 1.2, 6, COLOR.primary, 3);
    await text(tbl, 648, ry + 4, row.progress + '%', 12, COLOR.textMid, 'Regular');

    await badge(tbl, 700, ry, row.payment, row.payColor);
    await text(tbl, 840, ry + 4, 'View →', 13, COLOR.primary, 'SemiBold');
    ry += 48;
  }

  return f;
}

// 6. MANAGER DASHBOARD
async function createManagerDashboard(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '🗂 Manager Dashboard');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  const sideItems = ['Overview', 'Projects', 'Brief Review', 'Team', 'Tasks', 'Logs', 'Profile'];
  await sidebar(f, sideItems, 'Overview');

  const mainX = 256;

  await text(f, mainX + 16, 80, 'Manager Dashboard', 28, COLOR.textDark, 'Bold');
  await text(f, mainX + 16, 116, 'Manage briefs, projects, and your team\'s performance.', 14, COLOR.textMid, 'Regular');

  // Stats
  await statCard(f, mainX + 16, 152, 'Active Projects', '8', '3 need attention', COLOR.primary);
  await statCard(f, mainX + 296, 152, 'Pending Briefs', '5', '2 new today', COLOR.info);
  await statCard(f, mainX + 576, 152, 'Late Tasks', '3', '↑ 1 from yesterday', COLOR.danger);
  await statCard(f, mainX + 856, 152, 'Team Score Avg', '87%', '↑ 3% this week', COLOR.success);

  // Two column layout
  const leftW = 600;
  const rightW = W - mainX - leftW - 48;

  // Brief Review panel
  const briefs = card(f, mainX + 16, 288, leftW, 360, 'Brief Review');
  await text(briefs, 20, 20, 'Briefs Awaiting Review', 18, COLOR.textDark, 'SemiBold');
  rect(briefs, 0, 56, leftW, 1, COLOR.border);

  const briefRows = [
    { client: 'TechCorp Inc.', title: 'Mobile App MVP', status: 'Submitted', time: '2h ago' },
    { client: 'Spark Agency', title: 'Rebrand Campaign', status: 'Clarification', time: '5h ago' },
    { client: 'NovaTech', title: 'E-Commerce Store', status: 'Submitted', time: '1d ago' },
    { client: 'BlueWave', title: 'Annual Report', status: 'Validated', time: '2d ago' },
    { client: 'FreshBrand', title: 'Social Content', status: 'Submitted', time: '3d ago' },
  ];
  let bry = 72;
  for (const br of briefRows) {
    rect(briefs, 0, bry - 4, leftW, 1, COLOR.bgGray);
    rect(briefs, 16, bry + 4, 36, 36, COLOR.bgGray, 18, 'Avatar');
    await text(briefs, 62, bry + 4, br.client, 14, COLOR.textDark, 'SemiBold');
    await text(briefs, 62, bry + 22, br.title, 12, COLOR.textMid, 'Regular');
    const sc = br.status === 'Validated' ? COLOR.success : br.status === 'Clarification' ? COLOR.warning : COLOR.info;
    await badge(briefs, leftW - 220, bry + 8, br.status, sc);
    await text(briefs, leftW - 120, bry + 12, br.time, 12, COLOR.textLight, 'Regular');
    await text(briefs, leftW - 56, bry + 12, 'Review', 12, COLOR.primary, 'SemiBold');
    bry += 52;
  }

  // Team Performance panel
  const team = card(f, mainX + leftW + 32, 288, rightW, 360, 'Team');
  await text(team, 20, 20, 'Team Performance', 18, COLOR.textDark, 'SemiBold');
  rect(team, 0, 56, rightW, 1, COLOR.border);

  const workers = [
    { name: 'John Doe', role: 'Designer', score: 94 },
    { name: 'Lisa Kim', role: 'Dev', score: 88 },
    { name: 'Mark R.', role: 'Copywriter', score: 82 },
    { name: 'Anna W.', role: 'PM', score: 91 },
  ];
  let wy = 68;
  for (const w of workers) {
    rect(team, 16, wy, 36, 36, COLOR.bgGray, 18, 'WAvatar');
    await text(team, 62, wy + 2, w.name, 13, COLOR.textDark, 'SemiBold');
    await text(team, 62, wy + 18, w.role, 11, COLOR.textMid, 'Regular');
    const scoreColor = w.score >= 90 ? COLOR.success : w.score >= 80 ? COLOR.info : COLOR.warning;
    await text(team, rightW - 60, wy + 8, w.score + '%', 16, scoreColor, 'Bold');
    rect(team, 62, wy + 32, rightW - 82, 4, COLOR.bgGray, 2);
    rect(team, 62, wy + 32, (rightW - 82) * w.score / 100, 4, scoreColor, 2);
    wy += 70;
  }

  return f;
}

// 7. WORKER DASHBOARD
async function createWorkerDashboard(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '👷 Worker Dashboard');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  const sideItems = ['My Tasks', 'Projects', 'Submissions', 'Performance', 'Profile'];
  await sidebar(f, sideItems, 'My Tasks');

  const mainX = 256;

  await text(f, mainX + 16, 80, 'My Workspace', 28, COLOR.textDark, 'Bold');
  await text(f, mainX + 16, 116, 'Manage your assigned tasks and track your performance.', 14, COLOR.textMid, 'Regular');

  await statCard(f, mainX + 16, 152, 'Active Tasks', '6', '2 due today', COLOR.info);
  await statCard(f, mainX + 296, 152, 'Submitted', '14', 'This week', COLOR.success);
  await statCard(f, mainX + 576, 152, 'In Review', '3', 'Awaiting approval', COLOR.warning);
  await statCard(f, mainX + 856, 152, 'My Score', '88%', '↑ 2% this week', COLOR.primary);

  // Task board - Kanban style
  const kanbanY = 288;
  const colLabels = ['To Do', 'In Progress', 'Submitted', 'Approved'];
  const colColors = [COLOR.textLight, COLOR.info, COLOR.warning, COLOR.success];
  const tasks = [
    ['Design hero banner', 'Logo variations', 'Icon set v2'],
    ['Landing page UI', 'Color palette doc'],
    ['Brand guidelines PDF'],
    ['Social media kit', 'Business cards'],
  ];

  let kx = mainX + 16;
  for (let ci = 0; ci < 4; ci++) {
    const col = frame(f, kx, kanbanY, 270, 380, COLOR.bgGray, colLabels[ci], 12);
    col.strokes = [{ type: 'SOLID', color: COLOR.border }];
    col.strokeWeight = 1;

    // Column header
    rect(col, 0, 0, 270, 48, colColors[ci], 0, 'Header');
    await text(col, 16, 14, colLabels[ci], 15, COLOR.navText, 'SemiBold');
    await badge(col, 200, 12, String(tasks[ci].length), colColors[ci]);

    // Task cards
    let ty = 60;
    for (const task of tasks[ci]) {
      const tc = card(col, 12, ty, 246, 76, task);
      await text(tc, 12, 12, task, 13, COLOR.textDark, 'SemiBold', 222);
      rect(tc, 12, 38, 80, 4, colColors[ci], 2);
      await text(tc, 12, 50, 'Due: Tomorrow', 11, COLOR.textLight, 'Regular');
      rect(tc, 180, 36, 24, 24, COLOR.bgGray, 12, 'AssigneeAvatar');
      ty += 88;
    }

    kx += 290;
  }

  return f;
}

// 8. ADMIN DASHBOARD
async function createAdminDashboard(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '⚙️ Admin Dashboard');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  const sideItems = ['Overview', 'Users', 'Roles & Perms', 'Projects', 'Logs', 'System', 'Profile'];
  await sidebar(f, sideItems, 'Overview');

  const mainX = 256;

  await text(f, mainX + 16, 80, 'Admin Control Panel', 28, COLOR.textDark, 'Bold');
  await text(f, mainX + 16, 116, 'System overview and management tools.', 14, COLOR.textMid, 'Regular');

  // Stats row
  const stats = [
    { label: 'Total Users', val: '47', sub: '5 new this week', color: COLOR.primary },
    { label: 'Active Projects', val: '23', sub: '8 in progress', color: COLOR.info },
    { label: 'Pending Tasks', val: '61', sub: '12 overdue', color: COLOR.warning },
    { label: 'System Health', val: '99.9%', sub: 'All systems go', color: COLOR.success },
  ];
  let sx = mainX + 16;
  for (const s of stats) {
    await statCard(f, sx, 152, s.label, s.val, s.sub, s.color);
    sx += 280;
  }

  // User Management table
  const tbl = card(f, mainX + 16, 288, W - mainX - 32, 280, 'Users');
  await text(tbl, 20, 20, 'User Management', 18, COLOR.textDark, 'SemiBold');
  await button(tbl, tbl.width - 160, 14, '+ Add User', COLOR.primaryBtn, COLOR.navText, 140);
  rect(tbl, 0, 56, tbl.width, 1, COLOR.border);

  const uCols = ['Name', 'Email', 'Role', 'Status', 'Last Active', 'Actions'];
  const uColW = [180, 240, 100, 100, 160, 120];
  let ucx = 20;
  for (let i = 0; i < uCols.length; i++) {
    await text(tbl, ucx, 64, uCols[i], 12, COLOR.textMid, 'SemiBold');
    ucx += uColW[i];
  }

  const users = [
    { name: 'Alice Martin', email: 'alice@acme.com', role: 'Admin', status: 'Active', last: '2 min ago' },
    { name: 'Bob Chen', email: 'bob@acme.com', role: 'Manager', status: 'Active', last: '1h ago' },
    { name: 'Carol White', email: 'carol@client.com', role: 'Client', status: 'Active', last: '3h ago' },
    { name: 'Dave Lopez', email: 'dave@acme.com', role: 'Worker', status: 'Inactive', last: '2d ago' },
  ];
  let ury = 96;
  for (const u of users) {
    rect(tbl, 0, ury - 4, tbl.width, 1, COLOR.bgGray);
    rect(tbl, 20, ury + 2, 28, 28, COLOR.bgGray, 14, 'Avatar');
    await text(tbl, 56, ury + 8, u.name, 13, COLOR.textDark, 'SemiBold');
    await text(tbl, 200, ury + 8, u.email, 13, COLOR.textMid, 'Regular');
    const rc = u.role === 'Admin' ? COLOR.danger : u.role === 'Manager' ? COLOR.primary : u.role === 'Client' ? COLOR.info : COLOR.teal;
    await badge(tbl, 300, ury + 4, u.role, rc);
    const sc2 = u.status === 'Active' ? COLOR.success : COLOR.textLight;
    await badge(tbl, 400, ury + 4, u.status, sc2);
    await text(tbl, 500, ury + 8, u.last, 12, COLOR.textLight, 'Regular');
    await text(tbl, 660, ury + 8, 'Edit  Delete', 12, COLOR.primary, 'SemiBold');
    ury += 40;
  }

  // Roles card
  const rc2 = card(f, mainX + 16, 592, 380, 240, 'Roles');
  await text(rc2, 20, 20, 'Roles & Permissions', 16, COLOR.textDark, 'SemiBold');
  const roles = ['Admin', 'Manager', 'Worker', 'Client'];
  const rolePerms = ['Full Access', '9 Permissions', '6 Permissions', '4 Permissions'];
  let rly = 56;
  for (let i = 0; i < roles.length; i++) {
    rect(rc2, 20, rly, 28, 28, COLOR.bgGray, 14, 'RIcon');
    await text(rc2, 58, rly + 6, roles[i], 14, COLOR.textDark, 'SemiBold');
    await text(rc2, 200, rly + 6, rolePerms[i], 13, COLOR.textMid, 'Regular');
    await text(rc2, 310, rly + 6, 'Edit', 12, COLOR.primary, 'SemiBold');
    rly += 40;
  }

  // Log viewer
  const lv = card(f, mainX + 416, 592, W - mainX - 448, 240, 'Logs');
  await text(lv, 20, 20, 'Recent Activity Log', 16, COLOR.textDark, 'SemiBold');
  rect(lv, 0, 52, lv.width, 36, hex(15, 23, 42), 0, 'LogBg');
  const logLines = [
    '✓  [10:42] alice@acme.com - Logged in',
    '✓  [10:38] Project "Brand Identity" status → Active',
    '!  [10:30] Task "Hero Banner" marked as Late',
    '✓  [10:20] Brief from TechCorp submitted',
    '✓  [10:15] dave@acme.com - Role changed to Worker',
  ];
  let ly2 = 56;
  for (const line of logLines) {
    await text(lv, 16, ly2, line, 11, hex(134, 239, 172), 'Regular', lv.width - 32);
    ly2 += 18;
  }

  return f;
}

// 9. PROJECT DETAIL PAGE
async function createProjectDetailPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '📁 Project Detail');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  // Breadcrumb
  await text(f, 32, 76, 'Dashboard  /  Projects  /  Brand Identity 2025', 13, COLOR.textMid, 'Regular');

  // Project header
  const header = card(f, 32, 100, W - 64, 120, 'ProjectHeader');
  await text(header, 24, 20, 'Brand Identity 2025', 28, COLOR.textDark, 'Bold');
  await badge(header, 24, 60, 'Active', COLOR.success);
  await badge(header, 90, 60, 'Paid', COLOR.info);
  await text(header, 24, 90, 'Client: TechCorp Inc.  •  Manager: John D.  •  Started: Jan 15, 2025', 13, COLOR.textMid, 'Regular');
  // Progress bar
  rect(header, header.width - 260, 30, 220, 8, COLOR.bgGray, 4);
  rect(header, header.width - 260, 30, 143, 8, COLOR.primary, 4);
  await text(header, header.width - 260, 48, '65% Complete', 12, COLOR.textMid, 'Regular');
  await button(header, header.width - 160, 80, 'Edit Project', COLOR.bgGray, COLOR.textDark, 140);

  // Tabs
  const tabs = ['Overview', 'Tasks', 'Team', 'Brief', 'Feedback', 'Files'];
  let tx = 32;
  for (const tab of tabs) {
    const isActive = tab === 'Tasks';
    if (isActive) {
      const tpill = frame(f, tx, 240, 80, 36, COLOR.primary, tab, 8);
      await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
      const ttext = figma.createText();
      ttext.fontName = { family: 'Inter', style: 'SemiBold' };
      ttext.fontSize = 13; ttext.characters = tab;
      ttext.fills = [{ type: 'SOLID', color: COLOR.navText }];
      tpill.appendChild(ttext);
      tpill.resize(ttext.width + 24, 36);
      ttext.x = 12; ttext.y = 10;
      tx += tpill.width + 8;
    } else {
      const tw = tab.length * 8 + 16;
      await text(f, tx + 8, 248, tab, 13, COLOR.textMid, 'Regular');
      tx += tw + 12;
    }
  }
  rect(f, 32, 278, W - 64, 1, COLOR.border);

  // Tasks section
  const taskRows = [
    { title: 'Logo Design', assignee: 'John D.', priority: 'High', status: 'Approved', due: 'Jan 20', score: 92 },
    { title: 'Brand Guidelines', assignee: 'John D.', priority: 'High', status: 'In Progress', due: 'Jan 28', score: null },
    { title: 'Color Palette', assignee: 'Lisa K.', priority: 'Medium', status: 'Completed', due: 'Jan 18', score: 88 },
    { title: 'Typography System', assignee: 'Lisa K.', priority: 'Medium', status: 'Under Review', due: 'Feb 1', score: 76 },
    { title: 'Icon Set', assignee: 'Mark R.', priority: 'Low', status: 'To Do', due: 'Feb 5', score: null },
    { title: 'Stationery Design', assignee: 'Mark R.', priority: 'Low', status: 'To Do', due: 'Feb 10', score: null },
  ];

  await button(f, W - 200, 248, '+ Add Task', COLOR.primaryBtn, COLOR.navText, 150);

  const taskTable = card(f, 32, 296, W - 64, 340, 'Tasks');
  const tCols = ['Task', 'Assignee', 'Priority', 'Status', 'Due Date', 'AI Score', ''];
  const tColW = [280, 120, 100, 140, 100, 100, 80];
  let tcx = 20;
  for (let i = 0; i < tCols.length; i++) {
    await text(taskTable, tcx, 16, tCols[i], 12, COLOR.textMid, 'SemiBold');
    tcx += tColW[i];
  }
  rect(taskTable, 0, 40, taskTable.width, 1, COLOR.border);

  let trowy = 52;
  for (const tr of taskRows) {
    rect(taskTable, 0, trowy - 4, taskTable.width, 1, COLOR.bgGray);
    await text(taskTable, 20, trowy + 6, tr.title, 13, COLOR.textDark, 'SemiBold');
    rect(taskTable, 300, trowy + 4, 24, 24, COLOR.bgGray, 12, 'TAvatar');
    await text(taskTable, 328, trowy + 8, tr.assignee, 12, COLOR.textMid, 'Regular');

    const pc = tr.priority === 'High' ? COLOR.danger : tr.priority === 'Medium' ? COLOR.warning : COLOR.textLight;
    await badge(taskTable, 420, trowy + 4, tr.priority, pc);

    const sc = tr.status === 'Approved' || tr.status === 'Completed' ? COLOR.success :
               tr.status === 'In Progress' ? COLOR.info :
               tr.status === 'Under Review' ? COLOR.warning : COLOR.textLight;
    await badge(taskTable, 520, trowy + 4, tr.status, sc);

    await text(taskTable, 660, trowy + 8, tr.due, 12, COLOR.textMid, 'Regular');
    if (tr.score !== null) {
      const scoreColor = tr.score >= 90 ? COLOR.success : tr.score >= 75 ? COLOR.info : COLOR.warning;
      await text(taskTable, 760, trowy + 8, tr.score + '/100', 13, scoreColor, 'Bold');
    } else {
      await text(taskTable, 760, trowy + 8, '—', 13, COLOR.textLight, 'Regular');
    }
    await text(taskTable, 860, trowy + 8, '⋮', 18, COLOR.textMid, 'Regular');
    trowy += 44;
  }

  // Summary cards on right
  const rightX = W - 320;
  const proj = card(f, rightX, 296, 256, 180, 'ProjSummary');
  await text(proj, 20, 20, 'Project Summary', 15, COLOR.textDark, 'SemiBold');
  rect(proj, 0, 48, 256, 1, COLOR.border);
  const summaryRows = [['Total Tasks', '6'], ['Completed', '3'], ['In Progress', '2'], ['Budget', '$12,400']];
  let sry = 60;
  for (const [k, v] of summaryRows) {
    await text(proj, 20, sry, k, 13, COLOR.textMid, 'Regular');
    await text(proj, 190, sry, v, 13, COLOR.textDark, 'SemiBold');
    sry += 26;
  }

  return f;
}

// 10. GUIDED BRIEF PAGE
async function createGuidedBriefPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '✨ Guided Brief');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  // Left step progress panel
  const stepper = frame(f, 0, 64, 320, H - 64, hex(15, 23, 42), 'Stepper');
  await text(stepper, 24, 32, 'Brief Builder', 20, COLOR.navText, 'Bold');
  await text(stepper, 24, 60, 'AI-guided project intake', 13, COLOR.textLight, 'Regular');

  rect(stepper, 0, 88, 320, 1, { r: 1, g: 1, b: 1, a: 0.1 });

  const steps = [
    { n: '1', label: 'Project Overview', done: true },
    { n: '2', label: 'Goals & Objectives', done: true },
    { n: '3', label: 'Target Audience', done: false, active: true },
    { n: '4', label: 'Design Preferences', done: false },
    { n: '5', label: 'Budget & Timeline', done: false },
    { n: '6', label: 'Review & Submit', done: false },
  ];

  let sy = 108;
  for (const step of steps) {
    const bg = step.active ? COLOR.primary : step.done ? COLOR.success : { r: 1, g: 1, b: 1, a: 0.08 };
    const el = figma.createEllipse();
    el.x = 24; el.y = sy;
    el.resize(32, 32);
    el.fills = [{ type: 'SOLID', color: step.active ? COLOR.primary : step.done ? COLOR.success : { r: 1, g: 1, b: 1, a: 0.12 } }];
    stepper.appendChild(el);
    await text(stepper, 36, sy + 7, step.done ? '✓' : step.n, 13, COLOR.navText, 'Bold');
    const lc = step.active ? COLOR.navText : step.done ? hex(134, 239, 172) : COLOR.textLight;
    await text(stepper, 68, sy + 7, step.label, 14, lc, step.active ? 'SemiBold' : 'Regular');
    sy += 56;
  }

  // Auto-save indicator
  await text(stepper, 24, H - 120, '● Auto-saved 2s ago', 12, COLOR.success, 'Regular');
  await button(stepper, 24, H - 90, 'Save & Exit', { r: 1, g: 1, b: 1, a: 0.1 }, COLOR.navText, 272, 8);

  // Main content area
  const mainX = 340;
  const mainW = W - mainX - 32;

  // Chat/Q&A interface
  const chatCard = card(f, mainX, 80, mainW, H - 160, 'BriefChat');

  // Chat header
  rect(chatCard, 0, 0, mainW, 64, COLOR.navBg, 0, 'ChatHeader');
  rect(chatCard, 0, 0, mainW, 64, COLOR.navBg, 0);
  rect(chatCard, 16, 16, 32, 32, COLOR.primary, 16, 'AIIcon');
  await text(chatCard, 56, 20, 'AgencyFlow Brief Assistant', 15, COLOR.navText, 'Bold');
  await text(chatCard, 56, 40, 'Step 3 of 6: Target Audience', 12, COLOR.textLight, 'Regular');

  // Progress bar
  rect(chatCard, 0, 64, mainW, 6, COLOR.bgGray, 0);
  rect(chatCard, 0, 64, mainW * 0.45, 6, COLOR.primary, 0);

  // Messages
  // AI message
  const aiMsg = frame(chatCard, 16, 88, mainW - 120, 80, hex(241, 245, 249), 'AIMsg', 12);
  await text(aiMsg, 16, 12, "Let's define your target audience. Who are the primary users\nor customers this project is aimed at?", 14, COLOR.textDark, 'Regular', mainW - 160);
  await text(aiMsg, 16, 56, '🤖 AI Assistant  •  Just now', 11, COLOR.textLight, 'Regular');

  // User message
  const userMsg = frame(chatCard, mainW - 360, 184, 340, 72, COLOR.primary, 'UserMsg', 12);
  await text(userMsg, 16, 12, "B2B SaaS companies, 25-45 year old\ndecision makers, tech-savvy professionals", 13, COLOR.navText, 'Regular', 308);
  await text(userMsg, 16, 52, 'You  •  1m ago', 11, { r: 1, g: 1, b: 1, a: 0.6 }, 'Regular');

  // AI follow-up
  const aiMsg2 = frame(chatCard, 16, 272, mainW - 120, 100, hex(241, 245, 249), 'AIMsg2', 12);
  await text(aiMsg2, 16, 12, "Great! Now, what specific pain points or challenges\ndoes your target audience face that this project\nshould address?", 14, COLOR.textDark, 'Regular', mainW - 160);
  await text(aiMsg2, 16, 72, '🤖 AI Assistant  •  Just now', 11, COLOR.textLight, 'Regular');

  // Suggested quick answers
  const suggestions = ['Lack of visibility into workflows', 'Manual processes are time-consuming', 'Difficulty tracking team performance'];
  let sugx = 16;
  for (const sug of suggestions) {
    const sb = frame(chatCard, sugx, 388, 1, 36, COLOR.bg, sug, 18);
    sb.strokes = [{ type: 'SOLID', color: COLOR.primary }];
    sb.strokeWeight = 1;
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const st = figma.createText();
    st.fontName = { family: 'Inter', style: 'Regular' };
    st.fontSize = 12; st.characters = sug;
    st.fills = [{ type: 'SOLID', color: COLOR.primary }];
    sb.appendChild(st);
    sb.resize(st.width + 24, 36);
    st.x = 12; st.y = 10;
    sugx += sb.width + 10;
  }

  // Input area
  rect(chatCard, 0, chatCard.height - 72, mainW, 72, COLOR.bg, 0, 'InputArea');
  rect(chatCard, 0, chatCard.height - 72, mainW, 1, COLOR.border, 0);
  const msgInput = frame(chatCard, 16, chatCard.height - 60, mainW - 100, 44, COLOR.bgGray, 'MsgInput', 22);
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const mit = figma.createText();
  mit.fontName = { family: 'Inter', style: 'Regular' };
  mit.fontSize = 14; mit.characters = 'Type your response...';
  mit.fills = [{ type: 'SOLID', color: COLOR.textLight }];
  msgInput.appendChild(mit);
  mit.x = 16; mit.y = 14;
  await button(chatCard, mainW - 76, chatCard.height - 60, 'Send', COLOR.primaryBtn, COLOR.navText, 60);

  return f;
}

// 11. BRIEF REVIEW PAGE
async function createBriefReviewPage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '📋 Brief Review');
  page.appendChild(f);
  await navbar(f, 'Dashboard');

  await text(f, 32, 76, 'Dashboard  /  Briefs  /  Review', 13, COLOR.textMid, 'Regular');

  // Header
  const header = card(f, 32, 100, W - 64, 88, 'Header');
  await text(header, 24, 16, 'Brand Identity 2025 — Brief Review', 22, COLOR.textDark, 'Bold');
  await text(header, 24, 48, 'Submitted by TechCorp Inc.  •  2 hours ago  •  Session #BR-2025-001', 13, COLOR.textMid, 'Regular');
  await badge(header, header.width - 280, 20, 'Submitted', COLOR.info);
  await button(header, header.width - 200, 16, '✓ Validate', COLOR.success, COLOR.navText, 100);
  await button(header, header.width - 90, 16, '✗ Reject', COLOR.danger, COLOR.navText, 80);

  // Two panel layout
  const leftW = 680;
  const briefContent = card(f, 32, 208, leftW, 560, 'Brief');
  await text(briefContent, 24, 20, 'Brief Content', 18, COLOR.textDark, 'SemiBold');
  rect(briefContent, 0, 52, leftW, 1, COLOR.border);

  const sections = [
    { title: 'Project Overview', content: 'We need a complete brand identity system for our B2B SaaS platform. The brand should feel professional, modern, and trustworthy while also conveying innovation and efficiency.' },
    { title: 'Target Audience', content: 'B2B SaaS companies, decision makers aged 25-45, tech-savvy professionals who struggle with workflow visibility and manual processes.' },
    { title: 'Design Preferences', content: 'Clean, minimal aesthetic. Primary colors: deep blue and white. Secondary: teal accent. Style references: Stripe, Linear, Notion.' },
    { title: 'Budget & Timeline', content: 'Budget: $12,000 - $15,000. Timeline: 6 weeks from kickoff. Key milestone: Logo delivery in 2 weeks.' },
    { title: 'Deliverables', content: 'Logo system (primary, secondary, icon), color palette, typography guide, brand guidelines PDF, social media templates, business card design.' },
  ];

  let secY = 64;
  for (const sec of sections) {
    await text(briefContent, 24, secY, sec.title, 14, COLOR.textDark, 'SemiBold');
    await text(briefContent, 24, secY + 24, sec.content, 13, COLOR.textMid, 'Regular', leftW - 48);
    secY += 92;
    rect(briefContent, 0, secY - 12, leftW, 1, COLOR.bgGray);
  }

  // Right panel - Actions
  const rightX = 32 + leftW + 16;
  const rightW = W - rightX - 32;

  // Clarification request
  const clarCard = card(f, rightX, 208, rightW, 200, 'Clarification');
  await text(clarCard, 20, 20, 'Request Clarification', 16, COLOR.textDark, 'SemiBold');
  rect(clarCard, 0, 52, rightW, 1, COLOR.border);
  const clarInput = frame(clarCard, 20, 64, rightW - 40, 80, COLOR.bgGray, 'ClarInput', 8);
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const ct = figma.createText();
  ct.fontName = { family: 'Inter', style: 'Regular' };
  ct.fontSize = 13; ct.characters = 'Ask the client to provide more details\nabout their design preferences...';
  ct.fills = [{ type: 'SOLID', color: COLOR.textLight }];
  clarCard.appendChild(ct);
  ct.x = 36; ct.y = 76;
  await button(clarCard, 20, 158, 'Send Clarification Request', COLOR.warning, COLOR.navText, rightW - 40);

  // Brief score
  const scoreCard = card(f, rightX, 424, rightW, 160, 'Score');
  await text(scoreCard, 20, 20, 'Brief Quality Score', 16, COLOR.textDark, 'SemiBold');
  rect(scoreCard, 0, 52, rightW, 1, COLOR.border);
  // Score circle
  const scoreCircle = figma.createEllipse();
  scoreCircle.x = rightW / 2 - 44; scoreCircle.y = 68;
  scoreCircle.resize(88, 88);
  scoreCircle.fills = [{ type: 'SOLID', color: COLOR.bgGray }];
  scoreCircle.strokes = [{ type: 'SOLID', color: COLOR.success }];
  scoreCircle.strokeWeight = 6;
  scoreCard.appendChild(scoreCircle);
  await text(scoreCard, rightW / 2 - 16, 98, '84', 28, COLOR.success, 'Bold');
  await text(scoreCard, rightW / 2 - 30, 130, '/100 — Good', 13, COLOR.textMid, 'Regular');

  // Convert to project button
  await button(f, rightX, 600, 'Convert to Project', COLOR.primaryBtn, COLOR.navText, rightW);

  return f;
}

// 12. PROFILE PAGE
async function createProfilePage(page) {
  const f = frame(null, 0, 0, W, H, COLOR.bgGray, '👤 Profile');
  page.appendChild(f);
  await navbar(f, 'Profile');

  await text(f, 32, 76, 'Account Settings', 28, COLOR.textDark, 'Bold');

  // Profile card
  const profCard = card(f, 32, 120, 320, 420, 'ProfileCard');
  // Avatar
  const avatar = figma.createEllipse();
  avatar.x = 110; avatar.y = 32;
  avatar.resize(100, 100);
  avatar.fills = [{ type: 'SOLID', color: COLOR.primary }];
  profCard.appendChild(avatar);
  await text(profCard, 148, 148, 'AD', 28, COLOR.navText, 'Bold');
  await text(profCard, 60, 148, 'Alice Dupont', 20, COLOR.textDark, 'Bold', 200);
  await text(profCard, 60, 176, 'alice@agencyflow.com', 14, COLOR.textMid, 'Regular', 200);
  await badge(profCard, 100, 208, 'Admin', COLOR.danger);
  rect(profCard, 0, 244, 320, 1, COLOR.border);
  const stats2 = [['Projects', '23'], ['Tasks Done', '142'], ['Score', '96%']];
  let psx = 24;
  for (const [k, v] of stats2) {
    await text(profCard, psx, 264, v, 22, COLOR.primary, 'Bold');
    await text(profCard, psx, 294, k, 12, COLOR.textMid, 'Regular');
    psx += 96;
  }
  rect(profCard, 0, 324, 320, 1, COLOR.border);
  const menuItems = ['Edit Profile', 'Change Password', 'Notifications', 'Logout'];
  let miy = 336;
  for (const mi of menuItems) {
    await text(profCard, 24, miy, mi, 14, mi === 'Logout' ? COLOR.danger : COLOR.textDark, 'Medium');
    await text(profCard, 280, miy, '›', 16, COLOR.textLight, 'Regular');
    miy += 36;
  }

  // Edit form
  const formCard = card(f, 368, 120, W - 400, 420, 'EditForm');
  await text(formCard, 24, 24, 'Edit Profile', 20, COLOR.textDark, 'Bold');
  rect(formCard, 0, 60, formCard.width, 1, COLOR.border);

  await input(formCard, 24, 100, 380, 'Alice', 'First Name');
  await input(formCard, 420, 100, 380, 'Dupont', 'Last Name');
  await input(formCard, 24, 200, 776, 'alice@agencyflow.com', 'Email Address');
  await input(formCard, 24, 300, 376, 'Agency Manager', 'Job Title');
  await input(formCard, 416, 300, 384, 'AgencyFlow Paris', 'Company');

  await button(formCard, 24, 380, 'Save Changes', COLOR.primaryBtn, COLOR.navText, 200);
  await button(formCard, 240, 380, 'Cancel', COLOR.bgGray, COLOR.textDark, 120);

  return f;
}

// 13. 404 PAGE
async function create404Page(page) {
  const f = frame(null, 0, 0, W, H, hex(15, 23, 42), '❌ 404 Not Found');
  page.appendChild(f);

  await navbar(f, '');

  // Center content
  await text(f, W/2 - 80, H/2 - 140, '404', 120, COLOR.primary, 'Bold');
  await text(f, W/2 - 200, H/2 + 0, 'Page Not Found', 36, COLOR.navText, 'Bold');
  await text(f, W/2 - 240, H/2 + 52, "Sorry, the page you're looking for doesn't exist or has been moved.", 16, COLOR.textLight, 'Regular', 480);
  await button(f, W/2 - 90, H/2 + 120, '← Back to Home', COLOR.primaryBtn, COLOR.navText, 180);

  return f;
}

// ─── MAIN RUNNER ─────────────────────────────────────────────

async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  // Create pages
  const pageNames = [
    '🏠 Public',
    '👤 Client',
    '🗂 Manager',
    '👷 Worker',
    '⚙️ Admin',
    '📁 Project',
    '✨ Brief',
    '👤 Profile',
    '❌ 404'
  ];

  // Use the current page or create new ones
  const existingPage = figma.currentPage;
  existingPage.name = '🏠 Public';

  const pages = [existingPage];
  for (let i = 1; i < pageNames.length; i++) {
    const p = figma.createPage();
    p.name = pageNames[i];
    pages.push(p);
  }

  // Build frames on each page
  figma.currentPage = pages[0];
  await createHomePage(pages[0]);
  await createHowItWorksPage(pages[0]);
  await createLoginPage(pages[0]);
  await createSignupPage(pages[0]);

  figma.currentPage = pages[1];
  await createClientDashboard(pages[1]);

  figma.currentPage = pages[2];
  await createManagerDashboard(pages[2]);

  figma.currentPage = pages[3];
  await createWorkerDashboard(pages[3]);

  figma.currentPage = pages[4];
  await createAdminDashboard(pages[4]);

  figma.currentPage = pages[5];
  await createProjectDetailPage(pages[5]);

  figma.currentPage = pages[6];
  await createGuidedBriefPage(pages[6]);
  await createBriefReviewPage(pages[6]);

  figma.currentPage = pages[7];
  await createProfilePage(pages[7]);

  figma.currentPage = pages[8];
  await create404Page(pages[8]);

  // Go back to first page
  figma.currentPage = pages[0];
  figma.viewport.scrollAndZoomIntoView(pages[0].children);

  figma.notify('✅ AgencyFlow design generated! ' + (pages.reduce((acc, p) => acc + p.children.length, 0)) + ' screens created across ' + pages.length + ' pages.');

  figma.closePlugin();
}

main().catch(err => {
  figma.notify('❌ Error: ' + err.message);
  figma.closePlugin();
});
