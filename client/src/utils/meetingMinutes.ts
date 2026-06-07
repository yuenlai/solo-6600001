import { Board, MeetingMinutesContent } from '../types';

export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
};

export const extractMeetingContent = (board: Board): MeetingMinutesContent => {
  const texts: string[] = [];
  const stickyNotes: { content: string; color?: string }[] = [];

  board.layers.forEach(layer => {
    if (!layer.visible) return;
    layer.elements.forEach(element => {
      if (element.type === 'text' && element.text && element.text.trim()) {
        texts.push(element.text.trim());
      }
      if (element.type === 'sticky-note' && element.text && element.text.trim()) {
        stickyNotes.push({
          content: element.text.trim(),
          color: element.fill
        });
      }
    });
  });

  const comments = (board.comments || []).map(comment => ({
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt,
    replies: comment.replies.map(reply => ({
      author: reply.author,
      content: reply.content,
      createdAt: reply.createdAt
    }))
  }));

  return {
    title: board.name,
    date: new Date().toLocaleString('zh-CN'),
    texts,
    stickyNotes,
    comments
  };
};

const formatDateTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export const generateMarkdownMinutes = (content: MeetingMinutesContent): string => {
  let markdown = `# ${content.title}\n\n`;
  markdown += `---\n\n`;
  markdown += `> **生成时间**: ${content.date}\n>\n`;
  markdown += `> **内容统计**: ${content.texts.length} 条文本 · ${content.stickyNotes.length} 条便签 · ${content.comments.length} 条讨论\n\n`;
  markdown += `---\n\n`;

  if (content.texts.length > 0) {
    markdown += `## 📝 白板文本\n\n`;
    content.texts.forEach((text, index) => {
      markdown += `${index + 1}. ${text}\n`;
    });
    markdown += '\n';
  }

  if (content.stickyNotes.length > 0) {
    markdown += `## 📌 便签内容\n\n`;
    content.stickyNotes.forEach((note, index) => {
      markdown += `${index + 1}. ${note.content}\n`;
    });
    markdown += '\n';
  }

  if (content.comments.length > 0) {
    markdown += `## 💬 讨论要点\n\n`;
    content.comments.forEach((comment, index) => {
      markdown += `### ${index + 1}. ${comment.author} \`${formatDateTime(comment.createdAt)}\`\n\n`;
      markdown += `${comment.content}\n\n`;
      if (comment.replies.length > 0) {
        markdown += `**回复** (${comment.replies.length}):\n\n`;
        comment.replies.forEach((reply, replyIndex) => {
          markdown += `${replyIndex + 1}. **${reply.author}** \`${formatDateTime(reply.createdAt)}\`: ${reply.content}\n`;
        });
        markdown += '\n';
      }
    });
  }

  if (content.texts.length === 0 && content.stickyNotes.length === 0 && content.comments.length === 0) {
    markdown += `\n<div align="center">\n\n`;
    markdown += `📭 **暂无内容**\n\n`;
    markdown += `请在白板上添加文本、便签或评论后重新生成会议纪要\n\n`;
    markdown += `</div>\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `*此纪要由白板协作工具自动生成于 ${content.date}*\n`;

  return markdown;
};

export const generatePlainTextMinutes = (content: MeetingMinutesContent): string => {
  const separator = '='.repeat(50);
  const subSeparator = '-'.repeat(40);

  let text = `${separator}\n`;
  text += `  ${content.title}\n`;
  text += `${separator}\n\n`;
  text += `生成时间: ${content.date}\n`;
  text += `内容统计: ${content.texts.length} 条文本 · ${content.stickyNotes.length} 条便签 · ${content.comments.length} 条讨论\n\n`;

  if (content.texts.length > 0) {
    text += `${subSeparator}\n`;
    text += `【白板文本】\n`;
    text += `${subSeparator}\n`;
    content.texts.forEach((t, i) => {
      text += `  ${i + 1}. ${t}\n`;
    });
    text += '\n';
  }

  if (content.stickyNotes.length > 0) {
    text += `${subSeparator}\n`;
    text += `【便签内容】\n`;
    text += `${subSeparator}\n`;
    content.stickyNotes.forEach((note, i) => {
      text += `  ${i + 1}. ${note.content}\n`;
    });
    text += '\n';
  }

  if (content.comments.length > 0) {
    text += `${subSeparator}\n`;
    text += `【讨论要点】\n`;
    text += `${subSeparator}\n`;
    content.comments.forEach((comment, i) => {
      text += `\n  ${i + 1}. ${comment.author} (${formatDateTime(comment.createdAt)}):\n`;
      text += `     ${comment.content}\n`;
      if (comment.replies.length > 0) {
        text += `\n     回复 (${comment.replies.length}):\n`;
        comment.replies.forEach((reply, replyIndex) => {
          text += `       ${replyIndex + 1}. ${reply.author} (${formatDateTime(reply.createdAt)}): ${reply.content}\n`;
        });
      }
      text += '\n';
    });
  }

  if (content.texts.length === 0 && content.stickyNotes.length === 0 && content.comments.length === 0) {
    text += `\n  暂无内容\n`;
    text += `  请在白板上添加文本、便签或评论后重新生成会议纪要\n\n`;
  }

  text += `\n${separator}\n`;
  text += `此纪要由白板协作工具自动生成\n`;
  text += `${separator}\n`;

  return text;
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      document.body.removeChild(textarea);
      return false;
    }
  }
};
