import React, { useState } from 'react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import Terminal from './Terminal';
import './IDE.css';

interface IDEProps {}

const IDE: React.FC<IDEProps> = () => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activePanel, setActivePanel] = useState<'terminal' | 'search' | 'team-chat' | 'settings'>('terminal');

  const handleFileSelect = (filePath: string) => {
    setActiveFile(filePath);
  };


  return (
    <div className="ide-container">
      <div className="ide-header">
        <div className="ide-title">FreddyMac IDE</div>
        <div className="ide-controls">
          <button 
            onClick={() => {setActivePanel('terminal'); setShowTerminal(true);}}
            className={`panel-toggle ${activePanel === 'terminal' ? 'active' : ''}`}
          >
            🤖 AI Terminal
          </button>
          <button 
            onClick={() => {setActivePanel('search'); setShowTerminal(true);}}
            className={`panel-toggle ${activePanel === 'search' ? 'active' : ''}`}
          >
            🔍 Semantic Search
          </button>
          <button 
            onClick={() => {setActivePanel('team-chat'); setShowTerminal(true);}}
            className={`panel-toggle ${activePanel === 'team-chat' ? 'active' : ''}`}
          >
            👥 AI Team Chat
          </button>
          <button 
            onClick={() => {setActivePanel('settings'); setShowTerminal(true);}}
            className={`panel-toggle ${activePanel === 'settings' ? 'active' : ''}`}
          >
            ⚙️ Settings
          </button>
          <button 
            onClick={() => setShowTerminal(false)}
            className="panel-close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="ide-body">
        <div className="ide-sidebar">
          <FileExplorer onFileSelect={handleFileSelect} />
        </div>

        <div className="ide-main">
          <div className="ide-editor-area">
            <CodeEditor activeFile={activeFile} />
          </div>

          {showTerminal && (
            <div 
              className="ide-terminal-area"
              style={{ height: '400px' }}
            >
              <div className="terminal-header">
                <span className="terminal-title">
                  {activePanel === 'terminal' && '🤖 AI Terminal - Natural Language Commands'}
                  {activePanel === 'search' && '🔍 Semantic Search - Project-wide RAG'}
                  {activePanel === 'team-chat' && '👥 AI Team Chat - Multi-AI Collaboration'}
                  {activePanel === 'settings' && '⚙️ Settings - API Keys & Configuration'}
                </span>
              </div>
              <div className="terminal-content">
                {activePanel === 'terminal' && (
                  <Terminal onFileSelect={handleFileSelect} currentFile={activeFile || undefined} />
                )}
                {activePanel === 'search' && (
                  <div style={{ padding: '20px', color: '#d4d4d4' }}>
                    <h3>🧠 Semantic Search Testing</h3>
                    <p>Test the semantic search functionality:</p>
                    <ul style={{ marginLeft: '20px' }}>
                      <li><code>index</code> - Index the project for semantic search</li>
                      <li><code>search "authentication"</code> - Search for auth-related code</li>
                      <li><code>search "API calls"</code> - Find API-related functions</li>
                      <li><code>search "components"</code> - Locate React components</li>
                    </ul>
                    <p style={{ marginTop: '20px' }}>Use the AI Terminal to run these commands!</p>
                  </div>
                )}
                {activePanel === 'team-chat' && (
                  <div style={{ padding: '20px', color: '#d4d4d4' }}>
                    <h3>👥 AI Team Collaboration</h3>
                    <p>Chat with specialized AI team members:</p>
                    <ul style={{ marginLeft: '20px' }}>
                      <li><strong>Alex</strong> - Full-stack architecture & complex coding</li>
                      <li><strong>Sarah</strong> - Frontend, UI/UX, React components</li>
                      <li><strong>Marcus</strong> - Backend, APIs, databases, DevOps</li>
                      <li><strong>Lisa</strong> - Code review, security, best practices</li>
                      <li><strong>Grok</strong> - Creative problem solving & innovation</li>
                      <li><strong>David</strong> - Project management & organization</li>
                    </ul>
                    <p style={{ marginTop: '20px' }}>Use the AI Terminal to talk with the team!</p>
                  </div>
                )}
                {activePanel === 'settings' && (
                  <div style={{ padding: '20px', color: '#d4d4d4' }}>
                    <h3>⚙️ Configuration</h3>
                    <p>Set your AI provider API keys in the terminal:</p>
                    <ul style={{ marginLeft: '20px' }}>
                      <li><code>set-openai-key YOUR_KEY</code> - Configure OpenAI GPT models</li>
                      <li><code>set-claude-key YOUR_KEY</code> - Configure Anthropic Claude</li>
                      <li><code>set-gemini-key YOUR_KEY</code> - Configure Google Gemini</li>
                      <li><code>set-grok-key YOUR_KEY</code> - Configure X.AI Grok</li>
                      <li><code>providers</code> - View available AI providers</li>
                    </ul>
                    <p style={{ marginTop: '20px' }}>Ollama models work locally without API keys!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDE;