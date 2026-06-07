const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readBoards = () => {
  ensureDataDir();
  if (!fs.existsSync(BOARDS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(BOARDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error reading boards file:', error);
    return [];
  }
};

const writeBoards = (boards) => {
  ensureDataDir();
  try {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2), 'utf8');
  } catch (error) {
    console.error('[Storage] Error writing boards file:', error);
    throw error;
  }
};

const readTeams = () => {
  ensureDataDir();
  if (!fs.existsSync(TEAMS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(TEAMS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error reading teams file:', error);
    return [];
  }
};

const writeTeams = (teams) => {
  ensureDataDir();
  try {
    fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2), 'utf8');
  } catch (error) {
    console.error('[Storage] Error writing teams file:', error);
    throw error;
  }
};

class LocalBoard {
  constructor(data) {
    this._id = data._id || uuidv4();
    this.name = data.name || 'Untitled Board';
    this.ownerId = data.ownerId;
    this.teamId = data.teamId || null;
    this.collaborators = data.collaborators || [];
    this.layers = data.layers || [{ name: 'Layer 1', visible: true, locked: false, order: 0, elements: [] }];
    this.comments = data.comments || [];
    this.snapshots = data.snapshots || [];
    this.polls = data.polls || [];
    this.width = data.width || 3000;
    this.height = data.height || 2000;
    this.backgroundColor = data.backgroundColor || '#ffffff';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isShared = data.isShared || false;
    this.shareToken = data.shareToken || null;
    this.sharePermission = data.sharePermission || 'view';
  }

  toObject() {
    return {
      _id: this._id,
      name: this.name,
      ownerId: this.ownerId,
      teamId: this.teamId,
      collaborators: this.collaborators,
      layers: this.layers,
      comments: this.comments,
      snapshots: this.snapshots,
      polls: this.polls,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isShared: this.isShared,
      shareToken: this.shareToken,
      sharePermission: this.sharePermission,
    };
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const boards = readBoards();
    const existingIndex = boards.findIndex((b) => b._id === this._id);

    if (existingIndex >= 0) {
      boards[existingIndex] = this.toObject();
    } else {
      boards.unshift(this.toObject());
    }

    writeBoards(boards);
    console.log(`[Storage] Saved board: ${this._id}, name: ${this.name}`);
    return this.toObject();
  }

  static find(query = {}) {
    const boards = readBoards();
    let result = [...boards];

    if (query.$or) {
      result = result.filter((board) => {
        return query.$or.some((condition) => {
          if (condition.ownerId !== undefined) {
            return board.ownerId === condition.ownerId;
          }
          if (condition.collaborators !== undefined) {
            return board.collaborators && board.collaborators.includes(condition.collaborators);
          }
          return true;
        });
      });
    }

    if (query.teamId !== undefined) {
      result = result.filter((b) => b.teamId === query.teamId);
    } else if (query.ownerId !== undefined) {
      result = result.filter((b) => b.ownerId === query.ownerId);
    } else if (query._id !== undefined) {
      result = result.filter((b) => b._id === query._id);
    }

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      sort: () => ({
        exec: async () => result,
        then: (resolve) => Promise.resolve(result).then(resolve),
      }),
      exec: async () => result,
      then: (resolve) => Promise.resolve(result).then(resolve),
    };
  }

  static async findById(id) {
    const boards = readBoards();
    const board = boards.find((b) => b._id === id);
    return board || null;
  }

  static async findByIdAndUpdate(id, updates, options = {}) {
    const boards = readBoards();
    const index = boards.findIndex((b) => b._id === id);

    if (index < 0) {
      return null;
    }

    boards[index] = {
      ...boards[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeBoards(boards);
    console.log(`[Storage] Updated board: ${id}`);
    return options.new ? boards[index] : null;
  }

  static async findByIdAndDelete(id) {
    const boards = readBoards();
    const index = boards.findIndex((b) => b._id === id);

    if (index < 0) {
      return null;
    }

    const deleted = boards[index];
    boards.splice(index, 1);
    writeBoards(boards);
    console.log(`[Storage] Deleted board: ${id}`);
    return deleted;
  }
}

class LocalTeam {
  constructor(data) {
    this._id = data._id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.ownerId = data.ownerId;
    this.members = data.members || [];
    this.admins = data.admins || [data.ownerId];
    this.avatarColor = data.avatarColor || this.getRandomColor();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  getRandomColor() {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  toObject() {
    return {
      _id: this._id,
      name: this.name,
      description: this.description,
      ownerId: this.ownerId,
      members: this.members,
      admins: this.admins,
      avatarColor: this.avatarColor,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const teams = readTeams();
    const existingIndex = teams.findIndex((t) => t._id === this._id);

    if (existingIndex >= 0) {
      teams[existingIndex] = this.toObject();
    } else {
      teams.unshift(this.toObject());
    }

    writeTeams(teams);
    console.log(`[Storage] Saved team: ${this._id}, name: ${this.name}`);
    return this.toObject();
  }

  static find(query = {}) {
    const teams = readTeams();
    let result = [...teams];

    if (query.$or) {
      result = result.filter((team) => {
        return query.$or.some((condition) => {
          if (condition.ownerId !== undefined) {
            return team.ownerId === condition.ownerId;
          }
          if (condition.members !== undefined) {
            return team.members && team.members.includes(condition.members);
          }
          return true;
        });
      });
    } else if (query.ownerId !== undefined) {
      result = result.filter((t) => t.ownerId === query.ownerId);
    } else if (query._id !== undefined) {
      result = result.filter((t) => t._id === query._id);
    }

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      sort: () => ({
        exec: async () => result,
        then: (resolve) => Promise.resolve(result).then(resolve),
      }),
      exec: async () => result,
      then: (resolve) => Promise.resolve(result).then(resolve),
    };
  }

  static async findById(id) {
    const teams = readTeams();
    const team = teams.find((t) => t._id === id);
    return team || null;
  }

  static async findByIdAndUpdate(id, updates, options = {}) {
    const teams = readTeams();
    const index = teams.findIndex((t) => t._id === id);

    if (index < 0) {
      return null;
    }

    teams[index] = {
      ...teams[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeTeams(teams);
    console.log(`[Storage] Updated team: ${id}`);
    return options.new ? teams[index] : null;
  }

  static async findByIdAndDelete(id) {
    const teams = readTeams();
    const index = teams.findIndex((t) => t._id === id);

    if (index < 0) {
      return null;
    }

    const deleted = teams[index];
    teams.splice(index, 1);
    writeTeams(teams);
    console.log(`[Storage] Deleted team: ${id}`);
    return deleted;
  }
}

const initStorage = () => {
  ensureDataDir();
  console.log(`[Storage] Initialized with data directory: ${DATA_DIR}`);
  const boardsCount = readBoards().length;
  const teamsCount = readTeams().length;
  console.log(`[Storage] Loaded ${boardsCount} boards, ${teamsCount} teams from local storage`);
};

module.exports = {
  Board: LocalBoard,
  Team: LocalTeam,
  initStorage,
  readBoards,
  readTeams,
};
