import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface GroqResponse {
  message: ChatMessage;
  finishReason: string;
  tokensUsed?: number;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey: string;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('groq.apiKey', '');
    this.primaryModel = this.configService.get<string>(
      'groq.model',
      'llama-3.3-70b-versatile',
    );
    this.fallbackModel = this.configService.get<string>(
      'groq.fallbackModel',
      'llama-3.1-8b-instant',
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async chatCompletion(
    messages: ChatMessage[],
    tools?: any[],
    temperature = 0.2,
  ): Promise<GroqResponse> {
    if (!this.isConfigured()) {
      throw new Error('GROQ_API_KEY_NOT_CONFIGURED');
    }

    try {
      return await this.callApi(this.primaryModel, messages, tools, temperature);
    } catch (primaryErr: any) {
      this.logger.warn(
        `Primary Groq model ${this.primaryModel} failed: ${primaryErr.message}. Attempting fallback to ${this.fallbackModel}`,
      );
      try {
        return await this.callApi(this.fallbackModel, messages, tools, temperature);
      } catch (fallbackErr: any) {
        this.logger.error(
          `Fallback Groq model ${this.fallbackModel} also failed: ${fallbackErr.message}`,
        );
        throw fallbackErr;
      }
    }
  }

  private async callApi(
    model: string,
    messages: ChatMessage[],
    tools?: any[],
    temperature = 0.2,
  ): Promise<GroqResponse> {
    const payload: any = {
      model,
      messages,
      temperature,
      max_tokens: 2048,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Groq API error (${res.status} ${res.statusText}): ${errorText}`,
        );
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error('Groq returned empty choices');
      }

      return {
        message: choice.message,
        finishReason: choice.finish_reason,
        tokensUsed: data.usage?.total_tokens,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
