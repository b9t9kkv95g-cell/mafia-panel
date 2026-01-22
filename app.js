document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderPlayers();
    renderVotingButtons();
    initTimer();
    initNightActions();
    initRestart();
}

let soundPlayed = false;
let audioContext = null;

// --- PLAYERS LOGIC ---
const ROLES = [
    { value: 'citizen', label: 'Мирный', class: '' },
    { value: 'mafia', label: 'Мафия', class: 'mafia' },
    { value: 'don', label: 'Дон', class: 'don' },
    { value: 'sheriff', label: 'Шериф', class: 'sheriff' },
    { value: 'doc', label: 'Доктор', class: 'sheriff' }
];

function renderPlayers() {
    const list = document.getElementById('players-list');
    list.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.id = `player-row-${i}`;
        row.innerHTML = `
            <div class="player-num">${i}</div>
            <input type="text" class="player-input" id="p-name-${i}" placeholder="Игрок ${i}" oninput="updateNightSelects()">
            <select class="role-select" onchange="updateRoleColor(this)">
                ${ROLES.map(r => `<option value="${r.value}" class="${r.class}">${r.label}</option>`).join('')}
            </select>
            <div class="player-controls-group">
                <div class="control-cluster fouls">
                    <div class="foul-dot" onclick="toggleDot(this)"></div>
                    <div class="foul-dot" onclick="toggleDot(this)"></div>
                    <div class="foul-dot" onclick="toggleDot(this)"></div>
                    <div class="foul-dot" onclick="toggleDot(this)"></div>
                </div>
                <div class="control-cluster preds">
                    <div class="pred-dot" onclick="toggleDot(this)"></div>
                    <div class="pred-dot" onclick="toggleDot(this)"></div>
                </div>
                <div class="control-cluster lift">
                    <button class="lift-btn" onclick="toggleLift(${i})">
                        <i class="fas fa-skull"></i>
                    </button>
                    <button class="revive-btn" onclick="revivePlayer(${i})" style="display:none;" title="Вернуть в игру">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            </div>
        `;
        list.appendChild(row);
    }

    document.getElementById('btn-shuffle').addEventListener('click', shuffleRoles);
    updateNightSelects();
}

window.revivePlayer = function(index) {
    if (confirm(`Вернуть игрока ${index} в игру?`)) {
        const row = document.getElementById(`player-row-${index}`);
        if (row) {
            row.classList.remove('dead');
            row.querySelectorAll('input, select, .foul-dot, .pred-dot').forEach(el => el.style.pointerEvents = 'auto');
            const liftBtn = row.querySelector('.lift-btn');
            const reviveBtn = row.querySelector('.revive-btn');
            if (liftBtn) liftBtn.style.display = 'flex';
            if (reviveBtn) reviveBtn.style.display = 'none';
            updateNightSelects();
            checkWinCondition();
        }
    }
};

function updateRoleColor(select) {
    select.className = 'role-select';
    const selected = select.options[select.selectedIndex];
    if (selected.className) {
        select.classList.add(selected.className);
    }
}

window.toggleDot = function(dot) {
    dot.classList.toggle('active');
};

window.toggleLift = function(index) {
    if (confirm(`Удалить игрока ${index}?`)) {
        const row = document.getElementById(`player-row-${index}`);
        if (row) {
            row.classList.add('dead');
            row.querySelectorAll('input, select, .foul-dot, .pred-dot').forEach(el => el.style.pointerEvents = 'none');
            const liftBtn = row.querySelector('.lift-btn');
            const reviveBtn = row.querySelector('.revive-btn');
            if (liftBtn) liftBtn.style.display = 'none';
            if (reviveBtn) reviveBtn.style.display = 'flex';
            updateNightSelects();
            checkWinCondition();
        }
    }
};

