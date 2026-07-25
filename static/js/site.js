// Copy email to clipboard (used by overview Email link).
function copyEmail() {
  navigator.clipboard.writeText("jackh98zz@gmail.com");
  alert(document.body.getAttribute('data-email-copied') || "Email copied to clipboard");
}

// Language dropdown: toggle on button click, close on outside click or link navigation.
(function () {
  var dropdown = document.querySelector('.nav-lang-dropdown');
  if (!dropdown) return;

  var toggle = dropdown.querySelector('.nav-lang-toggle');
  var menu = dropdown.querySelector('.nav-lang-menu');

  function open() {
    dropdown.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function close() {
    dropdown.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function toggleOpen() {
    if (dropdown.classList.contains('is-open')) close();
    else open();
  }

  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleOpen();
  });

  document.addEventListener('click', function () {
    close();
  });

  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });
})();

// Updates archive: show the newest month by default and filter without a reload.
(function () {
  var select = document.querySelector('[data-updates-filter]');
  var feed = document.querySelector('[data-updates-feed]');
  if (!select || !feed) return;

  var cards = Array.prototype.slice.call(feed.querySelectorAll('[data-update-month]'));

  function applyMonth(month) {
    cards.forEach(function (card) {
      card.hidden = card.getAttribute('data-update-month') !== month;
    });
  }

  select.addEventListener('change', function () {
    applyMonth(select.value);
  });

  applyMonth(select.value);
})();

// Guestbook: load approved comments and submit new comments safely.
(function () {
  var app = document.querySelector('[data-comments-app]');
  if (!app) return;

  var form = app.querySelector('[data-comment-form]');
  var displayName = form && form.querySelector('[name="displayName"]');
  var body = form && form.querySelector('[name="body"]');
  var website = form && form.querySelector('[name="website"]');
  var submitButton = form && form.querySelector('[data-comment-submit]');
  var formStatus = form && form.querySelector('[data-comment-status]');
  var nameCount = form && form.querySelector('[data-name-count]');
  var bodyCount = form && form.querySelector('[data-body-count]');
  var list = app.querySelector('[data-comments-list]');
  var feedState = app.querySelector('[data-comments-state]');
  var moreButton = app.querySelector('[data-comments-more]');
  var locale = app.getAttribute('data-locale') || document.documentElement.lang || 'en';
  var nextCursor = null;
  var loadedCommentIds = {};

  function characterCount(value) {
    return Array.from(value || '').length;
  }

  function message(name, fallback) {
    return app.getAttribute('data-' + name) || fallback;
  }

  function setFormStatus(text, type, focus) {
    if (!formStatus) return;
    formStatus.textContent = text || '';
    formStatus.className = 'comment-form-status' + (type ? ' is-' + type : '');
    if (focus && text) formStatus.focus();
  }

  function updateCounter(field, counter, limit) {
    if (!field || !counter) return;
    var count = characterCount(field.value);
    counter.textContent = count + '/' + limit;
    counter.classList.toggle('is-over-limit', count > limit);
    field.setAttribute('aria-invalid', count > limit ? 'true' : 'false');
  }

  function validateForm() {
    var nameLength = characterCount(displayName.value.trim());
    var bodyLength = characterCount(body.value.trim());
    var valid =
      nameLength >= 1 &&
      nameLength <= 40 &&
      bodyLength >= 1 &&
      bodyLength <= 200;

    displayName.setAttribute(
      'aria-invalid',
      nameLength < 1 || nameLength > 40 ? 'true' : 'false'
    );
    body.setAttribute(
      'aria-invalid',
      bodyLength < 1 || bodyLength > 200 ? 'true' : 'false'
    );
    return valid;
  }

  function formatTime(isoTime) {
    var date = new Date(isoTime);
    if (Number.isNaN(date.getTime())) return '';

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (_error) {
      return date.toLocaleString();
    }
  }

  function createCommentItem(comment) {
    var item = document.createElement('li');
    item.className = 'comment-item';
    item.setAttribute('data-comment-id', comment.id);

    var header = document.createElement('div');
    header.className = 'comment-item-header';

    var author = document.createElement('strong');
    author.className = 'comment-author';
    author.textContent = comment.displayName;

    var time = document.createElement('time');
    time.className = 'comment-time';
    time.dateTime = comment.createdAt;
    time.textContent = formatTime(comment.createdAt);

    var commentBody = document.createElement('p');
    commentBody.className = 'comment-body';
    commentBody.textContent = comment.body;

    header.appendChild(author);
    header.appendChild(time);
    item.appendChild(header);
    item.appendChild(commentBody);
    return item;
  }

  function appendComments(comments) {
    comments.forEach(function (comment) {
      if (!comment || loadedCommentIds[comment.id]) return;
      loadedCommentIds[comment.id] = true;
      list.appendChild(createCommentItem(comment));
    });
  }

  function prependComment(comment) {
    if (!comment || loadedCommentIds[comment.id]) return;
    loadedCommentIds[comment.id] = true;
    list.insertBefore(createCommentItem(comment), list.firstChild);
    list.hidden = false;
    feedState.hidden = true;
  }

  async function loadComments(cursor) {
    feedState.hidden = false;
    feedState.textContent = message('loading', 'Loading comments…');
    moreButton.disabled = true;

    var url = '/api/comments?limit=20';
    if (cursor) url += '&cursor=' + encodeURIComponent(cursor);

    try {
      var response = await fetch(url, {
        headers: { accept: 'application/json' }
      });
      var data = await response.json();
      if (!response.ok || !data.ok) throw new Error('LOAD_FAILED');

      appendComments(data.comments || []);
      nextCursor = data.nextCursor || null;

      if (list.children.length) {
        list.hidden = false;
        feedState.hidden = true;
      } else {
        list.hidden = true;
        feedState.hidden = false;
        feedState.textContent = message('empty', 'No comments yet.');
      }

      moreButton.hidden = !nextCursor;
      moreButton.disabled = false;
    } catch (_error) {
      feedState.hidden = false;
      feedState.textContent = message(
        'load-error',
        'Comments could not be loaded. Please try again later.'
      );
      moreButton.hidden = true;
    }
  }

  function errorMessage(code) {
    var messages = {
      INVALID_INPUT: message('invalid-input', 'Check the form fields.'),
      INVALID_JSON: message('invalid-input', 'Check the form fields.'),
      PAYLOAD_TOO_LARGE: message('invalid-input', 'Check the form fields.'),
      VERIFICATION_FAILED: message(
        'verification-failed',
        'Verification failed. Please try again.'
      ),
      RATE_LIMITED: message(
        'rate-limited',
        'Please wait before leaving another comment.'
      ),
      MODERATION_REJECTED: message(
        'moderation-rejected',
        'This comment cannot be published.'
      ),
      SERVICE_NOT_CONFIGURED: message(
        'service-not-configured',
        'Comments are temporarily unavailable.'
      )
    };
    return messages[code] || message('server-error', 'Something went wrong.');
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset();
    }
  }

  window.onCommentTurnstileError = function () {
    setFormStatus(
      message('verification-failed', 'Verification failed. Please try again.'),
      'error',
      false
    );
  };

  window.onCommentTurnstileExpired = function () {
    setFormStatus(
      message('verification-failed', 'Verification expired. Please try again.'),
      'error',
      false
    );
  };

  if (displayName && body) {
    displayName.addEventListener('input', function () {
      updateCounter(displayName, nameCount, 40);
    });
    body.addEventListener('input', function () {
      updateCounter(body, bodyCount, 200);
    });
    updateCounter(displayName, nameCount, 40);
    updateCounter(body, bodyCount, 200);
  }

  if (moreButton) {
    moreButton.addEventListener('click', function () {
      if (nextCursor) loadComments(nextCursor);
    });
  }

  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (!validateForm()) {
        setFormStatus(
          message('invalid-input', 'Check the name and comment length.'),
          'error',
          true
        );
        return;
      }

      var turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
      var turnstileToken = turnstileInput ? turnstileInput.value : '';
      if (!turnstileToken) {
        setFormStatus(
          message('turnstile-required', 'Please complete the verification.'),
          'error',
          true
        );
        return;
      }

      submitButton.disabled = true;
      setFormStatus(message('submitting', 'Submitting…'), 'working', false);

      try {
        var response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            displayName: displayName.value,
            body: body.value,
            website: website ? website.value : '',
            turnstileToken: turnstileToken
          })
        });
        var data = await response.json();

        if (!response.ok || !data.ok) {
          var code = data && data.error ? data.error.code : 'SERVER_ERROR';
          setFormStatus(errorMessage(code), 'error', true);
          return;
        }

        if (data.status === 'published' && data.comment) {
          prependComment(data.comment);
          setFormStatus(
            message('published', 'Your comment has been published.'),
            'success',
            true
          );
        } else {
          setFormStatus(
            message(
              'pending',
              'Your comment was received and is waiting for review.'
            ),
            'pending',
            true
          );
        }

        form.reset();
        updateCounter(displayName, nameCount, 40);
        updateCounter(body, bodyCount, 200);
      } catch (_error) {
        setFormStatus(
          message('server-error', 'Something went wrong. Please try again.'),
          'error',
          true
        );
      } finally {
        submitButton.disabled = false;
        resetTurnstile();
      }
    });
  }

  loadComments(null);
})();
