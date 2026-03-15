const HP_VALUES = [100, 500, 600, 700, 800, 1000];
const ENEMY_MESSAGES = [
  'むっちゃ痛い',
  'その程度か？',
  '・・・',
  'とけし、それやめて',
  'あすかパイセン！！！',
];

const el = {
  titleScreen: document.getElementById('titleScreen'),
  gameScreen: document.getElementById('gameScreen'),
  resultScreen: document.getElementById('resultScreen'),
  startBtn: document.getElementById('startBtn'),
  retryBtn: document.getElementById('retryBtn'),
  backTitleBtn: document.getElementById('backTitleBtn'),
  timer: document.getElementById('timer'),
  enemyHp: document.getElementById('enemyHp'),
  enemyHpMax: document.getElementById('enemyHpMax'),
  hpFill: document.getElementById('hpFill'),
  correctCount: document.getElementById('correctCount'),
  problemText: document.getElementById('problemText'),
  answerDisplay: document.getElementById('answerDisplay'),
  calculatorPad: document.getElementById('calculatorPad'),
  clearBtn: document.getElementById('clearBtn'),
  submitBtn: document.getElementById('submitBtn'),
  warningBanner: document.getElementById('warningBanner'),
  enemyStage: document.getElementById('enemyStage'),
  enemySpeech: document.getElementById('enemySpeech'),
  enemyAura: document.getElementById('enemyAura'),
  rageOverlay: document.getElementById('rageOverlay'),
  messageFloat: document.getElementById('messageFloat'),
  damageFloat: document.getElementById('damageFloat'),
  flash: document.getElementById('flash'),
  freezeOverlay: document.getElementById('freezeOverlay'),
  resultTag: document.getElementById('resultTag'),
  resultTitle: document.getElementById('resultTitle'),
  resultComment: document.getElementById('resultComment'),
  resultHonor: document.getElementById('resultHonor'),
  enemyImage: document.getElementById('enemyImage'),
  enemyFallback: document.getElementById('enemyFallback'),
  titleEnemyImage: document.getElementById('titleEnemyImage'),
  titleEnemyFallback: document.getElementById('titleEnemyFallback'),
};

const state = {
  running: false,
  timerMs: 20000,
  timeLeftMs: 20000,
  enemyHpMax: 0,
  enemyHp: 0,
  correctCount: 0,
  wrongCount: 0,
  totalDamage: 0,
  maxSingleDamage: 0,
  specialUsed: false,
  answer: '',
  inputClicksThisRound: 0,
  submissions: 0,
  currentProblem: { a: 10, b: 10, answer: 20 },
  timerId: null,
  resultType: '',
  usedMessages: 0,
  startTime: 0,
  hundredGateHits: 0,
  currentHundredPos: '',
};


function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    const isDoubleTap = now - lastTouchEnd < 320;
    lastTouchEnd = now;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const isGameTap = target.closest('#gameScreen, .calc-btn, .primary-btn, .secondary-btn');
    if (isDoubleTap && isGameTap) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (event) => {
    if (event.target instanceof Element && event.target.closest('#gameScreen')) {
      event.preventDefault();
    }
  }, { passive: false });
}

function keepGameVisibleOnMobile() {
  const mq = window.matchMedia('(max-width: 900px)');
  const sync = () => {
    if (!mq.matches || !el.gameScreen.classList.contains('active')) return;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sync();
  });

  return sync;
}

function setupEnemyImages() {
  [
    [el.enemyImage, el.enemyFallback],
    [el.titleEnemyImage, el.titleEnemyFallback],
  ].forEach(([img, fallback]) => {
    img.addEventListener('load', () => {
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    });
    img.addEventListener('error', () => {
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
    });
  });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTwoDigitFiveStep() {
  const values = [];
  for (let n = 10; n <= 95; n += 5) values.push(n);
  return pick(values);
}

function createProblem() {
  const a = randomTwoDigitFiveStep();
  const b = randomTwoDigitFiveStep();
  state.currentProblem = { a, b, answer: a + b };
  el.problemText.textContent = `${a} + ${b}`;
}

function showScreen(name) {
  el.titleScreen.classList.remove('active');
  el.gameScreen.classList.remove('active');
  el.resultScreen.classList.remove('active');
  if (name !== 'game') {
    document.body.classList.remove('global-rage', 'global-max-rage', 'global-hundred-mode');
    stopMaxRageBgm();
  stopHundredBgm();
    stopHundredBgm();
  }
  el.resultScreen.classList.remove('max-boss-result');
  if (name === 'title') el.titleScreen.classList.add('active');
  if (name === 'game') el.gameScreen.classList.add('active');
  if (name === 'result') el.resultScreen.classList.add('active');
}

function updateHpUI() {
  el.enemyHp.textContent = Math.max(0, state.enemyHp);
  el.enemyHpMax.textContent = state.enemyHpMax;
  el.hpFill.style.width = `${Math.max(0, (state.enemyHp / state.enemyHpMax) * 100)}%`;
}

function updateAnswerDisplay() {
  el.answerDisplay.textContent = state.answer || '0';
}

function setPadGlow(on) {
  el.calculatorPad.classList.toggle('glow-on', on && !state.specialUsed);
}

function resetInputRound() {
  state.answer = '';
  state.inputClicksThisRound = 0;
  updateAnswerDisplay();
  setPadGlow(true);
}

function updateEnemyStage() {
  const c = state.correctCount;
  el.enemyStage.className = 'enemy-stage';
  if (state.enemyHpMax === 100 && state.currentHundredPos) {
    el.enemyStage.classList.add(state.currentHundredPos);
  }

  if (c <= 0) {
    el.enemyStage.classList.add('state-idle');
    el.enemySpeech.textContent = '......';
  } else if (c === 1) {
    el.enemyStage.classList.add('state-awaken');
    el.enemySpeech.textContent = '気配が変わった';
  } else if (c === 2) {
    el.enemyStage.classList.add('state-close');
    el.enemySpeech.textContent = 'むっちゃ痛い';
  } else {
    el.enemyStage.classList.add('state-max');
    el.enemySpeech.textContent = c >= 5 ? pick(ENEMY_MESSAGES) : 'その程度か？';
  }

  if (state.enemyHpMax === 100) {
    el.enemyStage.classList.add('hundred-mode');
    el.rageOverlay.classList.remove('hidden');
    el.enemyAura.style.background = 'radial-gradient(circle, rgba(255,215,0,.36) 0%, rgba(255,240,170,.18) 35%, rgba(0,0,0,0) 72%)';
  } else if (c >= 4 || state.enemyHpMax === 1000) {
    el.enemyStage.classList.add('rage-mode');
    if (state.enemyHpMax === 1000) el.enemyStage.classList.add('max-rage-mode');
    el.rageOverlay.classList.remove('hidden');
    el.enemyAura.style.background = 'radial-gradient(circle, rgba(255,60,60,.28) 0%, rgba(255,120,0,.12) 35%, rgba(0,0,0,0) 72%)';
  } else {
    el.rageOverlay.classList.add('hidden');
    el.enemyAura.style.background = 'radial-gradient(circle, rgba(0,0,0,.08) 0%, rgba(0,0,0,.03) 35%, rgba(0,0,0,0) 70%)';
  }
}

function flashScreen() {
  el.flash.classList.remove('active');
  void el.flash.offsetWidth;
  el.flash.classList.add('active');
}

function floatText(node, text) {
  node.textContent = text;
  node.classList.remove('hidden', 'float-in');
  void node.offsetWidth;
  node.classList.add('float-in');
  setTimeout(() => {
    node.classList.add('hidden');
    node.classList.remove('float-in');
  }, 1000);
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!playTone.ctx) playTone.ctx = new AudioContext();
  const ctx = playTone.ctx;
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function startMaxRageBgm() {
  const ctx = getAudioContext();
  if (!ctx || startMaxRageBgm.nodes) return;

  const master = ctx.createGain();
  master.gain.value = 0.05;
  master.connect(ctx.destination);

  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const pulse = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 420;
  filter.Q.value = 1.2;

  drone1.type = 'sawtooth';
  drone2.type = 'triangle';
  pulse.type = 'square';
  lfo.type = 'sine';

  drone1.frequency.value = 55;
  drone2.frequency.value = 82.5;
  pulse.frequency.value = 165;
  lfo.frequency.value = 3.4;
  lfoGain.gain.value = 0.018;

  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);

  drone1.connect(filter);
  drone2.connect(filter);
  pulse.connect(filter);
  filter.connect(master);

  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.05, now + 0.3);

  [drone1, drone2, pulse, lfo].forEach(n => n.start(now));
  startMaxRageBgm.nodes = { master, drone1, drone2, pulse, lfo, lfoGain, filter };
}

