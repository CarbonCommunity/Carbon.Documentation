<script setup lang="ts">
import type { Hook, ReturnBehavior } from '@/api/metadata/carbon/hooks'
import ButtonIconCopy from '@/components/common/ButtonIconCopy.vue'
import CodeBlock from '@/components/common/CodeBlock.vue'
import { getHookFlagsText } from '@/shared/constants'
import { ExternalLink } from 'lucide-vue-next'
import { VPBadge } from 'vitepress/theme'
import { shallowRef } from 'vue'

const { hook, isCtrlPressed } = defineProps<{
  hook: Hook
  isCtrlPressed: boolean
}>()

const isExampleExpanded = shallowRef<boolean>(false)
const isSourceExpanded = shallowRef<boolean>(false)

function getCorrespondingTitleForHookFlag(flag: string): string {
  switch (flag) {
    case 'Static':
      return 'Permanently active if loaded once'
    case 'Patch':
      return "Permanently active Patch which don't necessarily execute hooks (modify game code)"
    case 'IgnoreChecksum':
      return 'Dynamically patched regardless of version '
    default:
      return ''
  }
}

function getReturnBehavior(hook: Hook): ReturnBehavior {
  return hook.ReturnBehavior ?? 'Unspecified'
}

function getReturnTypeWithArticle(hook: Hook): string {
  return `${/^[aeiou]/i.test(hook.ReturnTypeName) ? 'an' : 'a'} ${hook.ReturnTypeName}`
}

function getReturnBehaviorText(hook: Hook): string {
  switch (getReturnBehavior(hook)) {
    case 'Discarded':
      return 'Returning a value has no effect.'
    case 'Cancel':
      return 'Return any non-null value to skip the default behavior.'
    case 'Override':
      return `Return ${getReturnTypeWithArticle(hook)} to override the result and skip the default behavior. Returning null runs the default.`
    case 'Modify':
      return `Return ${getReturnTypeWithArticle(hook)} to replace the value used internally. Execution continues.`
    case 'Unspecified':
    default:
      return ''
  }
}

function getReturnComment(hook: Hook): string {
  switch (getReturnBehavior(hook)) {
    case 'Cancel':
      return 'any non-null value skips the default behavior'
    case 'Override':
      return `return ${getReturnTypeWithArticle(hook)} to override the result`
    case 'Modify':
      return `return ${getReturnTypeWithArticle(hook)} to replace the value used internally`
    default:
      return ''
  }
}

function getExampleCode(hook: Hook): string {
  const usesReturn = getReturnBehavior(hook) !== 'Discarded'
  const comment = getReturnComment(hook)
  const lines = [
    `private ${usesReturn ? 'object' : 'void'} ${hook.Name}(${hook.ParametersText})`,
    '{',
    `    Puts("${hook.Name} has been called!");`,
    usesReturn ? `    return null;${comment ? ` // ${comment}` : ''}` : null,
    '}',
  ]
  const code = lines.filter((line) => line != null).join('\n')
  return code
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-1">
      <div class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
        <div class="flex items-center gap-2">
          <h5 class="flex items-center gap-2 text-lg font-medium">
            <a
              :href="isCtrlPressed ? `?s=${hook.FullName}` : undefined"
              :class="[
                'relative transform transition-all duration-200 ease-in-out',
                'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-500 bg-clip-text',
                'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full',
                'after:rounded-full after:bg-gradient-to-r after:from-violet-500 after:via-fuchsia-500 after:to-purple-500',
                'after:origin-left after:transition-transform after:duration-200 after:ease-in-out',
                isCtrlPressed
                  ? [
                      'font-semibold text-transparent hover:text-transparent',
                      'hover:text-gray-600 dark:hover:text-gray-300',
                      'after:scale-x-100 hover:scale-[1.02]',
                    ]
                  : ['after:scale-x-0'],
              ]"
              title="Hold CTRL for quick open"
              >{{ hook.FullName }}</a
            >
            <a :href="`?s=${hook.FullName}`" target="_blank">
              <ExternalLink :size="14" class="opacity-60" />
            </a>
          </h5>
          <ButtonIconCopy :getTextToCopy="() => hook.Id.toString()" :title="`Copy hook ID: ${hook.Id}`" class="opacity-60" />
        </div>
        <div class="flex flex-wrap gap-1.5">
          <VPBadge v-if="hook.Category" type="info" :text="hook.Category" title="Category" />
          <template v-for="flag in getHookFlagsText(hook.Flags)" :key="flag">
            <VPBadge type="danger" :text="`${flag}`" :title="getCorrespondingTitleForHookFlag(flag)" />
          </template>
          <VPBadge v-if="hook.OxideCompatible" type="tip" text="Oxide Compatible" title="Indicates that this hook is compatible with Oxide" />
        </div>
      </div>
      <div class="flex flex-col text-sm text-gray-500">
        <template v-for="(description, index) in hook.Descriptions" :key="index">
          <span class="font-bold">{{ description }}</span>
        </template>
        <span v-if="hook.AssemblyName" class="text-xs">
          {{ [hook.AssemblyName, hook.TargetName].filter(Boolean).join('; ') }}
        </span>
        <span v-if="getReturnBehaviorText(hook)">
          {{ getReturnBehaviorText(hook) }}
        </span>
      </div>
    </div>
    <div class="mt-1 flex gap-2">
      <button
        class="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800"
        @click="isExampleExpanded = !isExampleExpanded"
      >
        {{ isExampleExpanded ? 'Hide Example' : 'Show Example' }}
        <ButtonIconCopy :getTextToCopy="() => getExampleCode(hook)" />
      </button>
      <button
        v-if="hook.MethodSource"
        class="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800"
        @click="() => (isSourceExpanded = !isSourceExpanded)"
      >
        {{ isSourceExpanded ? 'Hide Source' : 'Show Source' }}
        <ButtonIconCopy :getTextToCopy="() => hook.MethodSource" />
      </button>
      <button v-else disabled class="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800">No method source</button>
    </div>
    <Transition name="expand">
      <CodeBlock v-if="isExampleExpanded" :code="getExampleCode(hook)" class="mt-2" />
    </Transition>
    <Transition name="expand">
      <CodeBlock v-if="hook.MethodSource && isSourceExpanded" :code="hook.MethodSource" class="mt-2" />
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.44, 1.1, 0.91, 0.94);
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
