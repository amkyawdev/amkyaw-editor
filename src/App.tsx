import { EditorApp } from './editor/EditorApp'

/**
 * Entry point. The engine-oriented shell was replaced by the mobile-first
 * editor UI in `src/editor/`, which owns its own store and component set.
 */
export const App = () => <EditorApp />