function stopMaxRageBgm() {
  const ctx = getAudioContext();
  const nodes = startMaxRageBgm.nodes;
  if (!ctx || !nodes) return;
  const now = ctx.currentTime;
  try {
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setValueAtTime(Math.max(nodes.master.gain.value, 0.0001), now);
    nodes.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  } catch (e) {}
  setTimeout(() => {
    ['drone1','drone2','pulse','lfo'].forEach(k => { try { nodes[k].stop(); } catch (e) {} });
    startMaxRageBgm.nodes = null;
  }, 260);
}


function startHundredBgm() {
  const ctx = getAudioContext();
  if (!ctx || startHundredBgm.nodes) return;

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscA.type = 'triangle';
  oscB.type = 'square';
  lfo.type = 'sine';
  oscA.frequency.value = 220;
  oscB.frequency.value = 330;
  lfo.frequency.value = 7.5;
  lfoGain.gain.value = 18;
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.8;

  lfo.connect(lfoGain);
  lfoGain.connect(oscB.frequency);
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(master);

  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.045, now + 0.2);

  [oscA, oscB, lfo].forEach(n => n.start(now));
  startHundredBgm.nodes = { master, oscA, oscB, lfo, lfoGain, filter };
}

function stopHundredBgm() {
  const ctx = getAudioContext();
  const nodes = startHundredBgm.nodes;
  if (!ctx || !nodes) return;
  const now = ctx.currentTime;
  try {
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setValueAtTime(Math.max(nodes.master.gain.value, 0.0001), now);
    nodes.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  } catch (e) {}
  setTimeout(() => {
    ['oscA', 'oscB', 'lfo'].forEach(k => { try { nodes[k].stop(); } catch (e) {} });
    startHundredBgm.nodes = null;
  }, 240);
}

function shiftHundredEnemyPosition() {
  if (state.enemyHpMax !== 100) return;
  const positions = ['hundred-top-left', 'hundred-top-right', 'hundred-bottom-left', 'hundred-bottom-right'];
  let next = pick(positions);
  if (positions.length > 1 && next === state.currentHundredPos) {
    next = positions[(positions.index(next) + 1) % positions.length];
  }
  state.currentHundredPos = next;
}

function triggerScreenShake() {
  el.gameScreen.classList.remove('screen-shake');
  void el.gameScreen.offsetWidth;
  el.gameScreen.classList.add('screen-shake');
}

function shiftEnemyPosition() {
  const positions = ['edge-top', 'edge-right', 'edge-bottom', 'edge-left'];
  const next = pick(positions);
  void el.enemyStage.offsetWidth;
  el.enemyStage.classList.add(next);
}

