/** HTML에 안전하게 표시할 수 있도록 문자열의 특수 문자를 변환합니다. */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** 규정집에 사용하는 기본 Markdown 문법을 HTML로 변환합니다. */
export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      flushParagraph();
      closeList();
      const rows = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        const cells = lines[index].trim().slice(1, -1).split("|").map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      index -= 1;
      if (rows.length) {
        const [headers, ...body] = rows;
        output.push(`<div class="rulebook-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      }
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      flushParagraph();
      closeList();
      output.push("<hr>");
      continue;
    }
    const listItem = trimmed.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      const nextType = /^\d/.test(listItem[1]) ? "ol" : "ul";
      if (listType !== nextType) {
        closeList();
        output.push(`<${nextType}>`);
        listType = nextType;
      }
      output.push(`<li>${inlineMarkdown(listItem[2])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(trimmed);
  }
  flushParagraph();
  closeList();
  return output.join("\n");
}

function seoulTimestamp(month, day, hour = 0, minute = 0, second = 0) {
  // 2026년 서울은 UTC+9이며 DST를 적용하지 않습니다.
  return Date.UTC(2026, month - 1, day, hour - 9, minute, second);
}

/** 일정 카드의 현재 단계와 종료된 단계를 한국 시간 기준으로 반환합니다. */
export function getScheduleProgress(now = new Date()) {
  const stages = [
    { id: "application", start: seoulTimestamp(11, 4), end: seoulTimestamp(12, 15, 23, 59, 59) + 1000 },
    { id: "roster", start: seoulTimestamp(12, 15, 23, 59, 59) + 1000, end: seoulTimestamp(12, 20, 20) },
    { id: "draft", start: seoulTimestamp(12, 20, 20), end: seoulTimestamp(12, 21) },
    { id: "practice", start: seoulTimestamp(12, 21), end: seoulTimestamp(12, 30, 18) },
    { id: "tournament", start: seoulTimestamp(12, 30, 18), end: seoulTimestamp(12, 31, 17) }
  ];
  const currentTime = now.getTime();
  const active = stages.find((stage) => currentTime >= stage.start && currentTime < stage.end);
  const upcoming = active ? null : stages.find((stage) => currentTime < stage.start);
  const selected = active || upcoming;

  return {
    current: selected ? { id: selected.id, upcoming: !active } : null,
    pastIds: stages.filter((stage) => currentTime >= stage.end).map((stage) => stage.id)
  };
}


/** 신청 마감까지 남은 시간을 화면용 문구로 반환합니다. */
export function formatApplicationCountdown(now, deadline = new Date("2026-12-16T00:00:00+09:00")) {
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) {
    return { text: "신청 기간이 마감되었습니다.", isClosed: true };
  }

  const totalHours = remaining / (60 * 60 * 1000);
  if (totalHours >= 30) {
    return {
      text: `신청 마감까지 약 ${Math.ceil(totalHours)}시간 남았습니다.`,
      isClosed: false
    };
  }

  const totalMinutes = Math.floor(remaining / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    text: `신청 마감까지 ${hours}시간 ${minutes}분 남았습니다.`,
    isClosed: false
  };
}
