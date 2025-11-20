import React, { useState } from 'react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import Terminal from './Terminal';
import './IDE.css';

interface IDEProps {}

const IDE: React.FC<IDEProps> = () => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(true);

  const handleFileSelect = (filePath: string) => {
    setActiveFile(filePath);
  };

  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
  };

  return (
    <div className="ide-container">
      <div className="ide-header">
        <div className="ide-title">FreddyMac IDE</div>
        <div className="ide-controls">
          <button 
            onClick={toggleTerminal}
            className={`terminal-toggle ${showTerminal ? 'active' : ''}`}
          >
            Terminal
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
              style={{ height: '300px' }}
            >
              <div className="terminal-header">
                <span className="terminal-title">AI Terminal</span>
                <div className="terminal-controls">
                  <button 
                    onClick={() => setShowTerminal(false)}
                    className="terminal-close"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="terminal-content">
                <Terminal onFileSelect={handleFileSelect} currentFile={activeFile || undefined} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDE;