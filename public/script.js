/**
 * 🌟 LoveChat - كود مصحح 100%
 */

const App = {
  user: null,
  chat: null,
  peer: null,
  stream: null,
  activeCall: null,
  incCall: null,
  rec: null,
  channel: new BroadcastChannel('chat_v2'),

  // 🚀 تهيئة التطبيق بعد تحميل الصفحة
  init() {
    console.log('✅ App initializing...');
    
    // ربط زر الدخول
    const form = document.getElementById('login-form');
    if (form) {
      form.onsubmit = (e) => { e.preventDefault(); this.login(); };
      console.log('🔗 Login form connected');
    }

    // استعادة الجلسة إذا وجدت
    const saved = localStorage.getItem('session');
    if (saved) {
      try {
        this.user = JSON.parse(saved);
        this._showChat();
      } catch(e) { localStorage.removeItem('session'); }
    }
  },

  // 🔐 تسجيل الدخول
  login() {
    console.log('🔐 Login attempt...');
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value; // اختياري
    
    if (!u) {
      alert('⚠️ يرجى إدخال اسم المستخدم');
      return;
    }

    try {
      this.user = {
        id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: u,
        pass: p || '',
        av: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u) + '&background=6366f1&color=fff',
        joined: new Date().toISOString()
      };

      console.log('✅ User created:', this.user);
      localStorage.setItem('session', JSON.stringify(this.user));
      this._saveUser(this.user);
      this._showChat();
    } catch (err) {
      console.error('❌ Login error:', err);
      alert('حدث خطأ أثناء الدخول: ' + err.message);
    }
  },

  // 🔄 إظهار شاشة الشات
  _showChat() {
    console.log('📱 Showing chat screen...');
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('chat-screen').classList.add('active');
    
    document.getElementById('my-name').textContent = this.user.name;
    document.getElementById('my-av').src = this.user.av;
    
    // تهيئة الأزرار
    document.getElementById('snd').onclick = () => this.sendText();
    document.getElementById('txt').onkeypress = (e) => e.key === 'Enter' && this.sendText();
    document.getElementById('att').onclick = () => document.getElementById('file').click();
    document.getElementById('file').onchange = (e) => this.handleFile(e);
    
    // الميكروفون
    const mic = document.getElementById('mic');
    mic.onmousedown = () => this.startRec();
    mic.onmouseup = () => this.stopRec();
    mic.ontouchstart = (e) => { e.preventDefault(); this.startRec(); };
    mic.ontouchend = (e) => { e.preventDefault(); this.stopRec(); };

    // PeerJS
    this.peer = new Peer(this.user.id, { host: '0.peerjs.com', port: 443, path: '/', secure: true });
    this.peer.on('open', (id) => console.log('🔗 PeerJS ID:', id));
    this.peer.on('call', (call) => this._handleIncomingCall(call));
    
    this._loadUsers();
    this.channel.onmessage = (e) => {
      if (e.data.t === 'users') this._loadUsers();
      if (e.data.t === 'msg' && this.chat) this._loadMsgs();
    };
    this.channel.postMessage({ t: 'users' });
  },

  // 👥 تحميل المستخدمين
  _loadUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const list = document.getElementById('ulist');
    if (!list) return;
    list.innerHTML = '';
    
    users.filter(u => u.id !== this.user?.id).forEach(u => {
      const d = document.createElement('div');
      d.className = 'u';
      d.innerHTML = `
        <img src="${u.av}" class="av">
        <div class="u-info"><div class="name">${u.name}</div></div>
        <div class="u-acts">
          <button class="icon" onclick="App.call('${u.id}','audio')">📞</button>
          <button class="icon" onclick="App.call('${u.id}','video')">📹</button>
        </div>`;
      d.onclick = (e) => {
        if (!e.target.closest('.u-acts')) this.openChat(u);
      };
      list.appendChild(d);
    });
  },

  _saveUser(u) {
    const arr = JSON.parse(localStorage.getItem('users') || '[]');
    if (!arr.some(x => x.id === u.id)) {
      arr.push(u);
      localStorage.setItem('users', JSON.stringify(arr));
    }
  },

  // 💬 فتح محادثة
  openChat(u) {
    this.chat = u;
    document.getElementById('c-name').textContent = u.name;
    document.getElementById('c-av').src = u.av;
    document.getElementById('c-st').textContent = 'متصل';
    this._loadMsgs();
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('show');
  },

  back() { document.getElementById('sidebar').classList.add('show'); },

  // 📜 رسائل
  _loadMsgs() {
    if (!this.chat) return;
    const k = 'm_' + [this.user.id, this.chat.id].sort().join('_');
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    const box = document.getElementById('msgs');
    if (!box) return;
    
    box.innerHTML = '';
    if (!arr.length) {
      box.innerHTML = '<div class="empty">💬 ابدأ المحادثة الآن</div>';
      return;
    }
    
    arr.forEach(m => {
      const me = m.uid === this.user.id;
      let c = m.tp === 'text' ? `<div>${m.ct}</div>` : 
              m.tp === 'img' ? `<img src="${m.ct}">` : 
              m.tp === 'vid' ? `<video controls src="${m.ct}"></video>` : 
              `<audio controls src="${m.ct}"></audio>`;
              
      box.innerHTML += `
        <div class="msg ${me ? 'me' : ''}">
          ${!me ? `<div class="name">${m.un}</div>` : ''}
          ${c}
          <div class="meta"><span>${m.tm}</span></div>
        </div>`;
    });
    box.scrollTop = 9999;
  },

  sendText() {
    const i = document.getElementById('txt');
    const t = i.value.trim();
    if (!t || !this.chat) return;
    this._add({ tp: 'text', ct: t });
    i.value = '';
  },

  _add(m) {
    const k = 'm_' + [this.user.id, this.chat.id].sort().join('_');
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.push({
      ...m,
      uid: this.user.id,
      un: this.user.name,
      tm: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      i: Date.now().toString()
    });
    if (arr.length > 200) arr.shift();
    localStorage.setItem(k, JSON.stringify(arr));
    this._loadMsgs();
    this.channel.postMessage({ t: 'msg' });
  },

  // 📎 وسائط
  handleFile(e) {
    const f = e.target.files[0];
    if (!f || !this.chat) return;
    const r = new FileReader();
    r.onload = (ev) => this._add({ tp: f.type.startsWith('image') ? 'img' : 'vid', ct: ev.target.result });
    r.readAsDataURL(f);
    e.target.value = '';
  },

  // 🎤 صوت
  startRec() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      this.stream = s;
      this.rec = new MediaRecorder(s);
      const c = [];
      this.rec.ondataavailable = (e) => c.push(e.data);
      this.rec.onstop = () => {
        const b = new Blob(c, { type: 'audio/webm' });
        const r = new FileReader();
        r.onload = (ev) => this._add({ tp: 'aud', ct: ev.target.result });
        r.readAsDataURL(b);
        s.getTracks().forEach(t => t.stop());
        this.stream = null;
      };
      this.rec.start();
      document.getElementById('mic').classList.add('rec');
    }).catch(() => alert('يرجى السماح بالوصول للميكروفون'));
  },

  stopRec() {
    if (this.rec?.state === 'recording') {
      this.rec.stop();
      document.getElementById('mic').classList.remove('rec');
    }
  },

  // 📞 مكالمات
  call(target, type) {
    if (typeof target === 'string') { this._startCall(target, type); return; }
    const id = prompt('أدخل معرف المستخدم:');
    if (!id) return;
    this._startCall(id, target);
  },

  _startCall(id, type) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' }).then(s => {
      this.stream = s;
      this.activeCall = this.peer.call(id, s);
      this.activeCall.metadata = { type };
      document.getElementById('call-screen').classList.remove('hidden');
      document.getElementById('loc').srcObject = s;
      document.getElementById('call-nm').textContent = this.chat?.name || 'مستخدم';
      document.getElementById('cam-btn').style.display = type === 'video' ? 'flex' : 'none';
      this.activeCall.on('stream', (r) => {
        document.getElementById('rem').srcObject = r;
        document.getElementById('call-st').textContent = 'متصل 🎉';
      });
    }).catch(() => alert('فشل الوصول للكاميرا/الميكروفون'));
  },

  _handleIncomingCall(call) {
    if (!this.user || document.getElementById('call-screen').classList.contains('active')) {
      call.close(); return;
    }
    this.incCall = call;
    document.getElementById('inc-nm').textContent = 'مكالسة واردة';
    document.getElementById('inc-type').textContent = call.metadata?.type === 'video' ? '📹 مرئية' : '📞 صوتية';
    document.getElementById('inc-modal').classList.remove('hidden');
  },

  accept() {
    document.getElementById('inc-modal').classList.add('hidden');
    if (!this.incCall) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: this.incCall.metadata?.type === 'video' }).then(s => {
      this.stream = s;
      this.activeCall = this.incCall;
      this.incCall.answer(s);
      document.getElementById('call-screen').classList.remove('hidden');
      document.getElementById('loc').srcObject = s;
      this.activeCall.on('stream', (r) => {
        document.getElementById('rem').srcObject = r;
        document.getElementById('call-st').textContent = 'متصل 🎉';
      });
    }).catch(() => { this.reject(); alert('فشل'); });
  },

  reject() {
    if (this.incCall) { this.incCall.close(); this.incCall = null; }
    document.getElementById('inc-modal').classList.add('hidden');
  },

  endCall() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.activeCall) this.activeCall.close();
    document.getElementById('call-screen').classList.add('hidden');
    document.getElementById('rem').srcObject = null;
    this.stream = null; this.activeCall = null; this.incCall = null;
  },

  mute() {
    if (!this.stream) return;
    const t = this.stream.getAudioTracks()[0];
    if (t) {
      const m = !t.enabled;
      t.enabled = m;
      document.querySelector('#call-screen .ctrl:first-child').textContent = m ? '🔇' : '🔊';
    }
  },

  cam() {
    if (!this.stream) return;
    const v = this.stream.getVideoTracks()[0];
    if (v) {
      const n = v.getSettings().facingMode === 'user' ? 'environment' : 'user';
      navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: n } }).then(ns => {
        this.stream.getVideoTracks()[0].stop();
        this.stream = ns;
        document.getElementById('loc').srcObject = ns;
      });
    }
  }
};

// 🚀 تشغيل التطبيق بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 LoveChat Loaded');
  App.init();
});