function playTone(type = 'click') {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (type === 'freeze-bass') {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(160, now);
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(42, now);
    osc2.frequency.setValueAtTime(31, now);
    osc1.frequency.exponentialRampToValueAtTime(24, now + 1.15);
    osc2.frequency.exponentialRampToValueAtTime(18, now + 1.15);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.22);
    osc2.stop(now + 1.22);
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const map = {
    click: { freq: 580, dur: 0.04, gain: 0.035, wave: 'square' },
    confirm: { freq: 420, dur: 0.07, gain: 0.045, wave: 'square' },
    ok: { freq: 780, dur: 0.12, gain: 0.05, wave: 'triangle' },
    damage: { freq: 170, dur: 0.16, gain: 0.055, wave: 'sawtooth' },
    wrong: { freq: 145, dur: 0.18, gain: 0.055, wave: 'square' },
    special: { freq: 105, dur: 0.52, gain: 0.08, wave: 'sawtooth' },
    warning: { freq: 240, dur: 0.22, gain: 0.05, wave: 'square' },
    clear: { freq: 880, dur: 0.2, gain: 0.045, wave: 'triangle' },
    over: { freq: 125, dur: 0.3, gain: 0.05, wave: 'sawtooth' },
    hidden: { freq: 500, dur: 0.22, gain: 0.045, wave: 'triangle' },
    rage: { freq: 185, dur: 0.24, gain: 0.05, wave: 'sawtooth' },
  };
  const cfg = map[type] || map.click;
  oscillator.type = cfg.wave;
  oscillator.frequency.setValueAtTime(cfg.freq, now);
  if (type === 'special') oscillator.frequency.exponentialRampToValueAtTime(40, now + cfg.dur);
  gain.gain.setValueAtTime(cfg.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);
  oscillator.start(now);
  oscillator.stop(now + cfg.dur);
}

function handleDigit(digit) {
  if (!state.running || state.answer.length >= 4) return;
  state.answer += digit;
  state.inputClicksThisRound += 1;
  playTone('click');
  updateAnswerDisplay();

  if (!state.specialUsed) {
    if (state.inputClicksThisRound <= 3) setPadGlow(true);
    if (state.inputClicksThisRound === 4) setPadGlow(false);
  }
}

function handleClear() {
  if (!state.running) return;
  playTone('click');
  resetInputRound();
}

function showMessageAfterHit() {
  if (state.correctCount >= 5) {
    const message = pick(ENEMY_MESSAGES);
    el.enemySpeech.textContent = message;
    floatText(el.messageFloat, message);
    state.usedMessages += 1;
  }
}

function applyDamage(amount, mode = 'normal') {
  state.enemyHp -= amount;
  state.totalDamage += amount;
  state.maxSingleDamage = Math.max(state.maxSingleDamage, amount);
  updateHpUI();
  floatText(el.damageFloat, `-${amount}`);

  if (mode === 'special') {
    playTone('special');
    el.enemySpeech.textContent = '・・・';
  } else {
    playTone('damage');
    playTone('ok');
  }
}

async function playSpecialClearSequence() {
  el.freezeOverlay.classList.remove('hidden');
  el.freezeOverlay.classList.add('show');
  playTone('freeze-bass');
  await new Promise((r) => setTimeout(r, 900));
  flashScreen();
  await new Promise((r) => setTimeout(r, 260));
  el.freezeOverlay.classList.add('hidden');
  el.freezeOverlay.classList.remove('show');
}

function determineHonor(resultType) {
  if (resultType === 'special-one-shot') return '999の使い手';
  if (resultType === 'hidden-clear') return '親友への一歩';
  if (resultType === 'hundred-clear') return '使い捨てられた運';
  if (resultType === 'max-boss-clear') return 'インチキなシーチキン野郎';
  if (state.enemyHpMax === 1000 && resultType === 'clear') return '最大個体討伐者';
  if (resultType === 'game-over' && state.totalDamage > 0) return '届かぬ者';
  if (resultType === 'game-over') return '何もしない勇者';
  if (state.correctCount >= 5) return '足し算マスター';
  if (state.correctCount >= 3) return '強運の持ち主';
  return '瞬殺の計算王';
}


