function update(preferences) {
  for (const preference in preferences) {
    const value = 'object' === typeof preferences[preference] ? preferences[preference].newValue : preferences[preference]
    if (Number.isInteger(value)) {
      document.querySelector('[name="' + preference + '"][value="' + value + '"]').checked = true
    } else {
      document.querySelector('[name="' + preference + '"]').checked = value
    }
  }
}

browser.storage.local.get({
  context_menu_location: 0,
  merge_insertion: 0,
  ignore_minimised: false
}).then(update)

document.body.addEventListener('change', ({ target }) => {
  const save = {}
  save[target.name] = 'checkbox' === target.type ? target.checked : Number.parseInt(target.value)
  browser.storage.local.set(save)
})

browser.storage.onChanged.addListener(update)
