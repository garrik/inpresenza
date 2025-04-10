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
    const cleanedName = name.trim().replace(/\s+/g, ' ')
    if (cleanedName) {
      const person = addPerson(name)
      renderPerson(person)
    }
    nameEl.value = ''
  })
  fragment.querySelector('button[type="reset"]').addEventListener('click', (e) => {
    //e.preventDefault()
    dialogEl.close()
  })

  return fragment
}

const people = []
function addPerson(name) {
    const person = {
      name
    }
    people.push(person)

    return person
}

function renderPerson(person) {
  let peopleListEl = document.querySelector('.people-list')
  if (!peopleListEl) {
    peopleListEl = document.createElement('ul')
    peopleListEl.classList.add('people-list')
    document.body.querySelector('.main').appendChild(peopleListEl)
  }

  const personEl = document.createElement('li')
  personEl.classList.add('person')
  personEl.innerHTML = person.name
  
  peopleListEl.appendChild(personEl)
}