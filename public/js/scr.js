///////////////////////////// เริ่มต้นแสดง section1//////////////////////////
document.getElementById('section0').classList.add('active');

// ไฮไลท์ปุ่มที่เลือก
const answerButtons = document.querySelectorAll('#section8 .answer-btn');

answerButtons.forEach(btn => {
  btn.addEventListener('click', function () {
    // เอาคลาส active ออกจากปุ่มทุกปุ่ม
    answerButtons.forEach(b => b.style.background = '#fff');
    answerButtons.forEach(b => b.style.color = '#333');

    // ไฮไลท์ปุ่มที่คลิก
    this.style.background = '#dfc4aa';
    this.style.color = '#333';

    // ไป section ถัดไปหลังเลือก
    const nextId = this.dataset.next;
    if (nextId) {
      document.getElementById('section8').classList.remove('active');
      document.getElementById(nextId).classList.add('active');
    }
  });
});


////////////////////////
// ประกาศ socket ก่อนใช้งาน
const socket = io();

// ดึง element
const display = document.getElementById('display');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('sendBtn');
const stickers = document.querySelectorAll('#stickers .sticker');

// ฟังก์ชันส่งสติ๊กเกอร์
function sendSticker(sticker) {
  socket.emit('sendSticker', sticker);
}

// ฟังก์ชันส่งข้อความ (ส่งเป็น "sticker" เหมือนกัน)
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('sendSticker', text); // ถ้าต้องการแยก message กับ sticker ต้องสร้าง event ใหม่
  messageInput.value = '';
}

// ผูก event
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// ผูก event ให้สติ๊กเกอร์
stickers.forEach(sticker => {
  sticker.addEventListener('click', () => {
    sendSticker(sticker.textContent);
  });
});

// รับสติ๊กเกอร์/ข้อความจาก server แล้วแสดง animation
socket.on('receiveSticker', (sticker) => {
  const s = document.createElement('div');
  s.textContent = sticker;
  s.className = 'floating';
  s.style.left = Math.random() * (window.innerWidth - 50) + 'px';
  s.style.top = window.innerHeight + 'px';
  display.appendChild(s);

  setTimeout(() => display.removeChild(s), 3000);
});


//////////////////////////////////////////////////////
function setupNextButton(nextBtnId, currentSectionId, nextSectionId) {
  document.getElementById(nextBtnId).addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById(currentSectionId).classList.remove('active');
    document.getElementById(nextSectionId).classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupNextButton('nextBtn0', 'section0', 'section1');
  setupNextButton('nextBtn1', 'section1', 'section2');
  setupNextButton('nextBtn2', 'section2', 'section3');
  setupNextButton('nextBtn3', 'section5', 'section6');
  setupNextButton('nextBtn4', 'section6', 'section7');
  setupNextButton('nextBtn5', 'section7', 'section8');
});


// กำหนด event submit สำหรับฟอร์มที่ section3
const form = document.querySelector('#section3 form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.checkValidity()) {
    document.getElementById('section3').classList.remove('active');
    document.getElementById('section4').classList.add('active');
  } else {
    form.reportValidity();
  }
});



document.getElementById('btnNotUnderstand').addEventListener('click', function (e) {
  e.stopPropagation(); // ป้องกันไม่ให้ event เด้งไป body
  document.getElementById('section4').classList.remove('active');
  document.getElementById('section5').classList.add('active');
});

document.getElementById('btnUnderstand').addEventListener('click', function (e) {
  e.stopPropagation(); // กันไม่ให้ข้าม section9
  document.getElementById('section4').classList.remove('active');
  document.getElementById('section5').classList.add('active');
});

document.getElementById('btnNotUnderstand2').addEventListener('click', function (e) {
  e.stopPropagation(); // กันไม่ให้คลิกทะลุไป body
  window.location.hash = 'section4';
});
document.getElementById('btnUnderstand2').addEventListener('click', function (e) {
  e.stopPropagation(); // กันไม่ให้คลิกทะลุไป body
  window.location.hash = 'section9';
});

