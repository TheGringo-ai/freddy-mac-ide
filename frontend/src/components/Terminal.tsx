import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { nlParser } from '../utils/naturalLanguageParser';
import { aiTeam, type AIResponse, type AIAction } from '../utils/aiTeam';
import './Terminal.css';

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  aiResponse?: AIResponse;
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

interface AgentStatus {
  activeAgent: string | null;
  ragStatus: string;
  isProcessing: boolean;
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
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    activeAgent: null,
    ragStatus: 'Ready',
    isProcessing: false
  });
  const [_availableActions, _setAvailableActions] = useState<AIAction[]>([]);
  const [pendingActions, setPendingActions] = useState<Map<string, AIAction>>(new Map());
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

  const addLine = (type: TerminalLine['type'], content: string, actions?: AIAction[], aiResponse?: AIResponse) => {
    const newLine: TerminalLine = {
      type,
      content,
      timestamp: new Date(),
      actions,
      aiResponse
    };
    
    setLines(prev => [...prev, newLine]);
    
    // Store actions for quick access
    if (actions) {
      setPendingActions(prev => {
        const newMap = new Map(prev);
        actions.forEach(action => {
          newMap.set(action.id, action);
        });
        return newMap;
      });
    }
  };
  
  const executeAction = useCallback(async (actionId: string) => {
    const action = pendingActions.get(actionId);
    if (!action) {
      addLine('error', `Action ${actionId} not found`);
      return;
    }
    
    setAgentStatus(prev => ({ ...prev, isProcessing: true }));
    addLine('system', `🚀 Executing: ${action.title}`);
    
    try {
      const result = await aiTeam.executeAction(actionId);
      addLine('system', `✅ ${result}`);
    } catch (error) {
      addLine('error', `❌ Failed to execute action: ${error}`);
    } finally {
      setAgentStatus(prev => ({ ...prev, isProcessing: false }));
      setPendingActions(prev => {
        const newMap = new Map(prev);
        newMap.delete(actionId);
        return newMap;
      });
    }
  }, [pendingActions]);

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

  const handleAICommand = async (message: string, isAgenticMode: boolean = false) => {
    setIsLoading(true);
    
    if (isAgenticMode) {
      const member = aiTeam.getTeamMembers().find(m => 
        message.toLowerCase().includes(m.name.toLowerCase()) ||
        m.specialties.some(specialty => message.toLowerCase().includes(specialty))
      ) || aiTeam.getTeamMembers()[0]; // Default to Alex
      
      setAgentStatus(prev => ({
        ...prev,
        activeAgent: `${member.name} (${member.specialty})`,
        ragStatus: 'Processing context...',
        isProcessing: true
      }));
      
      addLine('ai', `${member.avatar} ${member.name} is analyzing your request...`);
    } else {
      addLine('ai', 'AI is thinking...');
    }

    try {
      let response: AIResponse | string;
      
      if (isAgenticMode) {
        // Use enhanced AI team with action support
        response = await aiTeam.getTeamAdvice(message, { currentFile });
        
        setAgentStatus(prev => ({
          ...prev,
          ragStatus: typeof response === 'object' && response.actions?.length ? `${response.actions.length} actions available` : 'Ready',
          isProcessing: false
        }));
        
        setLines(prev => prev.slice(0, -1));
        if (typeof response === 'object') {
          addLine('ai', response.text, response.actions, response);
        } else {
          addLine('ai', response);
        }
      } else {
        // Legacy simple AI response
        if (aiProvider.name === 'openai') {
          if (!openAiKey) {
            throw new Error('OpenAI API key required. Use: set-openai-key YOUR_KEY');
          }
          response = await callOpenAI(message);
        } else {
          response = await callOllama(message);
        }
        
        setLines(prev => prev.slice(0, -1));
        addLine('ai', response as string);
      }
    } catch (error: any) {
      setLines(prev => prev.slice(0, -1));
      addLine('error', error.message);
      setAgentStatus(prev => ({
        ...prev,
        activeAgent: null,
        ragStatus: 'Error',
        isProcessing: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (command: string) => {
    const isAgenticMode = command.startsWith('>>') || command.toLowerCase().includes('agent');
    const cleanCommand = command.startsWith('>>') ? command.slice(2).trim() : command;
    
    addLine('command', `${isAgenticMode ? '>>' : '>'} ${cleanCommand}`);

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
    const parsedCommand = nlParser.parse(cleanCommand, currentFile);
    
    try {
      if (parsedCommand.type === 'ai_chat' || isAgenticMode) {
        await handleAICommand(parsedCommand.content || cleanCommand, isAgenticMode);
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

  // Component for rendering action buttons
  const ActionButton: React.FC<{ action: AIAction }> = ({ action }) => {
    const priorityColors = {
      high: '#ff4757',
      medium: '#ffa502',
      low: '#26de81'
    };
    
    return (
      <button
        className="action-button"
        onClick={() => executeAction(action.id)}
        style={{ borderColor: priorityColors[action.priority] }}
        disabled={agentStatus.isProcessing}
        title={action.description}
      >
        <span className="action-icon">
          {action.type === 'fix' ? '🔧' : 
           action.type === 'create' ? '➕' :
           action.type === 'modify' ? '✏️' :
           action.type === 'test' ? '✅' :
           action.type === 'install' ? '💿' : '🚀'}
        </span>
        <span className="action-text">{action.title}</span>
        {action.priority === 'high' && <span className="priority-indicator">🔥</span>}
      </button>
    );
  };
  
  // Enhanced line rendering with action buttons
  const renderTerminalLine = (line: TerminalLine, index: number) => {
    return (
      <div key={index} className={`terminal-line ${getLineClassName(line.type)}`}>
        <span className="terminal-timestamp">[{formatTimestamp(line.timestamp)}]</span>
        <div className="terminal-content-wrapper">
          <span className="terminal-content">{line.content}</span>
          {line.actions && line.actions.length > 0 && (
            <div className="action-buttons-container">
              <div className="actions-header">
                <span className="actions-icon">🚀</span>
                <span className="actions-label">Quick Actions:</span>
              </div>
              <div className="actions-grid">
                {line.actions.map(action => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="terminal-container">
      {/* Enhanced Header with HUD */}
      <div className="terminal-header">
        <div className="terminal-title-section">
          <div className="terminal-title">FreddyMac AI Terminal</div>
          <div className="terminal-subtitle">Intelligent Development Assistant</div>
        </div>
        
        {/* Heads-Up Display (HUD) */}
        <div className="terminal-hud">
          <div className="hud-section">
            <span className="hud-label">Active Agent:</span>
            <span className={`hud-value ${agentStatus.activeAgent ? 'active' : 'inactive'}`}>
              {agentStatus.activeAgent || 'None'}
            </span>
          </div>
          <div className="hud-section">
            <span className="hud-label">RAG Status:</span>
            <span className={`hud-value ${agentStatus.ragStatus === 'Ready' ? 'ready' : agentStatus.ragStatus === 'Error' ? 'error' : 'processing'}`}>
              {agentStatus.isProcessing ? (
                <><span className="loading-spinner">⏳</span> {agentStatus.ragStatus}</>
              ) : (
                agentStatus.ragStatus
              )}
            </span>
          </div>
          <div className="hud-section">
            <span className="hud-label">Provider:</span>
            <span className="hud-value provider">
              {aiProvider.name} ({aiProvider.model})
              {aiProvider.name === 'openai' && !openAiKey && (
                <span className="terminal-warning"> ⚠️</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      <div className="terminal-output" ref={terminalRef}>
        {lines.map(renderTerminalLine)}
      </div>

      <form onSubmit={handleSubmit} className="terminal-input-form">
        <span className={`terminal-prompt ${currentInput.startsWith('>>') ? 'agentic' : 'normal'}`}>
          {currentInput.startsWith('>>') ? '>>' : '>'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          className="terminal-input"
          placeholder="Natural: 'create file app.js' | Agentic: '>> help me build a component' | Commands: 'use ollama'"
          disabled={isLoading}
          autoFocus
        />
      </form>
    </div>
  );
};

export default Terminal;