function shuffleRoles() {
    let deck = ['don', 'mafia', 'mafia', 'sheriff', 'doc', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen'];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const selects = document.querySelectorAll('.role-select');
    selects.forEach((select, index) => {
        select.value = deck[index] || 'citizen';
        updateRoleColor(select);
    });
}

// --- NIGHT PHASE LOGIC ---
function updateNightSelects() {
    const selects = ['action-mafia', 'action-don', 'action-sheriff', 'action-doc'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-</option>';
        for (let i = 1; i <= 10; i++) {
            const row = document.getElementById(`player-row-${i}`);
            const isDead = row && row.classList.contains('dead');
            const name = document.getElementById(`p-name-${i}`).value || `Игрок ${i}`;
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${i}. ${name} ${isDead ? '(💀)' : ''}`;
            sel.appendChild(opt);
        }
        sel.value = currentVal;
    });
}

function initNightActions() {
    document.getElementById('btn-process-night').addEventListener('click', processNight);
}

function processNight() {
    const mafTarget = document.getElementById('action-mafia').value;
    const donTarget = document.getElementById('action-don').value;
    const sherTarget = document.getElementById('action-sheriff').value;
    const docTarget = document.getElementById('action-doc').value;
    const resultDiv = document.getElementById('night-result');
    let logs = [];

    if (docTarget) {
        logs.push(`💊 Доктор лечил игрока ${docTarget}.`);
    }

    if (mafTarget) {
        if (mafTarget === docTarget) {
            logs.push(`🔫 Мафия стреляла в ${mafTarget}, но 💊 Доктор спас!`);
        } else {
            logs.push(`💀 Игрок ${mafTarget} убит мафией.`);
            const row = document.getElementById(`player-row-${mafTarget}`);
            if (row) {
                row.classList.add('dead');
                row.querySelectorAll('input, select, .foul-dot, .pred-dot').forEach(el => el.style.pointerEvents = 'none');
                const liftBtn = row.querySelector('.lift-btn');
                const reviveBtn = row.querySelector('.revive-btn');
                if (liftBtn) liftBtn.style.display = 'none';
                if (reviveBtn) reviveBtn.style.display = 'flex';
            }
        }
    }

    if (donTarget) logs.push(`👑 Дон проверил ${donTarget}.`);
    if (sherTarget) logs.push(`⭐ Шериф проверил ${sherTarget}.`);

    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    resultDiv.textContent = `[${timestamp}] ` + logs.join(' ');

    const mainNotes = document.getElementById('game-notes');
    mainNotes.value += `\n--- Ночь (${timestamp}) ---\n` + logs.join('\n') + '\n';
    mainNotes.scrollTop = mainNotes.scrollHeight;

    document.getElementById('action-mafia').value = "";
    document.getElementById('action-don').value = "";
    document.getElementById('action-sheriff').value = "";
    document.getElementById('action-doc').value = "";

    checkWinCondition();
}

// --- VOTING LOGIC ---
let votingList = [];

function renderVotingButtons() {
    const container = document.getElementById('voting-buttons');
    container.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.textContent = i;
        btn.onclick = () => toggleCandidate(i, btn);
        container.appendChild(btn);
    }
}

function toggleCandidate(num, btn) {
    const index = votingList.indexOf(num);
    if (index === -1) {
        votingList.push(num);
        btn.classList.add('selected');
    } else {
        votingList.splice(index, 1);
        btn.classList.remove('selected');
    }
    updateVotingDisplay();
}

function updateVotingDisplay() {
    const display = document.getElementById('voting-order-display');
    display.innerHTML = '';
    votingList.forEach(num => {
        const chip = document.createElement('div');
        chip.className = 'candidate-chip';
        chip.innerHTML = `<span>${num}</span> <i class="fas fa-times" onclick="removeCandidate(${num})" style="cursor:pointer;font-size:0.8rem;"></i>`;
        display.appendChild(chip);
    });
}

window.removeCandidate = function(num) {
    const buttons = document.querySelectorAll('.vote-btn');
    buttons.forEach(btn => {
        if (parseInt(btn.textContent) === num) btn.classList.remove('selected');
    });
    const index = votingList.indexOf(num);
    if (index > -1) {
        votingList.splice(index, 1);
        updateVotingDisplay();
    }
};

// --- TIMER LOGIC (ОПТИМИЗИРОВАНО ДЛЯ iOS) ---
let timerInterval;
let seconds = 60;
let isRunning = false;

function initTimer() {
    const display = document.getElementById('timer');
    const startBtn = document.getElementById('btn-start');
    const pauseBtn = document.getElementById('btn-pause');
    const resetBtn = document.getElementById('btn-reset');
    const set130Btn = document.getElementById('btn-set130');
    const timerBeep = document.getElementById('timer-beep');
    
    // Инициализация AudioContext для iOS
    function initAudioContext() {
        if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext создан");
            } catch (e) {
                console.log("Ошибка создания AudioContext:", e);
            }
        }
    }
    
    // Активация аудио для iOS (требуется user gesture)
    function activateAudioForIOS() {
        // Активируем AudioContext
        initAudioContext();
        
        // Пробуем активировать аудио элемент
        if (timerBeep) {
            timerBeep.volume = 0.001;
            timerBeep.play().then(() => {
                timerBeep.pause();
                timerBeep.currentTime = 0;
                timerBeep.volume = 1;
            }).catch(e => {
                console.log("iOS audio activation failed:", e);
            });
        }
        
        // Активируем AudioContext если он в suspended состоянии
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext активирован");
            });
        }
    }
    
    // Активируем аудио при первом касании
    document.addEventListener('touchstart', activateAudioForIOS, { once: true });
    
    // Активируем при клике на старт
    startBtn.addEventListener('click', activateAudioForIOS);

    function updateDisplay() {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (seconds <= 10 && seconds > 0) {
            display.classList.add('danger');
            
            if (!soundPlayed && isRunning) {
                playBeepSound();
                soundPlayed = true;
            }
        } else {
            display.classList.remove('danger');
        }
        
        if (seconds === 0) {
            soundPlayed = false;
            // Вибро при завершении таймера
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
        }
    }

    function playBeepSound() {
        // Пробуем использовать аудио элемент
        if (timerBeep) {
            timerBeep.currentTime = 0;
            const playPromise = timerBeep.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Audio element failed, using Web Audio");
                    playWebAudioBeep();
                });
            }
        } else {
            playWebAudioBeep();
        }
    }

    function playWebAudioBeep() {
        try {
            initAudioContext();
            if (!audioContext || audioContext.state === 'suspended') {
                if (audioContext) audioContext.resume();
                return;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log("Web Audio also failed:", e);
        }
    }

    startBtn.onclick = () => {
        if (!isRunning && seconds > 0) {
            isRunning = true;
            soundPlayed = false;
            timerInterval = setInterval(() => {
                if (seconds > 0) {
                    seconds--;
                    updateDisplay();
                } else {
                    isRunning = false;
                    clearInterval(timerInterval);
                }
            }, 1000);
        }
    };

    pauseBtn.onclick = () => {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerInterval);
        }
    };

    resetBtn.onclick = () => {
        isRunning = false;
        clearInterval(timerInterval);
        seconds = 60;
        soundPlayed = false;
        updateDisplay();
    };

    set130Btn.onclick = () => {
        isRunning = false;
        clearInterval(timerInterval);
        seconds = 90;
        soundPlayed = false;
        updateDisplay();
    };

    updateDisplay();
}

function initRestart() {
    const restartBtn = document.getElementById('btn-restart-legacy');
    if (restartBtn) {
        restartBtn.onclick = () => {
            if (confirm('Вы уверены, что хотите сбросить ВСЮ игру?')) {
                location.reload();
            }
        };
    }
}

// --- WIN CONDITION LOGIC ---
function checkWinCondition() {
    let mafiaCount = 0;
    let civCount = 0;
    const rows = document.querySelectorAll('.player-row');
    rows.forEach(row => {
        if (row.classList.contains('dead')) return;
        const roleSelect = row.querySelector('.role-select');
        const role = roleSelect.value;
        if (role === 'mafia' || role === 'don') {
            mafiaCount++;
        } else {
            civCount++;
        }
    });

    if (mafiaCount === 0) {
        setTimeout(() => alert('🏆 ПОБЕДА МИРНЫХ! Мафия уничтожена.'), 100);
    } else if (mafiaCount >= civCount) {
        setTimeout(() => alert(`💀 ПОБЕДА МАФИИ! (Мафия: ${mafiaCount} / Мирные: ${civCount})`), 100);
    }
}

// iOS специфичные функции
window.addEventListener('resize', () => {
    // Фикс для пересчета высоты при повороте iOS
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

// Предотвращаем контекстное меню на iOS
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Предотвращаем выделение текста при долгом нажатии на iOS
document.addEventListener('selectstart', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});