////////////////////////////////////////////
function openSectionFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const allSections = document.querySelectorAll(
      '#section0 ,#section1, #section2, #section3, #section4, #section5, #section6, #section7, #section8, #section9'
    );
    allSections.forEach(sec => sec.classList.remove('active'));

    const targetSection = document.getElementById(hash);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }
}


openSectionFromHash();

//////////////////////////////////////////////////////////////////////////////
window.addEventListener('hashchange', openSectionFromHash);
document.getElementById('profileForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = document.getElementById('nameInput').value.trim();
  const age = parseInt(document.getElementById('ageInput').value);
  const gender = document.getElementById('genderSelect').value;

  if (!name || !age || !gender) {
    alert('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  try {
    const res = await fetch('/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, gender })
    });

    const data = await res.json();
    if (data.success) {

      localStorage.setItem('profileId', data.profileId);

    } else {
      alert(data.message || 'เกิดข้อผิดพลาด');
    }
  } catch (err) {
    console.error(err);

  }
});

////////////////////////////////เสียง///////////////////////////////
let currentAudio = null;
let isPlaying = false;
let typingTimeout;

function playText(sectionId) {
  const textEl = document.getElementById('nicotineText' + sectionId);
  const audio = document.getElementById('voice' + sectionId);
  const nextBtn = document.getElementById('nextBtn' + (sectionId - 2)); // nextBtn3 → section5, nextBtn4 → section6

  if (!textEl || !audio) return;

  // ถ้ากำลังเล่นอยู่ → แตะครั้งที่ 2 ข้ามไป next
  if (isPlaying) {
    clearTimeout(typingTimeout);
    textEl.textContent = textEl.dataset.fullText;
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    if (nextBtn) {
      nextBtn.style.pointerEvents = 'auto';
      nextBtn.style.opacity = '1';
    }
    return;
  }

  // บันทึกข้อความเต็ม
  if (!textEl.dataset.fullText) textEl.dataset.fullText = textEl.textContent;
  const fullText = textEl.dataset.fullText;

  // หยุดเสียงเก่า
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = audio;

  // ปิดปุ่ม Next จนกว่าจะเล่นจบ
  if (nextBtn) {
    nextBtn.style.pointerEvents = 'none';
    nextBtn.style.opacity = '0.5';
  }

  textEl.textContent = '';
  audio.load();
  audio.play().catch(err => console.log('Play blocked:', err));
  isPlaying = true;

  // พิมพ์ข้อความทีละตัวอักษร
  let charIndex = 0;
  function typeNextChar() {
    textEl.textContent += fullText[charIndex];
    charIndex++;
    if (charIndex < fullText.length) {
      typingTimeout = setTimeout(typeNextChar, 72);
    } else {
      // พิมพ์จบ → รอเสียงจบ
      audio.onended = () => {
        isPlaying = false;
        if (nextBtn) {
          nextBtn.style.pointerEvents = 'auto';
          nextBtn.style.opacity = '1';
        }
      };
    }
  }
  typeNextChar();

  // แตะ section ขณะพิมพ์ → ข้ามข้อความ + หยุดเสียง + เปิด next
  const sectionEl = document.getElementById('section' + sectionId);
  sectionEl.addEventListener('click', function () {
    if (isPlaying) {
      clearTimeout(typingTimeout);
      textEl.textContent = fullText;
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
      if (nextBtn) {
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.style.opacity = '1';
      }
    }
  }, { once: true });
}

// เปิด nextBtn ให้กดไป section ถัดไป
document.getElementById('nextBtn3').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('section5').classList.remove('active');
  document.getElementById('section6').classList.add('active');
});

document.getElementById('nextBtn4').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('section6').classList.remove('active');
  document.getElementById('section7').classList.add('active');
});

document.getElementById('nextBtn5').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('section7').classList.remove('active');
  // ถัดไป section8 ถ้ามี
  document.getElementById('section8')?.classList.add('active');
});
