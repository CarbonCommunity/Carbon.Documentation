<template>
  <NewsSectionTitle text="Changelog"/>
  <NewsImage src="https://files.facepunch.com/Alistair/128/04/2025/6x79/jungleupdate_rock_03.jpg" h="250px" y="20px"/>
  <NewsSection>
    <div v-if="releaseNote">
      The following changes are for Carbon version <strong>{{ releaseNote?.Version }}</strong> and was released on <strong>{{ new Date(releaseNote?.Date).toDateString() }}</strong>.      

      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <tbody>
        <tr v-for="change in releaseNote?.Changes?.slice().sort((a, b) => a.Type - b.Type)">
          <td class="whitespace-normal">
            <CarbonChange :variant="getChangeType(change.Type)"
                          :text="change.Message + (change.Authors != null && change.Authors.length > 0 ? `<br><p style='font-size: 12px;'>Authors: ` + change.Authors.map(x => `<a style='color: var(--c-carbon-1);' target='_blank' href='https://github.com/${x}'/>@` + x + ` </a> `).join(', ') + '</p>' : '')" />
          </td>
        </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!releaseNote">
      <Loader2 class="animate-spin" :size="24" />
    </div>
  </NewsSection>
</template>

<script setup lang="ts">
import type { ChangelogCarbon } from '@/api/metadata/carbon/changelogs'
import { fetchChangelogsCarbon } from '@/api/metadata/carbon/changelogs'
import { onMounted, ref, Ref } from 'vue'
import NewsSectionTitle from './NewsSectionTitle.vue'
import { Loader2 } from 'lucide-vue-next'

const releaseNotes: Ref<ChangelogCarbon[]> = ref([])
const releaseNote: Ref<ChangelogCarbon | null> = ref(null)

interface Props {
  version: string;
}

const getChangeType = (val: number) => {
  if (val == 0) {
    return 'add'
  } else if (val == 1) {
    return 'update'
  } else if (val == 2) {
    return 'remove'
  } else if (val == 3) {
    return 'fix'
  } else if (val == 4) {
    return 'misc'
  }
  return 'date'
}

const moduleLinks = {
  'Admin Module': '/owners/modules/admin-module',
  'AutoWipe Module': '/owners/modules/optional-modules/autowipe-module',
  'StackManager Module': '/owners/modules/optional-modules/stack-manager-module',
  'GatherManager Module': '/owners/modules/optional-modules/gather-manager-module',
  'Vanish Module': '/owners/modules/optional-modules/vanish-module'
}

const linkifyModules = (text: string) => {
  return text.replace(/\[(.+?)\]/g, (match, moduleName) => {
    const url = moduleLinks[moduleName as keyof typeof moduleLinks]
    return url ? `[[${moduleName}](${url})]` : match
  })
}

const loadReleaseNotes = async () => {
  try {
    const data = await fetchChangelogsCarbon()
    releaseNotes.value = data.map(release => ({
      ...release,
      Changes: release.Changes.map(change => ({
        ...change,
        Message: linkifyModules(change.Message)
      }))
    }))
    releaseNote.value = releaseNotes.value.filter(change => change.Version == props.version)[0]
  } catch (err) {
    console.error('Failed to load release notes:', err)
  }
}

onMounted(async () => {
  await loadReleaseNotes()
})
const props = defineProps<Props>()
</script>

<style scoped>

</style>
