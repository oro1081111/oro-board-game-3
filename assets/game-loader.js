const AVAILABILITY_API = 'https://oro-board-game-3.chubby0520.workers.dev';
const gameId = document.body.dataset.game;
const app = document.getElementById('app');

function installStatusStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .availability-state {
      min-height: 100dvh;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f4f1e8;
      color: #26231f;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }
    .availability-card {
      width: min(100%, 460px);
      box-sizing: border-box;
      padding: 34px 28px;
      border: 1px solid rgba(38, 35, 31, .14);
      border-radius: 24px;
      background: rgba(255, 255, 255, .82);
      box-shadow: 0 18px 48px rgba(38, 35, 31, .12);
    }
    .availability-card h1 {
      margin: 0 0 12px;
      font-size: clamp(25px, 7vw, 34px);
    }
    .availability-card p {
      margin: 0;
      color: #676057;
      line-height: 1.7;
    }
    .availability-card a {
      display: inline-flex;
      margin-top: 24px;
      padding: 12px 20px;
      border-radius: 999px;
      background: #26231f;
      color: #fff;
      font-weight: 700;
      text-decoration: none;
    }
  `;
  document.head.appendChild(style);
}

function renderStatus(title, message, showHome = false) {
  app.innerHTML = `
    <main class="availability-state">
      <section class="availability-card">
        <h1>${title}</h1>
        <p>${message}</p>
        ${showHome ? '<a href="../../index.html">返回遊戲大廳</a>' : ''}
      </section>
    </main>
  `;
}

async function fetchAvailability() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${AVAILABILITY_API}/availability`, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`availability request failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function loadClassicScript(relativeUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(relativeUrl, import.meta.url).href;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${relativeUrl}`));
    document.body.appendChild(script);
  });
}

function filterDisabledGameLinks(availability) {
  document.querySelectorAll('#gameList a[href]').forEach((link) => {
    const match = link.getAttribute('href')?.match(/\.\.\/([^/]+)\/game\.html/);
    if (match && availability[match[1]] === false) link.remove();
  });
}

installStatusStyles();
renderStatus('正在載入遊戲', '正在確認此遊戲目前是否開放。');

let availability = {};
try {
  availability = await fetchAvailability();
} catch (error) {
  // Fail open: a temporary Worker outage must not disable every game.
  console.warn('Unable to load game availability; continuing with the game.', error);
}

window.GAME_AVAILABILITY = availability;

if (availability[gameId] === false) {
  renderStatus('此遊戲目前暫停開放', '管理者已暫時關閉這款遊戲，重新開放後即可再次遊玩。', true);
} else {
  app.replaceChildren();

  try {
    // These files were written as classic scripts. Loading them with import()
    // changes their execution semantics, so preserve the original script order.
    await loadClassicScript('./game-core.js?v=20260803b');
    await loadClassicScript('./games.js?v=20260728d');

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        filterDisabledGameLinks(availability);
      }, { once: true });
    } else {
      // Some browsers may finish DOMContentLoaded while the availability request
      // is pending. The shared controller starts from this window event.
      window.dispatchEvent(new Event('DOMContentLoaded'));
      setTimeout(() => filterDisabledGameLinks(availability), 0);
    }
  } catch (error) {
    console.error(error);
    renderStatus('遊戲載入失敗', '程式檔案未能正確載入，請重新整理頁面後再試一次。', true);
  }
}
