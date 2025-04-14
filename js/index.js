let people = [] // the informations about people presence in office
const inPresencePeopleKey = 'in-presence-people';
const storedPeople = getStoredInPresencePeople()

if (storedPeople.length > 0) {
  people = storedPeople
  console.info('Load previously stored informations about people presence in office')

  people.forEach(person => {
    renderPerson(person)
  })
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
}, false);

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
  const template = document.createElement('template');
  template.innerHTML = html
  const fragment = template.content
  fragment.querySelector('button[type="submit"]').addEventListener('click', (e) => {
    e.preventDefault()
    const nameEl = dialogEl.querySelector('#name')
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
  })
  fragment.querySelector('button[type="reset"]').addEventListener('click', (e) => {
    //e.preventDefault()
    dialogEl.close()
  })

  return fragment
}

function addPerson(name) {
    const person = createPerson(name)
    const index = getSortedPersonIndex(people, name)
    people.splice(index, 0, person)
 
    return index
}

function getSortedPersonIndex(people, name) {
  var low = 0,
    high = people.length;
  while (low < high) {
    var mid = (low + high) >>> 1
    if (people[mid].name.toLowerCase().localeCompare(name.toLowerCase()) < 0) {
      low = mid + 1;
    }
    else {
      high = mid;
    }
  }
  return low;
}

function createPerson(name) {
    const person = {
      id: toSlug(name),
      name,
      isPresent: false
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
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

/**
 * Add people in bunch
 */
const bunchOfPeopleEl = document.getElementById('bunch-of-people')
// workaround: iframe is cached by the browser and 
// load event does not fire on page refresh, so we add a timestamp to avoid caching
bunchOfPeopleEl.src += '?timestamp=' + new Date().getTime()
bunchOfPeopleEl.addEventListener('load', (e) => {
  // information restored is likely more up to date than the file
  if (people.length > 0) {
    return
  }
  // it seems there is no way to detect iframe load errors
  // workaround: when a load error occours the response comes in an html page
  // so we assume that if the response is an html page then an error is occurred
  if (bunchOfPeopleEl.contentDocument.documentElement.outerHTML.startsWith('<')) {
    return
  }
  console.info('Load people list from file')
  const names = bunchOfPeopleEl.contentDocument.documentElement.innerText
  // overwrite the global list of people
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
      return createPerson(name)
    })
  updateInPresencePeopleStore()

  people.forEach(person => {
    renderPerson(person)
  })
})

function cleanName(name) {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Store people
 */
function updateInPresencePeopleStore(){

  const peopleToStore = JSON.stringify(people);
  try {
      localStorage.setItem(inPresencePeopleKey, peopleToStore);
  }
  catch (e) {
      console.error('failed to store people, in presence data will not survive to page refresh, sorry');
  }
}

function getStoredInPresencePeople(){

  const storedPeople = localStorage.getItem(inPresencePeopleKey);
  if (!storedPeople) { return [] }

  return JSON.parse(storedPeople);
}

function removeStoredInPresencePeople(){
  localStorage.removeItem(inPresencePeopleKey);
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
    location.reload()
  }
  else if (command.startsWith('#remove')) {
    const name = command.substring('#remove'.length).trim().toLowerCase()
    removePersonBy(name)
  }
}

function clearPeoplePresence() {
  console.info('Clear in presence informations')
  people.forEach(person => {
    person.isPresent = false
  })
  updateInPresencePeopleStore()
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
