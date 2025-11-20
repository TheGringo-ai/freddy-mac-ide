import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { nlParser } from '../utils/naturalLanguageParser';
import { aiTeam } from '../utils/aiTeam';
import './Terminal.css';

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

interface AIProvider {
  name: string;
  endpoint: string;
  model: string;
  apiKey?: string;
}

interface TerminalProps {
  onFileSelect?: (filePath: string) => void;
  currentFile?: string;
}

const Terminal: React.FC<TerminalProps> = ({ onFileSelect, currentFile }) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: 'system',
      content: 'FreddyMac AI Terminal - Ready! Try saying "help" or just talk naturally.',
      timestamp: new Date()
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>({
    name: 'ollama',
    endpoint: 'http://localhost:11434/api/generate',
    model: 'qwen2.5-coder:3b'
  });
  const [openAiKey, setOpenAiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const providers: AIProvider[] = [
    {
      name: 'ollama',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'qwen2.5-coder:3b'
    },
    {
      name: 'ollama-fast',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3.2:1b'
    },
    {
      name: 'ollama-smart',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'qwen2.5-coder:7b'
    },
    {
      name: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo'
    }
  ];

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, {
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const callOpenAI = async (message: string) => {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: aiProvider.model,
          messages: [{ role: 'user', content: message }],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(`OpenAI Error: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  const callOllama = async (message: string) => {
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: aiProvider.model,
        prompt: message,
        stream: false
      });
      return response.data.response;
    } catch (error: any) {
      throw new Error(`Ollama Error: ${error.message}. Make sure Ollama is running locally.`);
    }
  };

  const handleAICommand = async (message: string) => {
    setIsLoading(true);
    addLine('ai', 'AI is thinking...');

    try {
      let response: string;
      
      if (aiProvider.name === 'openai') {
        if (!openAiKey) {
          throw new Error('OpenAI API key required. Use: set-openai-key YOUR_KEY');
        }
        response = await callOpenAI(message);
      } else {
        response = await callOllama(message);
      }

      setLines(prev => prev.slice(0, -1));
      addLine('ai', response);
    } catch (error: any) {
      setLines(prev => prev.slice(0, -1));
      addLine('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (command: string) => {
    addLine('command', `> ${command}`);

    // Handle API key commands
    if (command.startsWith('set-openai-key ')) {
      const key = command.slice(15);
      setOpenAiKey(key);
      aiTeam.setAPIKey('openai', key);
      addLine('system', '✅ OpenAI API key set successfully');
      return;
    }

    if (command.startsWith('set-claude-key ')) {
      const key = command.slice(15);
      aiTeam.setAPIKey('anthropic', key);
      addLine('system', '✅ Claude API key set successfully');
      return;
    }

    if (command.startsWith('set-gemini-key ')) {
      const key = command.slice(15);
      aiTeam.setAPIKey('google', key);
      addLine('system', '✅ Gemini API key set successfully');
      return;
    }

    if (command.startsWith('set-grok-key ')) {
      const key = command.slice(13);
      aiTeam.setAPIKey('xai', key);
      addLine('system', '✅ Grok API key set successfully');
      return;
    }

    if (command === 'providers') {
      addLine('system', '🤖 Available AI Providers:');
      const availableProviders = aiTeam.getAvailableProviders();
      if (availableProviders.length === 0) {
        addLine('system', 'No AI providers configured. Set API keys to enable more models.');
        addLine('system', 'Local Ollama models available if Ollama is running.');
      } else {
        availableProviders.forEach(p => {
          addLine('system', `  ✅ ${p.name} (${p.model}) - ${p.description}`);
        });
      }
      return;
    }

    if (command.startsWith('use ')) {
      const providerName = command.slice(4);
      const provider = providers.find(p => p.name === providerName);
      if (provider) {
        setAiProvider(provider);
        addLine('system', `Switched to ${provider.name} (${provider.model})`);
      } else {
        addLine('error', `Unknown provider: ${providerName}`);
      }
      return;
    }

    if (command === 'clear') {
      setLines([]);
      return;
    }

    // Parse natural language command
    const parsedCommand = nlParser.parse(command, currentFile);
    
    try {
      if (parsedCommand.type === 'ai_chat') {
        await handleAICommand(parsedCommand.content || command);
      } else {
        const result = await nlParser.executeCommand(parsedCommand, onFileSelect);
        addLine('system', result);
      }
    } catch (error) {
      addLine('error', `Error: ${error}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() && !isLoading) {
      executeCommand(currentInput.trim());
      setCurrentInput('');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLineClassName = (type: string) => {
    switch (type) {
      case 'command': return 'terminal-command';
      case 'ai': return 'terminal-ai';
      case 'error': return 'terminal-error';
      case 'system': return 'terminal-system';
      default: return 'terminal-output';
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">FreddyMac AI Terminal</div>
        <div className="terminal-provider">
          {aiProvider.name} ({aiProvider.model})
          {aiProvider.name === 'openai' && !openAiKey && (
            <span className="terminal-warning"> - API key needed</span>
          )}
        </div>
      </div>
      
      <div className="terminal-output" ref={terminalRef}>
        {lines.map((line, index) => (
          <div key={index} className={`terminal-line ${getLineClassName(line.type)}`}>
            <span className="terminal-timestamp">[{formatTimestamp(line.timestamp)}]</span>
            <span className="terminal-content">{line.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="terminal-input-form">
        <span className="terminal-prompt">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          className="terminal-input"
          placeholder="Just talk naturally - 'create file app.js', 'explain this code', 'help me debug'"
          disabled={isLoading}
          autoFocus
        />
      </form>
    </div>
  );
};

export default Terminal;