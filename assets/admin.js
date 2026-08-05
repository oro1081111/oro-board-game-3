(() => {
  'use strict';

  const API = 'https://oro-board-game-3.chubby0520.workers.dev';
  const GAMES = [
    ['soulaween', '蒐靈祭', 'Soulaween'],
    ['mijnlieff', '花園棋', 'Garden'],
    ['santorini', '聖托里尼', 'Santorini'],
    ['zombie-jump', '殭屍棋', 'JUMP'],
    ['four-color-chess', '四色棋', 'Four Color Chess'],
    ['four-moves-chess', '四步棋', 'Four Moves Chess'],
    ['torii', '跳躍森靈', 'Torii'],
    ['ice-stage', '冰塊棋', 'ICE STAGE'],
    ['gobblet', '奇雞連連', 'Gobblet Gobblers'],
    ['gobblet-classic', '棋蹟連連', 'Gobblet'],
    ['chocolate-clash', '巧克力對決', 'Chocolate Clash'],
    ['animal-shogi', '動物將棋', 'Let’s Catch the Lion!']
  ];

  const loginPanel = document.getElementById('loginPanel');
  const controlPanel = document.getElementById('controlPanel');
  const loginForm = document.getElementById('loginForm');
  const tokenInput = document.getElementById('adminToken');
  const loginMessage = document.getElementById('loginMessage');
  const saveMessage = document.getElementById('saveMessage');
  const gameControls = document.getElementById('gameControls');
  const logoutButton = document.getElementById('logoutButton');

  let token = '';
  let availability = {};

  function setMessage(element, message, type = '') {
    element.textContent = message;
    element.className = `admin-message${type ? ` ${type}` : ''}`;
  }

  async function adminRequest(options = {}) {
    const response = await fetch(`${API}/admin/availability`, {
      cache: 'no-store',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {}

    if (!response.ok) {
      const requestError = new Error(data.error || `request failed: ${response.status}`);
      requestError.status = response.status;
      throw requestError;
    }

    return data;
  }

  function setControlsDisabled(disabled) {
    gameControls.querySelectorAll('input').forEach((input) => {
      input.disabled = disabled;
    });
  }

  function renderControls() {
    gameControls.replaceChildren(...GAMES.map(([id, nameZh, nameEn]) => {
      const row = document.createElement('label');
      row.className = 'game-control';

      const names = document.createElement('span');
      names.className = 'game-names';
      names.innerHTML = `<strong>${nameZh}</strong><small>${nameEn}</small>`;

      const status = document.createElement('span');
      status.className = 'game-status';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = availability[id] !== false;
      input.dataset.game = id;
      input.setAttribute('aria-label', `${nameZh}是否開放`);

      const slider = document.createElement('span');
      slider.className = 'switch';
      slider.setAttribute('aria-hidden', 'true');

      function syncStatus() {
        status.textContent = input.checked ? '開放中' : '已關閉';
        status.classList.toggle('off', !input.checked);
      }

      input.addEventListener('change', async () => {
        const enabled = input.checked;
        syncStatus();
        setControlsDisabled(true);
        setMessage(saveMessage, `正在${enabled ? '開放' : '關閉'}「${nameZh}」……`);

        try {
          const data = await adminRequest({
            method: 'POST',
            body: JSON.stringify({ game: id, enabled })
          });
          availability = data.availability;
          setMessage(saveMessage, `「${nameZh}」已${enabled ? '開放' : '關閉'}。`, 'success');
        } catch (error) {
          input.checked = !enabled;
          syncStatus();
          setMessage(saveMessage, `儲存失敗：${error.message}`, 'error');
        } finally {
          setControlsDisabled(false);
        }
      });

      syncStatus();

      const toggle = document.createElement('span');
      toggle.className = 'toggle-wrap';
      toggle.append(status, input, slider);
      row.append(names, toggle);
      return row;
    }));
  }

  async function signIn(candidateToken, remember = true) {
    token = candidateToken.trim();
    if (!token) {
      setMessage(loginMessage, '請輸入管理者密碼。', 'error');
      return;
    }

    setMessage(loginMessage, '正在驗證……');
    tokenInput.disabled = true;

    try {
      const data = await adminRequest();
      availability = data.availability;
      if (remember) sessionStorage.setItem('oroBoardGameAdminToken', token);
      renderControls();
      loginPanel.hidden = true;
      controlPanel.hidden = false;
      setMessage(saveMessage, '切換開關後會立即自動儲存。');
    } catch (error) {
      sessionStorage.removeItem('oroBoardGameAdminToken');
      token = '';
      const message = error.status === 503
        ? 'Cloudflare 尚未設定 ADMIN_TOKEN。'
        : '密碼錯誤或無法連線。';
      setMessage(loginMessage, message, 'error');
    } finally {
      tokenInput.disabled = false;
    }
  }

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    signIn(tokenInput.value);
  });

  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('oroBoardGameAdminToken');
    token = '';
    availability = {};
    tokenInput.value = '';
    controlPanel.hidden = true;
    loginPanel.hidden = false;
    setMessage(loginMessage, '已登出。');
    tokenInput.focus();
  });

  const savedToken = sessionStorage.getItem('oroBoardGameAdminToken');
  if (savedToken) {
    tokenInput.value = savedToken;
    signIn(savedToken, false);
  }
})();
