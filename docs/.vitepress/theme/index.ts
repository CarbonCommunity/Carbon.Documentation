// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import CarbonButton from '../components/CarbonButton.vue'
import CarbonBadge from '../components/CarbonBadge.vue'
import CarbonChange from '../components/CarbonChange.vue'
import ItemsReference from '../components/ItemsReference.vue'
import EntitiesReference from '../components/EntitiesReference.vue'
import EntityPage from '../components/EntityPage.vue'
import PrefabReference from '../components/PrefabReference.vue'
import PrefabPage from '../components/PrefabPage.vue'
import BlueprintsReference from '../components/BlueprintsReference.vue'
import ItemPage from '../components/ItemPage.vue'
import BlueprintPage from '../components/BlueprintPage.vue'
import LootTableList from '../components/LootTableList.vue'
import CarbonIcons from '../components/CarbonIcons.vue'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import HooksIndex from '../components/HooksIndex.vue'
import HooksDetails from '../components/HooksDetails.vue'
import CommandReference from '../components/CommandReference.vue'
import ConVarReference from '../components/ConVarReference.vue'
import SwitchesReference from '../components/SwitchesReference.vue'
import ReleaseNotesReference from '../components/ReleaseNotesReference.vue'
import RustConVarReference from '../components/RustConVarReference.vue'
import RustCommandReference from '../components/RustCommandReference.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app, router, siteData }) {
    // https://vitepress.dev/guide/extending-default-theme#app-level-enhancements
    app.component('CarbonButton', CarbonButton)
    app.component('CarbonBadge', CarbonBadge)
    app.component('CarbonChange', CarbonChange)
    app.component('ItemsReference', ItemsReference)
    app.component('EntitiesReference', EntitiesReference)
    app.component('EntityPage', EntityPage)
    app.component('PrefabReference', PrefabReference)
    app.component('PrefabPage', PrefabPage)
    app.component('BlueprintsReference', BlueprintsReference)
    app.component('ItemPage', ItemPage)
    app.component('BlueprintPage', BlueprintPage)
    app.component('LootTableList', LootTableList)
    app.component('CarbonIcons', CarbonIcons)
    app.component('HooksIndex', HooksIndex)
    app.component('HooksDetails', HooksDetails)
    app.component('CommandReference', CommandReference)
    app.component('ConVarReference', ConVarReference)
    app.component('SwitchesReference', SwitchesReference)
    app.component('ReleaseNotesReference', ReleaseNotesReference)
    app.component('RustConVarReference', RustConVarReference)
    app.component('RustCommandReference', RustCommandReference)
    enhanceAppWithTabs(app)

  },
} satisfies Theme
