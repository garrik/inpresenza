let people = [] // the informations about people presence in office
const ippStoreKey = 'in-presence-people-store'
const storedPeople = getStoredInPresencePeople()

if (storedPeople.length > 0) {
  people = storedPeople
  console.info('Load previously stored informations about people presence in office')

  people.forEach(person => renderPerson(person))
}

/**
 * Add people one by one
 */
const addPersonButton = document.getElementById('add-person')
addPersonButton.addEventListener('click', (e) => {
    let dialogEl = document.querySelector('.add-person-dialog')
    if (!dialogEl) {
      dialogEl = document.createElement('dialog')
      dialogEl.classList.add('add-person-dialog')
      dialogEl.appendChild(createAddPersonFragmentIn(dialogEl))
      document.body.appendChild(dialogEl)
    }
    dialogEl.classList.remove('hidden')
    dialogEl.showModal()
    dialogEl.addEventListener("close", e => {
      dialogEl.classList.add('hidden')
    })
}, false)

/**
 * Clear people presence at midnight
 * Remove guests at the end of the week
 */
const ippWorkDayKey = 'in-presence-people-work-day'
let workDayTime = getStoredWorkDay()
const ippWorkWeekKey = 'in-presence-people-work-week'
let workWeekTime = getStoredWorkWeek()
let processResetsId
processResets()
window.addEventListener('focus', () => {
  processResetsId = setTimeout(processResets, 300000)
})

function processResets(){
  console.log('process resets')
  clearPeoplePresenceAtMidnight()
  resetPeopleOnWeekEnd()
  processResetsId = setTimeout(processResets, 300000)
}

function clearPeoplePresenceAtMidnight() {
  if (workDayTime.getDay() !== new Date().getDay()) {
    console.info('day changed, clear presence informations')
    clearPeoplePresence()
    workDayTime = new Date()
    updateStoredWorkDay(workDayTime)
  }
}

function resetPeopleOnWeekEnd() {
  if (getWeekOfYear(workWeekTime) !== getWeekOfYear(new Date())) {
    console.info('week changed, clear presence informations')
    console.info('Remove people list and in presence informations')
    removeNonPermanentPeople()
    workWeekTime = new Date()
    updateStoredWorkWeek(workWeekTime)
  }
}

function getWeekOfYear(date) {
  const firstDateOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date - firstDateOfYear) / (24 * 60 * 60 * 1000))
  return Math.ceil((firstDateOfYear.getDay() + days + 1) / 7)
}

function createAddPersonFragmentIn(dialogEl) {
  const html = `<form method="dialog" class="pure-form pure-form-aligned">
                    <fieldset>
                        <div class="pure-control-group">
                            <label for="name">Nome</label>
                            <input id="name" type="text" placeholder="Nome">
                        </div>
                        <div class="pure-controls">
                            <button type="submit" class="pure-button pure-button-primary">Aggiungi</button>
                            <button type="reset" class="pure-button">Chiudi</button>
                        </div>
                    </fieldset>
                </form>`
  const template = document.createElement('template')
  template.innerHTML = html
  const fragment = template.content
  fragment.querySelector('form')
    .addEventListener('submit', addPersonHandler, false)
  fragment.querySelector('form')
    .addEventListener('reset', (e) => dialogEl.close(), false)

  return fragment
}

function addPersonHandler(e) {
  e.preventDefault() // keep dialog open
  const nameEl = document.querySelector('#name')
  const name = nameEl.value
  const cleanedName = cleanName(name)
  if (cleanedName) {
    if (cleanedName.charAt(0) === '#') {
      executeCommand(cleanedName)
    }
    else {
      const index = addPerson(name)
      updateInPresencePeopleStore()
      renderPerson(people[index], index)
    }
  }
  nameEl.value = ''
}

function addPerson(name) {
  const person = createPerson(name)
  const index = getSortedPersonIndex(people, name)
  people.splice(index, 0, person)

  return index
}

function getSortedPersonIndex(people, name) {
  var low = 0,
    high = people.length
  while (low < high) {
    var mid = (low + high) >>> 1
    if (people[mid].name.toLowerCase().localeCompare(name.toLowerCase()) < 0) {
      low = mid + 1
    }
    else {
      high = mid
    }
  }
  return low
}

