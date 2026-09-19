export interface BugReportPayload {
  description: string;
  round?: number;
  phase?: string;
  playerName?: string;
  tableNumber?: number | string;
  context?: string;
}

/**
 * Formats a bug report submission into a single-line markdown entry
 * matching BackLog.md format: "- [ ] <description> (context)"
 */
export function formatBugReportLine(payload: BugReportPayload): string {
  const rawDescription = String(payload.description || '').trim();
  if (!rawDescription) {
    throw new Error('Bug description cannot be empty');
  }

  // Flatten multi-line text into a single line per user requirement
  let singleLineDesc = rawDescription.replace(/\r?\n+/g, ' — ').trim();
  if (singleLineDesc.startsWith('- [ ] ')) {
    singleLineDesc = singleLineDesc.slice(6).trim();
  } else if (singleLineDesc.startsWith('- ')) {
    singleLineDesc = singleLineDesc.slice(2).trim();
  }

  const contextParts: string[] = [];
  if (payload.context) {
    contextParts.push(String(payload.context));
  }
  if (payload.round !== undefined) {
    contextParts.push(`Round ${payload.round}`);
  }
  if (payload.phase) {
    contextParts.push(`${payload.phase}`);
  }
  if (payload.playerName) {
    contextParts.push(`Player: ${payload.playerName}`);
  }
  if (payload.tableNumber) {
    contextParts.push(`Table #${payload.tableNumber}`);
  }

  const contextSuffix = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';
  return `- [ ] ${singleLineDesc}${contextSuffix}`;
}
