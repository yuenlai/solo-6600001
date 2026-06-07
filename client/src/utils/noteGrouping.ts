import { BoardElement, NoteGroup, GroupingResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '这', '那', '有', '在', '我', '你', '他', '她', '它',
  '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '如何', '为什么', '因为', '所以', '但是', '然后',
  '可以', '可能', '应该', '需要', '要', '会', '能', '对', '不', '没有', '不是', '也', '还', '又', '再',
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'shall', 'must', 'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'this', 'that', 'these', 'those', 'here', 'there', 'what', 'which',
  'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'with', 'from', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'about', 'against', 'over', 'out', 'off', 'up', 'down', 'in', 'on'
]);

const GROUP_COLORS = [
  '#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#FFEBEE',
  '#E0F7FA', '#F1F8E9', '#FFCCBC', '#D1C4E9', '#B2EBF2'
];

const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  
  const cleanText = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words: string[] = [];
  
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]+/g) || [];
  chineseChars.forEach(chunk => {
    for (let len = 2; len <= Math.min(chunk.length, 4); len++) {
      for (let i = 0; i <= chunk.length - len; i++) {
        words.push(chunk.substring(i, i + len));
      }
    }
  });
  
  const englishWords = cleanText.match(/[a-zA-Z]+/g) || [];
  englishWords.forEach(word => {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      words.push(word);
    }
  });
  
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    if (!STOP_WORDS.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

const calculateSimilarity = (keywords1: string[], keywords2: string[]): number => {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  const union = new Set([...keywords1, ...keywords2]).size;
  
  return union > 0 ? intersection / union : 0;
};

const generateGroupTitle = (elements: BoardElement[]): string => {
  if (elements.length === 0) return '未分组';
  
  const allKeywords: string[] = [];
  elements.forEach(el => {
    if (el.text) {
      allKeywords.push(...extractKeywords(el.text));
    }
  });
  
  const keywordFreq: Record<string, number> = {};
  allKeywords.forEach(kw => {
    keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
  });
  
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => kw);
  
  if (topKeywords.length > 0) {
    return topKeywords.join(' · ');
  }
  
  const firstText = elements.find(el => el.text)?.text || '';
  return firstText.substring(0, 15) || `分组 ${elements.length} 个便签`;
};

export const groupStickyNotes = (
  elements: BoardElement[],
  similarityThreshold: number = 0.2
): GroupingResult => {
  const stickyNotes = elements.filter(el => el.type === 'sticky-note');
  
  if (stickyNotes.length === 0) {
    return { groups: [], ungroupedElementIds: [] };
  }
  
  const noteKeywords = stickyNotes.map(note => ({
    element: note,
    keywords: extractKeywords(note.text || '')
  }));
  
  const similarityMatrix: number[][] = [];
  for (let i = 0; i < noteKeywords.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < noteKeywords.length; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1;
      } else {
        similarityMatrix[i][j] = calculateSimilarity(
          noteKeywords[i].keywords,
          noteKeywords[j].keywords
        );
      }
    }
  }
  
  const visited = new Set<number>();
  const groups: BoardElement[][] = [];
  
  for (let i = 0; i < noteKeywords.length; i++) {
    if (visited.has(i)) continue;
    
    const group: BoardElement[] = [noteKeywords[i].element];
    visited.add(i);
    
    for (let j = 0; j < noteKeywords.length; j++) {
      if (i === j || visited.has(j)) continue;
      
      let maxSimilarity = 0;
      for (let k = 0; k < group.length; k++) {
        const groupIndex = noteKeywords.findIndex(nk => nk.element.id === group[k].id);
        if (groupIndex !== -1) {
          const sim = similarityMatrix[groupIndex][j];
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
          }
        }
      }
      
      if (maxSimilarity >= similarityThreshold) {
        group.push(noteKeywords[j].element);
        visited.add(j);
      }
    }
    
    groups.push(group);
  }
  
  const noteGroups: NoteGroup[] = groups
    .filter(group => group.length >= 2)
    .map((group, index) => {
      const minX = Math.min(...group.map(el => el.x));
      const minY = Math.min(...group.map(el => el.y));
      const maxX = Math.max(...group.map(el => el.x + (el.width || 0)));
      const maxY = Math.max(...group.map(el => el.y + (el.height || 0)));
      
      const padding = 30;
      
      return {
        id: uuidv4(),
        title: generateGroupTitle(group),
        elementIds: group.map(el => el.id),
        x: minX - padding,
        y: minY - padding - 40,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2 + 40,
        color: GROUP_COLORS[index % GROUP_COLORS.length],
        collapsed: false
      };
    });
  
  const groupedIds = new Set(noteGroups.flatMap(g => g.elementIds));
  const ungroupedElementIds = stickyNotes
    .filter(note => !groupedIds.has(note.id))
    .map(note => note.id);
  
  return { groups: noteGroups, ungroupedElementIds };
};

