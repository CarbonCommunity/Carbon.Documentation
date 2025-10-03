<script lang="ts" setup>
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, PackageIcon } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { Ref, ref } from 'vue'
import CarbonButton from './CarbonButton.vue'

class ReleaseBuild {
  private static __idCounter: number = 0
  _id: number
  branch: string
  tag: string
  displayName: string
  displayDesc : string
  color: string
  rustBranches: string[]
  builds: string[]
  collapsed: boolean

  constructor(branch: string, tag: string, displayName: string, color: string, rustBranches: string[], builds: string[], collapsed: boolean = false, displayDesc: string = "") {
    this._id = ReleaseBuild.__idCounter++
    this.branch = branch
    this.tag = tag
    this.displayName = displayName
    this.displayDesc = displayDesc
    this.color = color
    this.rustBranches = rustBranches
    this.builds = builds
    this.collapsed = collapsed
  }
}

class DownloadSection {
  private static __idCounter: number = 0
  _id: number
  name: string
  releaseBuilds: ReleaseBuild[]

  constructor(name: string, releases: ReleaseBuild[]) {
    this._id = DownloadSection.__idCounter++
    this.name = name
    this.releaseBuilds = releases
  }
}

const sections = [
  new DownloadSection('Main', [
    new ReleaseBuild('production', 'production_build', 'Production', '#8f3333', ['public', 'release'], ['Release', 'Minimal'], true, "This is the most stable Carbon build you could run against the official Rust server public release."),
    new ReleaseBuild('develop', 'edge_build', 'Edge Build', '#6a6a0c', ['public', 'release'], ['Debug', 'Minimal'], false, "This build is Carbon's version of a staging build, packed with the most recent changes and features in Carbon that might end up getting added or not in the production build."),
    new ReleaseBuild('qa', 'qa_build', 'QA', '#0c676a', ['public', 'release', 'staging'], ['Debug', 'Release', 'Minimal'], false, "Periodically updated when the Carbon team has one or more significant changes that need crowd testing."),
    new ReleaseBuild('preview', 'preview_build', 'Preview', '#984b2b', ['public', 'release'], ['Debug', 'Minimal'], false, "This build is periodically updated and is packed with latest or experimental features and ideas that might never end up getting released in the official Carbon build."),
  ]),
  new DownloadSection('Rust', [
    new ReleaseBuild('rust_beta/staging', 'rustbeta_staging_build', 'Rust (Beta) Staging', '', ['staging'], ['Debug', 'Minimal']),
    new ReleaseBuild('rust_beta/release', 'rustbeta_release_build', 'Rust (Beta) Release', '', ['release'], ['Debug', 'Release', 'Minimal']),
    new ReleaseBuild('rust_beta/aux01', 'rustbeta_aux01_build', 'Rust (Beta) Aux01', '', ['aux01'], ['Debug', 'Minimal']),
    new ReleaseBuild('rust_beta/aux02', 'rustbeta_aux02_build', 'Rust (Beta) Aux02', '', ['aux02'], ['Debug', 'Minimal']),
    new ReleaseBuild('rust_beta/aux03', 'rustbeta_aux03_build', 'Rust (Beta) Aux03', '', ['aux03'], ['Debug', 'Minimal']),
  ]),
]

const activeSection: Ref<DownloadSection | null> = ref(sections.length ? sections[0] : null)
const expandedReleases: Ref<boolean[]> = ref(sections.flatMap(x => x.releaseBuilds).map(release => release.collapsed))
</script>

<template>
  <div class="mt-6 mb-6 flex gap-6">
    <template v-for="section in sections">
      <button
        class="section-button text-lg px-8 py-1.5 rounded-lg transition-all"
        :class="{ active: activeSection?.name == section.name }"
        @click="activeSection = section"
      >
        {{ section.name }}
      </button>
    </template>
  </div>
  <div class="flex flex-col gap-4">
    <template
      v-for="releaseBuild in activeSection?.releaseBuilds"
      :key="releaseBuild._id"
    >
      <div
        :style="'border: 2px solid ' + (releaseBuild.color || '#444444')"
        class="collapsible-section overflow-hidden rounded-lg"
      >
        <div
          class="collapsible-header px-6 py-3 cursor-pointer flex items-center justify-between"
          @click="expandedReleases[releaseBuild._id] = !expandedReleases[releaseBuild._id]"
        >
          <span class="text-xl font-semibold ">{{ releaseBuild.displayName }}</span>
          <component :is="expandedReleases[releaseBuild._id] ? ChevronDownIcon : ChevronRightIcon" :size="18" />
        </div>
        <Transition name="expand">
          <div
            v-show="expandedReleases[releaseBuild._id]"
            class="collapsible-content px-6 py-3 flex flex-col"
          >
            <span class="mt-1" v-if="releaseBuild.displayDesc != ''">{{ releaseBuild.displayDesc }}</span>
            <span class="mt-2">
              Based on the
              <code>
                <a
                  :href="'https://github.com/CarbonCommunity/Carbon/tree/' + releaseBuild.branch"
                  target="_blank">{{ releaseBuild.branch }}
                </a>
              </code>
              branch.
            </span>
            <div class="mt-4 flex gap-1">
              <a
                v-for="linkObject in [
                  { urlToAdd: 'releases/tag', badgeType: 'danger', msg: 'Github Release'},
                  { urlToAdd: 'commit', badgeType: 'info', msg: 'Latest Commit'},
                ]"
                :href="'https://github.com/CarbonCommunity/Carbon/' + linkObject.urlToAdd + '/' + releaseBuild.tag"
                target="_blank"
              >
                <VPBadge :type=linkObject.badgeType>{{ linkObject.msg }}&nbsp;
                  <ExternalLinkIcon class="carbon-icon" :size="14" />
                </VPBadge>
              </a>
            </div>
            <table>
              <thead>
              <tr>
                <th>Windows</th>
                <th>Linux</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="build in releaseBuild.builds" :key="build">
                <td v-for="os in ['win', 'linux']">
                  <CarbonButton
                    :href="'https://github.com/CarbonCommunity/Carbon/releases/download/' +
                      releaseBuild.tag +
                      '/Carbon.' +
                      (os == 'win' ? 'Windows' : 'Linux') +
                      '.' +
                      build +
                      (os == 'win' ? '.zip' : '.tar.gz')"
                    :text="build + ' Build'"
                    :icon="PackageIcon"
                    class="w-44"
                    external
                  />
                </td>
              </tr>
              </tbody>
            </table>
            <span>
            This build is compatible with
              <a v-for="rustBranch in releaseBuild.rustBranches" :key="rustBranch"
                 :href="'https://steamdb.info/app/258550/depots/?branch=' + rustBranch"
                 target="_blank"
              >
                <VPBadge type="warning">{{ rustBranch }}&nbsp;<ExternalLinkIcon class="carbon-icon" :size="14" /></VPBadge>
              </a>
              Rust branch.
            </span>
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section-button {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.section-button.active {
  background-color: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
}

.section-button:hover {
  background-color: var(--vp-c-bg-alt);
}

.collapsible-section {
  background-color: var(--vp-c-bg-soft);
}

.collapsible-header {
  transition: transform 0.2s ease-in-out;
}

.collapsible-header:hover {
  transform: scale(0.99);

}

.collapsible-content {
  background-color: var(--vp-c-bg-alt);
  border-top: 1px solid rgba(68, 68, 68, 0.1);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.expand-enter-active {
  transition-duration: 0.25s;
}

.expand-leave-active {
  transition-duration: 0.2s;
}

</style>
