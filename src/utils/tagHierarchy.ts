/**
 * Qalam Note - Nested / Hierarchical Tags Engine
 * Handles nested tag paths separated by '/' (e.g. #proyek/riset/islam),
 * builds hierarchical tag trees, calculates cumulative note counts,
 * and performs subtag-aware filtering.
 */

import type { Tag, Note } from '../types';

export interface TagTreeNode {
  fullPath: string;       // e.g. "proyek/riset/islam"
  name: string;           // e.g. "islam"
  tagId?: string;         // original tag id if exact tag exists in DB
  noteCount: number;      // notes matching this exact tag
  cumulativeCount: number;// notes matching this tag OR any nested subtags
  children: TagTreeNode[];
  depth: number;
}

/**
 * Checks whether a note tag matches a target tag or is a subtag of it.
 * e.g. 'proyek/riset' matches target 'proyek'.
 */
export function isTagOrSubtag(noteTag: string, targetTag: string): boolean {
  if (!noteTag || !targetTag) return false;
  const n = noteTag.toLowerCase();
  const t = targetTag.toLowerCase();
  return n === t || n.startsWith(`${t}/`);
}

/**
 * Builds an expandable hierarchical tag tree from a list of tags and note counts.
 * Automatically synthesizes parent nodes if only a subtag exists.
 */
export function buildTagTree(
  tags: Tag[],
  noteCountsByTag: Record<string, number> = {},
  notes?: Note[]
): TagTreeNode[] {

  // Collect all unique tag paths and their IDs
  const pathToTagMap = new Map<string, Tag>();
  for (const t of tags) {
    if (t.title) {
      pathToTagMap.set(t.title, t);
    }
  }

  // Also include any tag titles that appear in note counts but might not be in tags table yet
  for (const title of Object.keys(noteCountsByTag)) {
    if (title && !pathToTagMap.has(title)) {
      pathToTagMap.set(title, {
        id: `tag_${title}`,
        title,
        created_time: Date.now(),
        updated_time: Date.now(),
      });
    }

  }

  // Root map to hold top-level tree nodes
  const rootNodes: TagTreeNode[] = [];

  // Helper to find or create a node at a given path
  function getOrCreateNode(pathParts: string[]): TagTreeNode {
    let currentLevel = rootNodes;
    let accumulatedPath = '';

    for (let depth = 0; depth < pathParts.length; depth++) {
      const part = pathParts[depth];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      let existing = currentLevel.find((n) => n.name.toLowerCase() === part.toLowerCase());
      if (!existing) {
        const tagObj = pathToTagMap.get(accumulatedPath);
        existing = {
          fullPath: accumulatedPath,
          name: part,
          tagId: tagObj?.id,
          noteCount: noteCountsByTag[accumulatedPath] || 0,
          cumulativeCount: 0,
          children: [],
          depth,
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }

    // Traverse back to find the leaf node
    let target = rootNodes.find((n) => n.name.toLowerCase() === pathParts[0].toLowerCase())!;
    for (let i = 1; i < pathParts.length; i++) {
      target = target.children.find((c) => c.name.toLowerCase() === pathParts[i].toLowerCase())!;
    }
    return target;
  }

  // Insert all tag paths
  for (const path of Array.from(pathToTagMap.keys())) {
    const parts = path.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      getOrCreateNode(parts);
    }
  }

  // Recursive function to calculate cumulative note counts
  function calculateAccurateCounts(node: TagTreeNode): number {
    if (notes && notes.length > 0) {
      const active = notes.filter((n) => !n.is_deleted && n.tags);
      node.noteCount = active.filter((n) =>
        n.tags!.some((t) => t.toLowerCase() === node.fullPath.toLowerCase())
      ).length;
      node.cumulativeCount = active.filter((n) =>
        n.tags!.some((t) => isTagOrSubtag(t, node.fullPath))
      ).length;
      for (const child of node.children) {
        calculateAccurateCounts(child);
      }
      return node.cumulativeCount;
    } else {
      let sum = node.noteCount;
      for (const child of node.children) {
        sum += calculateAccurateCounts(child);
      }
      node.cumulativeCount = sum;
      return sum;
    }
  }

  // Sort nodes alphabetically at each level and compute cumulative counts
  function sortAndFinalize(nodes: TagTreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    for (const node of nodes) {
      sortAndFinalize(node.children);
    }
  }

  for (const root of rootNodes) {
    calculateAccurateCounts(root);
  }
  sortAndFinalize(rootNodes);

  return rootNodes;
}

