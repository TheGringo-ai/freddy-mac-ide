import axios from 'axios';

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'xai' | 'ollama';
  model: string;
  apiKey?: string;
  endpoint?: string;
  description: string;
  specialty: string[];
}

export interface AICredentials {
  openai?: string;
  anthropic?: string;
  google?: string;
  xai?: string; // Grok
}

export class MultiAIManager {
  private credentials: AICredentials = {};
  
  // Define all available AI providers
  private providers: AIProvider[] = [
    // Local Ollama models (no API key needed)
    {
      id: 'qwen-coder',
      name: 'Qwen Coder',
      type: 'ollama',
      model: 'qwen2.5-coder:3b',
      endpoint: 'http://localhost:11434/api/generate',
      description: 'Local coding specialist',
      specialty: ['coding', 'debugging', 'code-review']
    },
    {
      id: 'qwen-smart',
      name: 'Qwen Smart',
      type: 'ollama',
      model: 'qwen2.5-coder:7b',
      endpoint: 'http://localhost:11434/api/generate',
      description: 'Advanced local coding AI',
      specialty: ['architecture', 'optimization', 'complex-coding']
    },
    {
      id: 'llama-fast',
      name: 'Llama Fast',
      type: 'ollama',
      model: 'llama3.2:1b',
      endpoint: 'http://localhost:11434/api/generate',
      description: 'Quick responses for simple tasks',
      specialty: ['quick-help', 'simple-questions', 'explanations']
    },
    
    // OpenAI models
    {
      id: 'gpt-4',
      name: 'GPT-4',
      type: 'openai',
      model: 'gpt-4',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      description: 'Advanced reasoning and complex problem solving',
      specialty: ['complex-reasoning', 'architecture', 'planning']
    },
    {
      id: 'gpt-3.5',
      name: 'GPT-3.5 Turbo',
      type: 'openai',
      model: 'gpt-3.5-turbo',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      description: 'Fast and efficient for most tasks',
      specialty: ['general-coding', 'quick-tasks', 'explanations']
    },
    
    // Anthropic Claude
    {
      id: 'claude-3.5',
      name: 'Claude 3.5 Sonnet',
      type: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      endpoint: 'https://api.anthropic.com/v1/messages',
      description: 'Excellent at code analysis and reasoning',
      specialty: ['code-analysis', 'security', 'best-practices']
    },
    
    // Google Gemini
    {
      id: 'gemini',
      name: 'Gemini Pro',
      type: 'google',
      model: 'gemini-pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      description: 'Strong at multimodal tasks and analysis',
      specialty: ['analysis', 'documentation', 'research']
    },
    
    // Grok (X.AI)
    {
      id: 'grok',
      name: 'Grok',
      type: 'xai',
      model: 'grok-beta',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      description: 'Creative problem solving with humor',
      specialty: ['creative-coding', 'innovation', 'problem-solving']
    }
  ];

  setCredentials(credentials: Partial<AICredentials>): void {
    this.credentials = { ...this.credentials, ...credentials };
  }

  getAvailableProviders(): AIProvider[] {
    return this.providers.filter(provider => {
      if (provider.type === 'ollama') return true; // Local models always available
      return this.credentials[provider.type]; // Only show if API key is set
    });
  }

  async callAI(providerId: string, prompt: string, _context?: any): Promise<string> {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    switch (provider.type) {
      case 'ollama':
        return this.callOllama(provider, prompt);
      
      case 'openai':
        return this.callOpenAI(provider, prompt);
      
      case 'anthropic':
        return this.callAnthropic(provider, prompt);
      
      case 'google':
        return this.callGemini(provider, prompt);
      
      case 'xai':
        return this.callGrok(provider, prompt);
      
      default:
        throw new Error(`Provider type ${provider.type} not supported`);
    }
  }

  private async callOllama(provider: AIProvider, prompt: string): Promise<string> {
    try {
      const response = await axios.post(provider.endpoint!, {
        model: provider.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 1500
        }
      });
      return response.data.response || 'No response';
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama not running. Start with: ollama serve');
      }
      throw new Error(`Ollama error: ${error.message}`);
    }
  }

  private async callOpenAI(provider: AIProvider, prompt: string): Promise<string> {
    if (!this.credentials.openai) {
      throw new Error('OpenAI API key not set');
    }

    try {
      const response = await axios.post(provider.endpoint!, {
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.credentials.openai}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(`OpenAI error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async callAnthropic(provider: AIProvider, prompt: string): Promise<string> {
    if (!this.credentials.anthropic) {
      throw new Error('Anthropic API key not set');
    }

    try {
      const response = await axios.post(provider.endpoint!, {
        model: provider.model,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'x-api-key': this.credentials.anthropic,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });
      return response.data.content[0].text;
    } catch (error: any) {
      throw new Error(`Claude error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async callGemini(provider: AIProvider, prompt: string): Promise<string> {
    if (!this.credentials.google) {
      throw new Error('Google API key not set');
    }

    try {
      const response = await axios.post(`${provider.endpoint}?key=${this.credentials.google}`, {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      throw new Error(`Gemini error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async callGrok(provider: AIProvider, prompt: string): Promise<string> {
    if (!this.credentials.xai) {
      throw new Error('Grok API key not set');
    }

    try {
      const response = await axios.post(provider.endpoint!, {
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.credentials.xai}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(`Grok error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  selectBestProvider(task: string, specialty: string[]): AIProvider {
    // Find providers that match the required specialties
    const matchingProviders = this.getAvailableProviders().filter(provider => 
      provider.specialty.some(spec => specialty.includes(spec))
    );

    if (matchingProviders.length === 0) {
      // Fallback to any available provider
      const available = this.getAvailableProviders();
      return available[0] || this.providers[0];
    }

    // Prioritize based on task complexity
    if (task.includes('complex') || task.includes('architecture')) {
      return matchingProviders.find(p => p.id === 'gpt-4') || 
             matchingProviders.find(p => p.id === 'claude-3.5') ||
             matchingProviders.find(p => p.id === 'qwen-smart') ||
             matchingProviders[0];
    }

    if (task.includes('creative') || task.includes('innovation')) {
      return matchingProviders.find(p => p.id === 'grok') || matchingProviders[0];
    }

    if (task.includes('quick') || task.includes('simple')) {
      return matchingProviders.find(p => p.id === 'llama-fast') ||
             matchingProviders.find(p => p.id === 'gpt-3.5') ||
             matchingProviders[0];
    }

    // Default to first matching provider
    return matchingProviders[0];
  }
}

export const multiAI = new MultiAIManager();