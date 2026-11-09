import type { GraphNodeData } from './graphBuilder';

export interface CalendarEventDetails {
  title: string;
  description: string;
  dateStr?: string | null;
  textDeadline?: string | null;
  stepId: string;
  sourceUrl?: string;
}

/**
 * Parses date string (YYYY-MM-DD or standard formats) into ICS DATE format: YYYYMMDD
 */
function formatIcsDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function parseToDate(dateStr: string): Date | null {
  // If YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
  }

  // General Date parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Generates an RFC 5545 compliant .ics file content.
 * Deadlines with valid calendar dates are emitted as VEVENTs.
 * Deadlines with null/unparseable dates are excluded from events and listed under
 * "Dates unknown — call to confirm" in the event descriptions and header.
 */
export function generateIcsCalendar(
  procedureTitle: string,
  institution: string,
  nodes: GraphNodeData[],
  sourceUrl: string
): string {
  const now = new Date();
  const dtstamp = `${formatIcsDate(now)}T${String(now.getUTCHours()).padStart(2, '0')}${String(
    now.getUTCMinutes()
  ).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;

  const deadlineEvents: CalendarEventDetails[] = [];
  const unknownDateDeadlines: Array<{ label: string; text: string }> = [];

  for (const node of nodes) {
    if (node.deadline) {
      const explicitDate = node.deadline.date;
      const textDate = node.deadline.text;

      let parsedDate: Date | null = null;
      if (explicitDate) {
        parsedDate = parseToDate(explicitDate);
      } else if (textDate) {
        parsedDate = parseToDate(textDate);
      }

      if (parsedDate) {
        deadlineEvents.push({
          title: `[${institution}] ${node.title || node.label}`,
          description: `${node.description}\n\nOfficial Policy URL: ${sourceUrl}`,
          dateStr: formatIcsDate(parsedDate),
          stepId: node.stepId,
          sourceUrl,
        });
      } else {
        unknownDateDeadlines.push({
          label: node.title || node.label,
          text: textDate || 'No date specified in policy',
        });
      }
    }
  }

  // Construct notes for unconfirmed deadlines
  const unknownNotes =
    unknownDateDeadlines.length > 0
      ? `\\n\\nDates unknown — call to confirm:\\n` +
        unknownDateDeadlines.map((u) => `• ${u.label}: ${u.text}`).join('\\n')
      : '';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wayfinder//University Policy Navigator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Wayfinder: ${procedureTitle.slice(0, 40)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  if (deadlineEvents.length === 0) {
    // If no explicit dates exist, emit one reminder event documenting unconfirmed deadlines
    const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateStr = formatIcsDate(nextDay);
    lines.push(
      'BEGIN:VEVENT',
      `UID:wayfinder-reminder-${Date.now()}@wayfinder.edu`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:Review Deadlines: ${procedureTitle}`,
      `DESCRIPTION:Review procedure deadlines with university.${unknownNotes}\\n\\nPolicy URL: ${sourceUrl}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  } else {
    for (const evt of deadlineEvents) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:wayfinder-${evt.stepId}-${Date.now()}@wayfinder.edu`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${evt.dateStr}`,
        `DTEND;VALUE=DATE:${evt.dateStr}`,
        `SUMMARY:${evt.title}`,
        `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}${unknownNotes}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a client-side file download of a string or blob.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
