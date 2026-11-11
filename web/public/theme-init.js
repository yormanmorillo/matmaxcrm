(function () {
  try {
    var stored = localStorage.getItem('matmax-theme')
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch (e) {
    /* noop */
  }
})()