export const autoArrangeGroups = (
  groups: NoteGroup[],
  elements: BoardElement[],
  startX: number = 100,
  startY: number = 100
): { groups: NoteGroup[]; elements: BoardElement[] } => {
  const updatedGroups: NoteGroup[] = [];
  const updatedElements = [...elements];
  
  let currentX = startX;
  let currentY = startY;
  const maxWidth = 800;
  const gapX = 60;
  const gapY = 60;
  const headerHeight = 40;
  const padding = 30;
  
  groups.forEach((group, groupIndex) => {
    const groupElements = group.elementIds
      .map(id => updatedElements.find(el => el.id === id))
      .filter((el): el is BoardElement => !!el);
    
    if (groupElements.length === 0) {
      updatedGroups.push(group);
      return;
    }
    
    const noteWidth = 160;
    const noteHeight = 120;
    const notesPerRow = 3;
    
    const rows = Math.ceil(groupElements.length / notesPerRow);
    const cols = Math.min(groupElements.length, notesPerRow);
    
    const groupWidth = cols * noteWidth + (cols - 1) * 20 + padding * 2;
    const groupHeight = rows * noteHeight + (rows - 1) * 20 + padding * 2 + headerHeight;
    
    if (currentX + groupWidth > maxWidth && groupIndex > 0) {
      currentX = startX;
      currentY += (gapY + Math.max(...updatedGroups
        .filter(g => g.x >= startX)
        .map(g => g.height)));
    }
    
    const newGroup: NoteGroup = {
      ...group,
      x: currentX,
      y: currentY,
      width: groupWidth,
      height: groupHeight
    };
    
    groupElements.forEach((el, idx) => {
      const row = Math.floor(idx / notesPerRow);
      const col = idx % notesPerRow;
      
      const elIndex = updatedElements.findIndex(e => e.id === el.id);
      if (elIndex !== -1) {
        updatedElements[elIndex] = {
          ...updatedElements[elIndex],
          x: currentX + padding + col * (noteWidth + 20),
          y: currentY + headerHeight + padding + row * (noteHeight + 20)
        };
      }
    });
    
    updatedGroups.push(newGroup);
    currentX += groupWidth + gapX;
  });
  
  return { groups: updatedGroups, elements: updatedElements };
};

export const mergeGroups = (group1: NoteGroup, group2: NoteGroup): NoteGroup => {
  return {
    ...group1,
    id: uuidv4(),
    elementIds: [...new Set([...group1.elementIds, ...group2.elementIds])]
  };
};

export const addToGroup = (group: NoteGroup, elementId: string): NoteGroup => {
  if (group.elementIds.includes(elementId)) return group;
  return {
    ...group,
    elementIds: [...group.elementIds, elementId]
  };
};

export const removeFromGroup = (group: NoteGroup, elementId: string): NoteGroup => {
  return {
    ...group,
    elementIds: group.elementIds.filter(id => id !== elementId)
  };
};
