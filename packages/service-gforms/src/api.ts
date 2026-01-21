/**
 * Google Forms API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gforms.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive',
];

const FORMS_API = 'https://forms.googleapis.com/v1';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export interface Form {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  settings?: {
    quizSettings?: {
      isQuiz: boolean;
    };
  };
  items?: FormItem[];
  responderUri?: string;
  linkedSheetId?: string;
}

export interface FormItem {
  itemId: string;
  title?: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: { paragraph?: boolean };
      scaleQuestion?: { low: number; high: number; lowLabel?: string; highLabel?: string };
      choiceQuestion?: { type: string; options: { value: string }[] };
      dateQuestion?: object;
      timeQuestion?: object;
    };
  };
  pageBreakItem?: object;
  textItem?: { title?: string };
}

export interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<
    string,
    {
      questionId: string;
      textAnswers?: { answers: { value: string }[] };
      scaleAnswers?: { answers: { value: number }[] };
    }
  >;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleFormsClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gforms',
      scopes: SCOPES,
      apiBase: FORMS_API,
    });
  }

  /**
   * Make request to a specific API base (for Drive operations)
   */
  private async apiRequest<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
    }
  }

  /**
   * List recent forms from Drive
   */
  async listForms(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.form'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    });

    const response = await this.apiRequest<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get form details
   */
  async getForm(formId: string): Promise<Form> {
    return this.request<Form>(`/forms/${formId}`);
  }

  /**
   * Create a new form
   */
  async createForm(title: string): Promise<Form> {
    return this.request<Form>('/forms', {
      method: 'POST',
      body: JSON.stringify({
        info: { title },
      }),
    });
  }

  /**
   * Add a question to a form
   */
  async addQuestion(
    formId: string,
    title: string,
    questionType: 'text' | 'paragraph' | 'scale' | 'choice',
    options?: { choices?: string[]; low?: number; high?: number; required?: boolean }
  ): Promise<void> {
    let question: object;

    switch (questionType) {
      case 'text':
        question = { textQuestion: {} };
        break;
      case 'paragraph':
        question = { textQuestion: { paragraph: true } };
        break;
      case 'scale':
        question = {
          scaleQuestion: {
            low: options?.low ?? 1,
            high: options?.high ?? 5,
          },
        };
        break;
      case 'choice':
        question = {
          choiceQuestion: {
            type: 'RADIO',
            options: (options?.choices || ['Option 1', 'Option 2']).map((v) => ({ value: v })),
          },
        };
        break;
      default:
        question = { textQuestion: {} };
    }

    const request = {
      requests: [
        {
          createItem: {
            item: {
              title,
              questionItem: {
                question: {
                  required: options?.required ?? false,
                  ...question,
                },
              },
            },
            location: { index: 0 },
          },
        },
      ],
    };

    await this.request(`/forms/${formId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get form responses
   */
  async getResponses(formId: string): Promise<FormResponse[]> {
    const response = await this.request<{ responses?: FormResponse[] }>(`/forms/${formId}/responses`);
    return response.responses || [];
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${formId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Share form with email
   */
  async shareForm(formId: string, email: string, role: 'reader' | 'writer' = 'writer'): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${formId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }

  /**
   * Share form publicly (anyone with link)
   */
  async sharePublic(formId: string, role: 'reader' | 'writer' = 'reader'): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${formId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'anyone',
        role,
      }),
    });
  }

  /**
   * Update form title/description
   */
  async updateForm(formId: string, updates: { title?: string; description?: string }): Promise<Form> {
    const requests: Record<string, unknown>[] = [];

    if (updates.title) {
      requests.push({
        updateFormInfo: {
          info: { title: updates.title },
          updateMask: 'title',
        },
      });
    }

    if (updates.description) {
      requests.push({
        updateFormInfo: {
          info: { description: updates.description },
          updateMask: 'description',
        },
      });
    }

    if (requests.length === 0) {
      return this.getForm(formId);
    }

    await this.request(`/forms/${formId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return this.getForm(formId);
  }

  /**
   * Delete a question from form
   */
  async deleteQuestion(formId: string, itemId: string): Promise<void> {
    await this.request(`/forms/${formId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ deleteItem: { location: { index: 0 } } }],
      }),
    });
  }

  /**
   * Get form URLs
   */
  getFormUrls(formId: string): { edit: string; respond: string; results: string } {
    return {
      edit: `https://docs.google.com/forms/d/${formId}/edit`,
      respond: `https://docs.google.com/forms/d/e/${formId}/viewform`,
      results: `https://docs.google.com/forms/d/${formId}/viewanalytics`,
    };
  }
}

export const gforms = new GoogleFormsClient();

/**
 * Extract form ID from URL or return as-is
 */
export function extractFormId(input: string): string {
  const urlMatch = input.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  const eMatch = input.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (eMatch) {
    return eMatch[1];
  }
  return input;
}
