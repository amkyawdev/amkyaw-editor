import { useEditorStore } from '../useEditorStore'
import { BottomSheet } from './BottomSheet'
import { AddSheet } from './AddSheet'
import { EffectsSheet } from './EffectsSheet'
import { TextSheet } from './TextSheet'
import { TransformSheet } from './TransformSheet'
import { SettingsSheet } from './SettingsSheet'
import { ExportSheet } from './ExportSheet'

const TITLES = {
  add: 'Add layer',
  effects: 'Effects',
  text: 'Text',
  transform: 'Transform',
  settings: 'Settings',
  export: 'Export',
} as const

/** Sheet heights are tuned per panel so content fits without scrolling. */
const HEIGHTS = {
  add: 0.44,
  effects: 0.62,
  text: 0.5,
  transform: 0.6,
  settings: 0.6,
  export: 0.55,
} as const

/**
 * Single sheet host. Mounting one `BottomSheet` (rather than one per panel)
 * means the drag container and backdrop exist once, so switching tools does not
 * replay the entrance animation.
 */
export const SheetHost = () => {
  const sheet = useEditorStore((state) => state.sheet)
  const closeSheet = useEditorStore((state) => state.closeSheet)

  if (!sheet) return null

  return (
    <BottomSheet
      open
      onClose={closeSheet}
      title={TITLES[sheet]}
      height={HEIGHTS[sheet]}
    >
      {sheet === 'add' ? <AddSheet /> : null}
      {sheet === 'effects' ? <EffectsSheet /> : null}
      {sheet === 'text' ? <TextSheet /> : null}
      {sheet === 'transform' ? <TransformSheet /> : null}
      {sheet === 'settings' ? <SettingsSheet /> : null}
      {sheet === 'export' ? <ExportSheet /> : null}
    </BottomSheet>
  )
}