function createPerson(name, isPermanent = false) {
    const person = {
      id: toSlug(name),
      name,
      isPresent: false,
      isPermanent // non permanent people are guests
    }

    return person
}

function renderPerson(person, index = -1) {
  const peopleListEl = getOrCreatePeopleList()

  const personEl = document.createElement('li')
  personEl.classList.add('person')
  personEl.innerHTML = `<input type="checkbox" id="${person.id}">
    <label for="${person.id}" class="pure-button">${person.name}</label>`
  if (person.isPresent) {
    personEl.querySelector('input').checked = true
  }
  personEl.querySelector('input').addEventListener('change', (e) => {
    const person = people.find(p => p.id === e.target.id)
    if (!person) {
        console.error('person not found: presence will not be stored')
        return
    }

    person.isPresent = e.target.checked
    updateInPresencePeopleStore()
  }, false)

  if (index === -1) {
    peopleListEl.appendChild(personEl)
  }
  else {
    peopleListEl.insertBefore(personEl, peopleListEl.children[index])
  }
}

function getOrCreatePeopleList() {
  let peopleListEl = document.querySelector('.people-list')
  if (!peopleListEl) {
    peopleListEl = document.createElement('ul')
    peopleListEl.classList.add('people-list')
    document.body.querySelector('.main').appendChild(peopleListEl)
  }
  return peopleListEl
}

