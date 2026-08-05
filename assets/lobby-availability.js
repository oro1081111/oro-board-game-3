(() => {
  'use strict';

  const AVAILABILITY_API = 'https://oro-board-game-3.chubby0520.workers.dev';
  const cards = [...document.querySelectorAll('.game-card')];
  const count = document.querySelector('.count');

  function getGameId(card) {
    const href = card.querySelector('.preview-link')?.getAttribute('href') || '';
    return href.match(/games\/([^/]+)\/game\.html/)?.[1] || '';
  }

  function revealLobby(availability = {}) {
    cards.forEach((card) => {
      const gameId = getGameId(card);
      card.hidden = availability[gameId] === false;
    });

    const visibleCount = cards.filter((card) => !card.hidden).length;
    if (count) count.textContent = `${visibleCount} 款遊戲`;
    document.body.classList.remove('availability-pending');
  }

  async function loadAvailability() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(`${AVAILABILITY_API}/availability`, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`availability request failed: ${response.status}`);
      revealLobby(await response.json());
    } catch (error) {
      console.warn('Unable to load game availability; showing all games.', error);
      revealLobby();
    } finally {
      clearTimeout(timer);
    }
  }

  loadAvailability();
})();
