// Composite "Add" presets — choices in the element picker that expand into SEVERAL nested elements
// (vs. a single registry type). Kept in a plain module (not a `<script setup>` SFC, which can't export)
// so ElementTypeMenu and every picker consumer share one source for the union + the list.

/** A preset key emitted by the picker alongside the plain {@link ElementType}s. */
export type AddPreset = 'textbg'

export const ADD_PRESETS: { preset: AddPreset; label: string }[] = [{ preset: 'textbg', label: 'Text + background' }]
