/**
 * Trello REST API Client
 *
 * Uses API Key + Token for authentication.
 * Get your credentials from: https://trello.com/power-ups/admin
 * Set TRELLO_API_KEY and TRELLO_TOKEN environment variables or in config.
 */

const TRELLO_API = 'https://api.trello.com/1';

export interface Board {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  prefs: {
    background: string;
    backgroundColor: string;
  };
}

export interface List {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
}

export interface Card {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idBoard: string;
  idList: string;
  pos: number;
  due?: string;
  dueComplete: boolean;
  labels: Array<{ id: string; name: string; color: string }>;
  url: string;
  shortUrl: string;
}

export interface Member {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}

export class TrelloClient {
  private apiKey: string;
  private token: string;

  constructor() {
    this.apiKey = process.env.TRELLO_API_KEY || '';
    this.token = process.env.TRELLO_TOKEN || '';
  }

  hasCredentials(): boolean {
    return Boolean(this.apiKey && this.token);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TRELLO_API}${endpoint}${separator}key=${this.apiKey}&token=${this.token}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Trello API error: ${error || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // ========== Boards ==========

  async listBoards(): Promise<Board[]> {
    return this.request<Board[]>('/members/me/boards?fields=id,name,desc,closed,url,shortUrl,prefs');
  }

  async getBoard(boardId: string): Promise<Board> {
    return this.request<Board>(`/boards/${boardId}`);
  }

  async createBoard(name: string, options: { desc?: string } = {}): Promise<Board> {
    const params = new URLSearchParams({ name });
    if (options.desc) params.append('desc', options.desc);

    return this.request<Board>(`/boards?${params.toString()}`, { method: 'POST' });
  }

  async closeBoard(boardId: string): Promise<Board> {
    return this.request<Board>(`/boards/${boardId}?closed=true`, { method: 'PUT' });
  }

  // ========== Lists ==========

  async getLists(boardId: string): Promise<List[]> {
    return this.request<List[]>(`/boards/${boardId}/lists?filter=open`);
  }

  async createList(boardId: string, name: string): Promise<List> {
    return this.request<List>(`/lists?name=${encodeURIComponent(name)}&idBoard=${boardId}`, { method: 'POST' });
  }

  async archiveList(listId: string): Promise<List> {
    return this.request<List>(`/lists/${listId}/closed?value=true`, { method: 'PUT' });
  }

  // ========== Cards ==========

  async getCards(boardId: string, listId?: string): Promise<Card[]> {
    if (listId) {
      return this.request<Card[]>(`/lists/${listId}/cards`);
    }
    return this.request<Card[]>(`/boards/${boardId}/cards`);
  }

  async getCard(cardId: string): Promise<Card> {
    return this.request<Card>(`/cards/${cardId}`);
  }

  async createCard(listId: string, input: {
    name: string;
    desc?: string;
    due?: string;
    labels?: string;
  }): Promise<Card> {
    const params = new URLSearchParams({
      idList: listId,
      name: input.name,
    });
    if (input.desc) params.append('desc', input.desc);
    if (input.due) params.append('due', input.due);
    if (input.labels) params.append('idLabels', input.labels);

    return this.request<Card>(`/cards?${params.toString()}`, { method: 'POST' });
  }

  async updateCard(cardId: string, input: {
    name?: string;
    desc?: string;
    idList?: string;
    due?: string;
    dueComplete?: boolean;
    closed?: boolean;
  }): Promise<Card> {
    const params = new URLSearchParams();
    if (input.name) params.append('name', input.name);
    if (input.desc) params.append('desc', input.desc);
    if (input.idList) params.append('idList', input.idList);
    if (input.due) params.append('due', input.due);
    if (input.dueComplete !== undefined) params.append('dueComplete', String(input.dueComplete));
    if (input.closed !== undefined) params.append('closed', String(input.closed));

    return this.request<Card>(`/cards/${cardId}?${params.toString()}`, { method: 'PUT' });
  }

  async archiveCard(cardId: string): Promise<Card> {
    return this.updateCard(cardId, { closed: true });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request<void>(`/cards/${cardId}`, { method: 'DELETE' });
  }

  // ========== Members ==========

  async getBoardMembers(boardId: string): Promise<Member[]> {
    return this.request<Member[]>(`/boards/${boardId}/members`);
  }

  async getMe(): Promise<Member> {
    return this.request<Member>('/members/me');
  }

  // ========== Utility ==========

  async findBoardByName(name: string): Promise<Board | undefined> {
    const boards = await this.listBoards();
    return boards.find(b => b.name.toLowerCase() === name.toLowerCase() || b.id === name);
  }

  async findListByName(boardId: string, name: string): Promise<List | undefined> {
    const lists = await this.getLists(boardId);
    return lists.find(l => l.name.toLowerCase() === name.toLowerCase() || l.id === name);
  }

  async findCardByName(boardId: string, name: string): Promise<Card | undefined> {
    const cards = await this.getCards(boardId);
    return cards.find(c => c.name.toLowerCase().includes(name.toLowerCase()) || c.id === name);
  }
}

export const trello = new TrelloClient();