async function finishGame(resultType) {
  if (!state.running) return;
  state.running = false;
  clearInterval(state.timerId);
  state.resultType = resultType;

  stopMaxRageBgm();
  stopHundredBgm();

  if (resultType === 'special-one-shot') {
    await playSpecialClearSequence();
    playTone('clear');
  } else if (resultType === 'max-boss-clear') {
    playTone('clear');
    setTimeout(() => playTone('clear'), 120);
    setTimeout(() => playTone('ok'), 240);
  } else if (resultType === 'hundred-clear') {
    playTone('clear');
    setTimeout(() => playTone('hidden'), 120);
    setTimeout(() => playTone('ok'), 240);
  } else if (resultType === 'clear') {
    playTone('clear');
  } else if (resultType === 'hidden-clear') {
    playTone('hidden');
  } else {
    playTone('over');
  }

  const config = {
    clear: {
      tag: 'CLEAR',
      title: '小物を倒した',
      comment: '20秒の中でがんばったね、お利口さん。',
    },
    'max-boss-clear': {
      tag: 'MAXIMUM CLEAR',
      title: '最大個体を撃破した',
      comment: 'ズルする人は、今後もズルし続けます。逃避生活エンジョイわっしょい。',
    },
    'hundred-clear': {
      tag: 'GOLDEN CLEAR',
      title: '豪運で倒した',
      comment: 'あなたは運を使い切りました。宝くじを買うのはやめましょう。',
    },
    'special-one-shot': {
      tag: 'SPECIAL CLEAR',
      title: '一撃で終わらせた',
      comment: '禁断の一撃です。使ってはいけません。',
    },
    'hidden-clear': {
      tag: 'HIDDEN END',
      title: '友達との出会い',
      comment: '敵ではありません。人を想う心が大切です。',
    },
    'game-over': {
      tag: 'GAME OVER',
      title: '時間切れ',
      comment: state.totalDamage > 0 ? '削ったが、間に合わなかった。' : '何もできずに終わった。',
    },
  }[resultType];

  el.resultTag.textContent = config.tag;
  el.resultTitle.textContent = config.title;
  el.resultComment.textContent = config.comment;
  el.resultScreen.classList.toggle('max-boss-result', resultType === 'max-boss-clear');
  el.resultScreen.classList.toggle('hundred-result', resultType === 'hundred-clear');
  el.resultHonor.textContent = determineHonor(resultType);
  showScreen('result');
}

function checkEndConditionsAfterHit(mode) {
  if (state.enemyHp <= 0) {
    if (state.submissions === 1 && mode === 'special') {
      finishGame('special-one-shot');
    } else if (state.enemyHpMax === 100) {
      finishGame('hundred-clear');
    } else if (state.enemyHpMax === 1000) {
      finishGame('max-boss-clear');
    } else {
      finishGame('clear');
    }
  }
}


function canDamageHundredEnemy() {
  if (state.enemyHpMax !== 100) return true;
  return Math.random() < 0.1;
}

function handleSubmit() {
  if (!state.running) return;
  playTone('confirm');
  state.submissions += 1;
  flashScreen();

  if (!state.answer) {
    state.wrongCount += 1;
    playTone('wrong');
    el.enemySpeech.textContent = 'その程度か？';
    floatText(el.messageFloat, 'MISS');
    resetInputRound();
    return;
  }

  const value = Number(state.answer);
  const isCorrectAnswer = value === state.currentProblem.answer;

  // 通常の正解判定を最優先にする。
  // これにより 50 + 50 = 100 のような3桁回答でも正しく通常正解になる。
  if (isCorrectAnswer) {
    state.correctCount += 1;
    el.correctCount.textContent = state.correctCount;
    const didDamage = canDamageHundredEnemy();

    if (didDamage) {
      applyDamage(value, 'normal');
      if (state.enemyHpMax === 1000) {
        triggerScreenShake();
      }
      checkEndConditionsAfterHit('normal');
    } else {
      playTone('wrong');
      el.enemySpeech.textContent = '当たらない';
      floatText(el.messageFloat, 'NO DAMAGE');
    }

    updateEnemyStage();
    if (state.correctCount === 4) playTone('rage');
    showMessageAfterHit();
  } else if (!state.specialUsed && state.answer.length === 3 && value === 999) {
    // 999だけは一度だけ使える禁断の一撃。
    // ただし、問題の正解が3桁だった場合は上の通常正解が優先される。
    state.specialUsed = true;

    const didDamage = canDamageHundredEnemy();
    if (didDamage) {
      applyDamage(value, 'special');
      checkEndConditionsAfterHit('special');
    } else {
      playTone('wrong');
      el.enemySpeech.textContent = '当たらない';
      floatText(el.messageFloat, 'NO DAMAGE');
    }

    resetInputRound();
    if (state.running) {
      if (state.enemyHpMax === 100) shiftHundredEnemyPosition();
      createProblem();
      updateEnemyStage();
    }
    return;
  } else {
    state.wrongCount += 1;
    playTone('wrong');
    el.enemySpeech.textContent = 'その程度か？';
    floatText(el.messageFloat, 'MISS');
  }

  if (state.running) {
    resetInputRound();
    if (state.enemyHpMax === 100) shiftHundredEnemyPosition();
    createProblem();
    updateEnemyStage();
  }
}

function tick() {
  state.timeLeftMs = Math.max(0, state.timerMs - (performance.now() - state.startTime));
  el.timer.textContent = (state.timeLeftMs / 1000).toFixed(1);
  if (state.timeLeftMs <= 0) {
    finishGame(state.totalDamage === 0 ? 'hidden-clear' : 'game-over');
  }
}

function startGame() {
  state.timerMs = 20000;
  state.timeLeftMs = 20000;
  state.running = true;
  state.answer = '';
  state.enemyHpMax = pick(HP_VALUES);
  state.enemyHp = state.enemyHpMax;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.totalDamage = 0;
  state.maxSingleDamage = 0;
  state.specialUsed = false;
  state.inputClicksThisRound = 0;
  state.submissions = 0;
  state.resultType = '';
  state.usedMessages = 0;
  state.startTime = performance.now();
  state.hundredGateHits = 0;

  state.currentHundredPos = '';
  if (state.enemyHpMax === 100) shiftHundredEnemyPosition();

  updateHpUI();
  el.correctCount.textContent = '0';
  resetInputRound();
  createProblem();
  updateEnemyStage();
  showScreen('game');
  if (typeof syncMobileViewport === 'function') {
    requestAnimationFrame(() => syncMobileViewport());
  }

  const isMaxEnemy = state.enemyHpMax === 1000;
  const isHundredEnemy = state.enemyHpMax === 100;
  el.warningBanner.classList.toggle('hidden', !(isMaxEnemy || isHundredEnemy));
  el.warningBanner.textContent = isMaxEnemy ? 'MAXIMUM ANGER' : (isHundredEnemy ? 'GOLDEN TRICKSTER' : '');
  document.body.classList.toggle('global-rage', false);
  document.body.classList.toggle('global-max-rage', isMaxEnemy);
  document.body.classList.toggle('global-hundred-mode', isHundredEnemy);
  stopMaxRageBgm();
  stopHundredBgm();
  if (isMaxEnemy) {
    playTone('warning');
    setTimeout(() => playTone('warning'), 180);
    setTimeout(() => playTone('rage'), 360);
    setTimeout(() => playTone('rage'), 520);
    startMaxRageBgm();
  }
  if (isHundredEnemy) {
    playTone('clear');
    setTimeout(() => playTone('ok'), 120);
    setTimeout(() => playTone('hidden'), 240);
    startHundredBgm();
  }

  clearInterval(state.timerId);
  tick();
  state.timerId = setInterval(tick, 50);
}

el.startBtn.addEventListener('click', startGame);
el.retryBtn.addEventListener('click', () => showScreen('title'));
el.backTitleBtn.addEventListener('click', () => showScreen('title'));
Array.from(document.querySelectorAll('[data-digit]')).forEach((btn) => {
  btn.addEventListener('click', () => handleDigit(btn.dataset.digit));
});
el.clearBtn.addEventListener('click', handleClear);
el.submitBtn.addEventListener('click', handleSubmit);

setupEnemyImages();
preventDoubleTapZoom();
const syncMobileViewport = keepGameVisibleOnMobile();
showScreen('title');
