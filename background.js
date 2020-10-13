'use strict'

let focusOrder = []
browser.windows.onRemoved.addListener(removedId => {
  focusOrder.filter(id => removedId !== id)
  browser.menus.remove('merge_' + removedId)
  getWindowsSorted().then(windows => windows.length < 2 && browser.menus.removeAll())
})
browser.windows.onFocusChanged.addListener(drawMenus)
browser.menus.onClicked.addListener((menuItem, currentTab) => {
  if (menuItem.menuItemId === 'merge_all') {
    getWindowsSorted(true)
      .then(windows => merge(windows.splice(1), currentTab.windowId, currentTab.id, currentTab.index))
  } else if (menuItem.menuItemId.substr(0, 6) === 'merge_') {
    browser.windows.get(parseInt(menuItem.menuItemId.substr(6)), { populate: true })
      .then(subject => merge([subject], currentTab.windowId, currentTab.id, currentTab.index))
  }
})
browser.commands.onCommand.addListener(command => {
  Promise.all([
    browser.tabs.query({ active: true, currentWindow: true }),
    getWindowsSorted(true)
  ]).then(command === 'merge-all-windows'
    ? ([[tab], windows]) => merge(windows.splice(1), tab.windowId, tab.id, tab.index)
    : ([[tab], windows]) => merge(windows.splice(1, 1), tab.windowId, tab.id, tab.index)
  )
})

/**
 * @param {number} focusedId The windows.Window object ID that last gained focus
 */
function drawMenus (focusedId) {
  if (focusedId === browser.windows.WINDOW_ID_NONE) return
  focusOrder = [...new Set([focusedId].filter(Number).concat(focusOrder))]
  Promise.all([
    getWindowsSorted(),
    browser.storage.local.get({ menu_location: ['all', 'tab', 'tools_menu'] }),
    browser.menus.removeAll()
  ]).then(([windows, { menu_location: menuLocations }]) => {
    if (windows.length < 2) return
    const parentId = browser.menus.create({
      title: 'Merge Windows',
      contexts: menuLocations
    })
    browser.menus.create({
      title: 'Merge all windows into this one',
      id: 'merge_all',
      parentId
    })
    browser.menus.create({
      type: 'separator',
      parentId
    })
    windows
      .splice(1)
      .forEach(window => {
        browser.menus.create({
          title: 'Merge tabs from ' + window.title,
          id: 'merge_' + window.id,
          parentId
        })
      })
  })
}

/**
 * @param {bool} [populate=false] Whether to populate windows.Window objects with tab information
 */
function getWindowsSorted (populate = false) {
  return new Promise(function (resolve, reject) {
    browser.windows.getAll({ windowTypes: ['normal'], populate })
      .then(windows => resolve(
        windows
          .sort((a, b) => [focusOrder.indexOf(a.id), focusOrder.indexOf(b.id)]
            .map(i => i < 0 ? Infinity : i)
            .reduce((a, b) => a === b ? 0 : a - b)
          )
          .filter((window, index, sorted) => window.incognito === sorted[0].incognito)
      ), reject)
  })
}

/**
 * @param {windows.Window[]} subjects Array of populated windows.Window objects
 * @param {number} target Window ID to merge all subjects’ tabs into
 * @param {number} active Tab ID of the active tab after merge
 * @param {number} activeIndex Index of the active tab
 */
function merge (subjects, target, active, activeIndex) {
  const tabs = subjects.reduce((flat, window) => flat.concat(window.tabs), [])
  Promise
    .all([browser.storage.local.get({ merge_insertion: ['0'] })].concat(tabs.filter(tab => tab.pinned).map(tab => browser.tabs.update(tab.id, { pinned: false }))))
    .then(([{ merge_insertion: mergeInsertion }, ...unpinned]) => {
      const moveIndex = mergeInsertion.pop() === '0' ? -1 : ++activeIndex
      const moveList = tabs.map(tab => tab.id)
      if (moveIndex !== -1) moveList.reverse()
      browser.tabs.move(moveList, { windowId: target, index: moveIndex })
        .then(() => {
          browser.tabs.update(active, { active: true })
          unpinned.forEach(tab => browser.tabs.update(tab.id, { pinned: true }))
        })
    })
}

browser.storage.onChanged.addListener(changes => {
  if ('menu_location' in changes) drawMenus()
})
