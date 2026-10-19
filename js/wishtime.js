/**
 * Friendly Khmer timestamps for guestbook wishes.
 * Exposes window.WishTime.format(wish) -> "អម្បាញ់មិញ", "១ នាទីមុន", ...
 *
 * Uses the wish's real creation timestamp when available:
 *   created_at / createdAt / submittedAt / timestamp, or an ISO `date`.
 * Legacy wishes without a timestamp fall back to their stored display date.
 */
(function () {
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

  function khmerNumber(n) {
    return String(n).split('').map(function (d) {
      return KHMER_DIGITS[Number(d)] || d;
    }).join('');
  }

  function parseTimestamp(wish) {
    if (!wish) return null;
    let raw = wish.created_at || wish.createdAt || wish.submittedAt || wish.timestamp;
    if (!raw && typeof wish.date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(wish.date)) {
      raw = wish.date;
    }
    if (!raw) return null;
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
  }

  function format(wish) {
    const date = parseTimestamp(wish);
    if (!date) {
      // Old local wishes have no timestamp: keep the legacy display text.
      return (wish && (wish.date || wish.date_display)) || 'ថ្មីៗ';
    }

    let seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 0) seconds = 0; // tolerate clock skew

    if (seconds < 60) return 'អម្បាញ់មិញ';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return khmerNumber(minutes) + ' នាទីមុន';

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return khmerNumber(hours) + ' ម៉ោងមុន';

    const days = Math.floor(hours / 24);
    if (days < 7) return khmerNumber(days) + ' ថ្ងៃមុន';

    try {
      return date.toLocaleDateString('km-KH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return date.toLocaleDateString();
    }
  }

  window.WishTime = { format: format, parseTimestamp: parseTimestamp };
})();
