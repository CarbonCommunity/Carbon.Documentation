<script lang="ts" setup>
import { CircleX } from 'lucide-vue-next'
import { onMounted, ref, Ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import CarbonBadge from './CarbonBadge.vue'

class Change {
  private static __idCounter: number = 0
  _id: number
  Message: string = ''
  Authors: string[] | null = null

  constructor(message: string, authors: string[] | null) {
    this._id = Change.__idCounter++
    this.Message = message
    this.Authors = authors
  }
}

class ChangeLogSection {
  private static __idCounter: number = 0
  _id: number
  Title: string = ''
  TypeId: number = 0
  Changes: Change[] = []

  constructor(title: string, typeId: number, changes: Change[]) {
    this._id = ChangeLogSection.__idCounter++
    this.Title = title
    this.TypeId = typeId
    this.Changes = changes
  }

  getChangeType(): 'add' | 'update' | 'remove' | 'fix' | 'misc' | 'date' {
    switch (this.TypeId) {
      case 0:
        return 'add'
      case 1:
        return 'update'
      case 2:
        return 'remove'
      case 3:
        return 'fix'
      case 4:
        return 'misc'
      default:
        return 'date'
    }
  }
}

class ChangeLog {
  private static __idCounter: number = 0
  _id: number
  Date: string = ''
  Version: string = ''
  CommitUrl: string = ''
  Sections: ChangeLogSection[] = []

  constructor(date: string, version: string, commitUrl: string, sections: ChangeLogSection[]) {
    this._id = ChangeLog.__idCounter++
    this.Date = date
    this.Version = version
    this.CommitUrl = commitUrl
    this.Sections = sections
  }
}

const changeLog: Ref<ChangeLog> = ref(
  new ChangeLog('', '', 'https://github.com/CarbonCommunity/Carbon/commit/', [
    new ChangeLogSection('Add', 0, []),
    new ChangeLogSection('Update', 1, []),
    new ChangeLogSection('Remove', 2, []),
    new ChangeLogSection('Fix', 3, []),
    new ChangeLogSection('Misc', 4, []),
  ])
)

function addChange(section: ChangeLogSection, event: Event) {
  const form = event.target as HTMLFormElement
  const input1 = form.children[0] as HTMLInputElement
  const input2 = form.children[1] as HTMLInputElement

  const message = input1.value.trim()
  if (message.length === 0) {
    return
  }

  const authors = input2.value
    ?.trim()
    .split(',')
    .map((author) => author.trim())
    .filter((author) => author.length > 0)

  section.Changes.push(new Change(message, authors))

  input1.value = ''
  input2.value = ''
  save()
}

function removeChange(section: ChangeLogSection, change: Change) {
  section.Changes = section.Changes.filter((c) => c._id !== change._id)
}

function focusChangeInput(section: ChangeLogSection) {
  currentlyFocusedChangeLogSection.value = section
}

function openCommitUrl(event: MouseEvent) {
  if (event.ctrlKey && event.target instanceof HTMLInputElement && event.target.value) {
    window.open(event.target.value, '_blank')
  }
}

function exportToJson(): string {
  const ret = {
    Date: changeLog.value.Date,
    Version: changeLog.value.Version,
    CommitUrl: changeLog.value.CommitUrl,
    Changes: changeLog.value.Sections.flatMap((section) => {
      return section.Changes.map((change) => {
        return {
          Message: change.Message,
          Type: section.TypeId,
          Authors: change.Authors ? change.Authors : undefined,
        }
      })
    }),
  }

  return JSON.stringify(ret, null, 2)
}

function exportToJsonToClipboard() {
  navigator.clipboard.writeText(exportToJson())
}

function exportToJsonToFile() {
  const blob = new Blob([exportToJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

function importFromJson(json: string, clearPreviousChanges: boolean) {
  const inp = JSON.parse(json)

  const typeIdToSection = new Map<number, ChangeLogSection>()
  changeLog.value.Sections.forEach((section) => {
    typeIdToSection.set(section.TypeId, section)
    if (clearPreviousChanges) {
      section.Changes = []
    }
  })

  inp.Changes.forEach((change: any) => {
    const section = typeIdToSection.get(change.Type)
    if (section) {
      section.Changes.push(new Change(change.Message, change.Authors))
    } else {
      typeIdToSection.set(change.Type, new ChangeLogSection('UNKNOWN', change.Type, []))
    }
  })

  changeLog.value.Date = inp.Date
  changeLog.value.Version = inp.Version
  changeLog.value.CommitUrl = inp.CommitUrl
}

function setJsonFromUserClipboard() {
  navigator.clipboard.readText().then((text) => {
    importFromJson(text, true)
  })
}

function appendJsonFromUserClipboard() {
  navigator.clipboard.readText().then((text) => {
    importFromJson(text, false)
  })
}

function prettyIsoDate(iso: string): string {
  const date = new Date(iso)
  // 2025-05-01T13:24:05.073Z
  // to
  // 2025-05-01 13:24 UTC+0

  const year: string = date.getUTCFullYear().toString()
  const month: string = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const day: string = date.getUTCDate().toString().padStart(2, '0')
  const hour: string = date.getUTCHours().toString().padStart(2, '0')
  const minute: string = date.getUTCMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute} UTC+0`
}

function fromPrettyToIsoDate(pretty: string): Date {
  // 2025-05-01 13:24 UTC+0
  const [date, time] = pretty.split(' ')
  const [year, month, day] = date.split('-')
  const [hour, minute] = time.split(':')

  const dateObject = new Date(`${year}-${month}-${day}T${hour}:${minute}Z`)

  return dateObject
}

const currentDatePickerValue = ref('')

watch(currentDatePickerValue, (newDate) => {
  const date = new Date(newDate)
  try {
    const currentDate = fromPrettyToIsoDate(changeLog.value.Date)
    date.setHours(currentDate.getHours())
    date.setMinutes(currentDate.getMinutes())
  } catch {
    /* empty */
  }
  changeLog.value.Date = prettyIsoDate(date.toISOString())
  save()
})

const currentlyFocusedChangeLogSection = ref<ChangeLogSection | null>(null)

function save() {
  localStorage.setItem('docs-changelog-latest', JSON.stringify(changeLog.value))
}

function clear() {
  const confirmDelete = window.confirm(`Are you sure you want to clear?`)
  if (confirmDelete) {
    changeLog.value = new ChangeLog('', '', 'https://github.com/CarbonCommunity/Carbon/commit/', [
      new ChangeLogSection('Add', 0, []),
      new ChangeLogSection('Update', 1, []),
      new ChangeLogSection('Remove', 2, []),
      new ChangeLogSection('Fix', 3, []),
      new ChangeLogSection('Misc', 4, []),
    ])
    save()
  }
}

onMounted(() => {
  const lastChangelog = localStorage.getItem('docs-changelog-latest')
  if (lastChangelog) {
    const cg = JSON.parse(lastChangelog)
    changeLog.value = new ChangeLog(
      cg['Date'],
      cg['Version'],
      cg['CommitUrl'],
      cg['Sections'].map(
        (section) =>
          new ChangeLogSection(
            section['Title'],
            Number(section['TypeId']),
            section['Changes'].map((change) => new Change(change['Message'], change['Authors']))
          )
      )
    )
  }
})
</script>

<template>
  <div class="container mx-auto p-14">
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Change Log Generator</h1>
      <div>
        <input type="date" @change="save()" v-model="currentDatePickerValue" />
      </div>
      <input v-model="changeLog.Date" type="text" @change="save()" placeholder="Date ( 2025-05-12 11:40 UTC+0 ) BETTER BE UTC" />
      <input v-model="changeLog.Version" type="text" @change="save()" placeholder="Semantic Version ( 2.0.185 )" />
      <input
        class="underline"
        v-model="changeLog.CommitUrl"
        type="text"
        placeholder="Commit URL ( Ctrl + Click to open in new tab )"
        title="Commit URL ( Ctrl + Click to open in new tab )"
        @change="save()"
        @click="(event: MouseEvent) => openCommitUrl(event)"
      />
      <VueDraggable v-model="changeLog.Sections" :animation="150" ghostClass="ghost" class="mt-4 flex flex-col gap-8">
        <div class="flex flex-col gap-2" v-for="section in changeLog.Sections" :key="section._id">
          <h2 class="text-xl font-bold">{{ section.Title }}</h2>
          <div class="flex flex-col gap-4">
            <VueDraggable v-model="section.Changes" :animation="150" ghostClass="ghost" group="changes" class="flex flex-col gap-2">
              <template v-for="change in section.Changes" :key="change._id">
                <div class="flex flex-row items-center gap-2">
                  <div class="relative">
                    <button
                      class="z-100 absolute top-1/2 -translate-x-full -translate-y-1/2 text-red-500 hover:text-red-300"
                      @click="() => removeChange(section, change)"
                    >
                      <CircleX :size="18" :stroke-width="1.5" />
                    </button>
                    <CarbonBadge style="user-select: none" :variant="section.getChangeType()">{{ section.getChangeType().toUpperCase() }}</CarbonBadge>
                  </div>
                  <div class="flex w-full flex-col text-sm">
                    <input placeholder="Message" @change="save()" v-model="change.Message" type="text" />
                    <input
                      placeholder="Authors"
                      class="text-xs text-blue-300"
                      :value="change.Authors"
                      @change="save()"
                      @input="
                        (event) =>
                          (change.Authors = (event.target as HTMLInputElement)?.value
                            .trim()
                            .split(',')
                            .map((author) => author.trim()))
                      "
                      type="text"
                    />
                  </div>
                </div>
              </template>
            </VueDraggable>
            <form class="flex flex-col gap-2" @submit.prevent="(event: Event) => addChange(section, event)">
              <input type="text" placeholder="Add a new change message" class="text-sm" @change="save()" @focus="focusChangeInput(section)" />
              <input type="text" placeholder="Author1,Author2" class="text-sm" @change="save()" v-show="currentlyFocusedChangeLogSection === section" />
              <button class="hidden" type="submit"></button>
            </form>
          </div>
        </div>
      </VueDraggable>
      <button @click="save">Save</button>
      <button @click="clear">Clear</button>
      <button @click="exportToJsonToClipboard">JSON to clipboard</button>
      <button @click="exportToJsonToFile">JSON to file</button>
      <button @click="setJsonFromUserClipboard">Import from JSON clipboard</button>
      <button @click="appendJsonFromUserClipboard">Append changes from JSON clipboard</button>
    </div>
  </div>
</template>
