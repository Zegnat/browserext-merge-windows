function updateForm (state) {
  for (const name in state) {
    document.querySelectorAll('[name="' + name + '"]').forEach(element => { element.checked = (state[name].newValue || state[name]).includes(element.value) })
  }
}

browser.storage.local.get({
  menu_location: ['all', 'tab', 'tools_menu'],
  merge_insertion: ['0'],
  experimental: []
}).then(updateForm)

document.body.addEventListener('change', ({ target }) => {
  const save = {}
  save[target.name] = Array.from(document.querySelectorAll('[name="' + target.name + '"]:checked')).map(checkbox => checkbox.value)
  browser.storage.local.set(save)
})

browser.storage.onChanged.addListener(updateForm)
