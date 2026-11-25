/**
 * Everything the store needs to run a shared workspace, behind one module so
 * it can be loaded with a single dynamic `import()`. Yjs and Trystero only
 * reach a browser that opens a shared project; the public reader and the
 * personal workspace never download them.
 */
import * as Y from 'yjs';
import { saveRoomState } from '../storage';
import type { Project } from '../../types';
import { writeProject } from './bridge';

export { CollabSession } from './session';
export { isEmptyDoc, readProject, writeProject } from './bridge';

/** Seeds a new shared project from `project` and stores it, ready to open. */
export async function seedSharedProject(room: string, project: Project): Promise<void> {
  const doc = new Y.Doc();
  writeProject(doc, null, project, 'seed');
  await saveRoomState(room, Y.encodeStateAsUpdate(doc));
}