function toSlug (str) {
  str = str.replace(/^\s+|\s+$/g, '') // trim
  str = str.toLowerCase()

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:"
  var to   = "aaaaeeeeiiiioooouuuunc------"
  for (var i=0, l=from.length ; i<l ; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes

  return str
}

function showLoadPeopleFields() {
  const dialogEl = document.querySelector('.add-person-dialog')
  if (!dialogEl) {
    console.error('dialog not found')
    return
  }

  const fragment = createLoadPeopleFragmentIn(dialogEl)

  // hide field to add single person
  // and insert field to add people from file
  const fieldsetEl = dialogEl.querySelector('fieldset')
  const nameGroupEl = fieldsetEl && fieldsetEl.children.length && 
                      fieldsetEl.children[0]
  nameGroupEl.classList.add('hidden')
  const controlGroupEl = fieldsetEl && fieldsetEl.children.length &&
                         fieldsetEl.children[fieldsetEl.children.length - 1]
  controlGroupEl && fieldsetEl.insertBefore(fragment, controlGroupEl)
}

function createLoadPeopleFragmentIn(dialogEl) {
  function addPeopleHandler(e) {
    const inputEl = dialogEl.querySelector('#people-files')
    if (!inputEl || !inputEl.files) {
      console.error('people files not found')
      return
    }

    // add people from file
    if (inputEl.files.length) {
      console.info('Load people list from file', inputEl.files[0].name)
      const reader = new FileReader()
      reader.onload = (e) => {
        populatePeople(e.target.result)
  
        const peopleListEl = getOrCreatePeopleList()
        peopleListEl.innerHTML = ''
        people.forEach(person => renderPerson(person))
      }
      reader.readAsText(inputEl.files[0])
    }

    resetDialogToOriginalState()
  }
  function resetDialogToOriginalState() {
    const fieldsetEl = dialogEl.querySelector('fieldset')
    const nameGroupEl = fieldsetEl && fieldsetEl.children.length && 
                        fieldsetEl.children[0]
    nameGroupEl.classList.remove('hidden')
    const inputEl = dialogEl.querySelector('#people-files')
    inputEl && fieldsetEl.removeChild(inputEl.parentElement)
    dialogEl.querySelector('form')
      .removeEventListener('submit', addPeopleHandler, false)
    dialogEl.querySelector('form')
      .addEventListener('submit', addPersonHandler, false)
    dialogEl.removeEventListener('close', resetDialogToOriginalState, false)
  }
  const html = `<div class="pure-control-group">
                  <label for="people-files">File dei nomi</label>
                  <input id="people-files" type="file">
                </div>`
  const template = document.createElement('template')
  template.innerHTML = html
  const fragment = template.content

  dialogEl.querySelector('form')
    .removeEventListener('submit', addPersonHandler, false)
  dialogEl.querySelector('form')
    .addEventListener('submit', addPeopleHandler, false)
  dialogEl.addEventListener('close', resetDialogToOriginalState, false)

  return fragment
}

/**
 * Add people in bunch
 */
// use file only when there is no information from local storage
if (people.length === 0) {
  fetch('people.txt').then((response) => {
    if (!response.ok) {
      return Promise.reject(new Error(response.statusText))
    }
  
    console.info('Load people list from file')
    return response.text()
  }).then((names) => {
    // overwrite the global list of people
    populatePeople(names)
  
    people.forEach(person => renderPerson(person))
  }).catch((error) => {
    console.error('Load people list from file failed.', error.message)
  })
}

function populatePeople(names) {
  people = names.split('\n')
    .reduce((acc, name) => {
      const cleanedName = cleanName(name)
      if (cleanedName) {
        acc.push(cleanedName)
      }
      return acc
    }, [])
    .sort()
    .map(name => {
      // people read from file are permanent, i.e. they are not guests
      return createPerson(name, true)
    })
  updateInPresencePeopleStore()
}

function cleanName(name) {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Store people
 */
function updateInPresencePeopleStore(){

  const peopleToStore = JSON.stringify(people)
  try {
    localStorage.setItem(ippStoreKey, peopleToStore)
  }
  catch (e) {
    console.error('failed to store people, in presence data will not survive to page refresh, sorry')
  }
}

function getStoredInPresencePeople(){

  const storedPeople = localStorage.getItem(ippStoreKey)
  if (!storedPeople) { return [] }

  return JSON.parse(storedPeople)
}

function removeStoredInPresencePeople(){
  localStorage.removeItem(ippStoreKey)
}

function getStoredWorkDay(){

  const storedWorkDayMs = localStorage.getItem(ippWorkDayKey)
  if (!storedWorkDayMs) {
    const date = new Date()
    updateStoredWorkDay(date)
    return date
  }

  return new Date(parseInt(storedWorkDayMs))
}
function updateStoredWorkDay(workDayTime){

  try {
    localStorage.setItem(ippWorkDayKey, workDayTime.getTime())
  }
  catch (e) {
    console.error('failed to store work day')
  }
}
function getStoredWorkWeek(){

  const storedWorkWeekMs = localStorage.getItem(ippWorkWeekKey)
  if (!storedWorkWeekMs) { 
    const date = new Date()
    updateStoredWorkWeek(date)
    return date
  }

  return new Date(parseInt(storedWorkWeekMs))
}
function updateStoredWorkWeek(workWeekTime){

  try {
    localStorage.setItem(ippWorkDayKey, workWeekTime.getTime())
  }
  catch (e) {
    console.error('failed to store work week')
  }
}

/**
 * Execute commands
 */
function executeCommand(command) {
  if (command === '#reset') {
    console.info('Remove people list and in presence informations')
    removeStoredInPresencePeople()
    location.reload()
  }
  else if (command === '#clear') {
    clearPeoplePresence()
  }
  else if (command === '#removeguests') {
    removeNonPermanentPeople()
  }
  else if (command.startsWith('#remove')) {
    const name = command.substring('#remove'.length).trim().toLowerCase()
    removePersonBy(name)
  }
  else if (command === '#load') {
    showLoadPeopleFields()
  }
}

function clearPeoplePresence() {
  console.info('Clear in presence informations')
  people.forEach(person => {
    person.isPresent = false
  })
  updateInPresencePeopleStore()

  const peopleListEl = getOrCreatePeopleList()
  peopleListEl.querySelectorAll('input').forEach(el => el.checked = false)
}

function removePersonBy(name) {
  console.info(`Remove ${name} from list`)
  const index = people.findIndex(person => person.name.toLowerCase() === name)
  if (index === -1) {
    console.warn('person not found')
    return
  }

  people.splice(index, 1)
  const peopleListEl = getOrCreatePeopleList()
  peopleListEl.removeChild(peopleListEl.children[index])
  updateInPresencePeopleStore()
}

function removeNonPermanentPeople() {
  console.info('Remove non permanent people from list')

  // remove non permanent people from ui first, before deleting them
  const peopleListEl = getOrCreatePeopleList()
  people.reverse().forEach((person, i) => {
    if (!person.isPermanent) {
      console.assert(person.id === peopleListEl.children[people.length - i - 1].querySelector('input').id)
      peopleListEl.removeChild(peopleListEl.children[people.length - i - 1])
    }
  })

  people = people.filter(person => person.isPermanent)
  updateInPresencePeopleStore()
}
