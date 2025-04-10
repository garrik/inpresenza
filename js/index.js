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
      const index = addPerson(name)
      renderPerson(people[index], index)
    }
    nameEl.value = ''
  })
  fragment.querySelector('button[type="reset"]').addEventListener('click', (e) => {
    //e.preventDefault()
    dialogEl.close()
  })

  return fragment
}

let people = []
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
      name
    }

    return person
}

function renderPerson(person, index = -1) {
  const peopleListEl = getOrCreatePeopleList()

  const personEl = document.createElement('li')
  personEl.classList.add('person')
  personEl.innerHTML = person.name

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

/**
 * Add people in bunch
 */
const bunchOfPeopleEl = document.getElementById('bunch-of-people')
// workaround: iframe is cached by the browser and 
// load event does not fire on page refresh, so we add a timestamp to avoid caching
bunchOfPeopleEl.src += '?timestamp=' + new Date().getTime()
bunchOfPeopleEl.addEventListener('load', (e) => {
  console.log('iframe loaded')
  // best effort: it seems there is no way to detect iframe load errors
  // but as of today both chrome and firefox set the same title for 404 load error
  // may be locale dependant :(
  if (bunchOfPeopleEl.contentDocument.title === 'Error response') {
    return
  }
  console.info('Load people from file')
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

  people.forEach(person => {
    renderPerson(person)
  })
})

function cleanName(name) {
  return name.trim().replace(/\s+/g, ' ')
}