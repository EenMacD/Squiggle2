import type { Play, CreatePlayRequest } from '../types/play';

const API_BASE_URL = 'http://localhost:8080/api';

export const playService = {
  async createPlay(play: CreatePlayRequest): Promise<Play> {
    const response = await fetch(`${API_BASE_URL}/plays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(play),
    });

    if (!response.ok) {
      throw new Error('Failed to create play');
    }

    return response.json();
  },

  async listPlays(): Promise<Play[]> {
    const response = await fetch(`${API_BASE_URL}/plays`);

    if (!response.ok) {
      throw new Error('Failed to fetch plays');
    }

    return response.json();
  },

  async getPlay(id: string): Promise<Play> {
    const response = await fetch(`${API_BASE_URL}/plays/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch play');
    }

    return response.json();
  },

  async deletePlay(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/plays/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete play');
    }
  },
}; 