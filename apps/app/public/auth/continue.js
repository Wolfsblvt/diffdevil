// The sign-in continuation: GitHub returned, the one-time artifact is exchanged for a session
// by a same-origin POST. With JavaScript the form submits itself; without it, the button works.
const form = document.querySelector('[data-continue]');
if (form instanceof HTMLFormElement) form.requestSubmit ? form.requestSubmit() : form.submit();
