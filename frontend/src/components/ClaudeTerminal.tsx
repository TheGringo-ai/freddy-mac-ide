/**
 * Claude Code Enhanced Terminal - Enterprise AI Development Assistant
 * Integrates Claude Code directly into the terminal for seamless AI assistance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { instructionGuide } from '../utils/InstructionGuide';

interface ClaudeTerminalProps {
  onCommandExecute?: (command: string) => void;
  currentFile?: string;
  projectName?: string;
}

interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'claude' | 'error' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ClaudeStatus {
  enabled: boolean;
  session_active: boolean;
  commands_processed: number;
  ai_team_available: boolean;
}

const TerminalContainer = styled.div`
  height: 100%;
  background: #0d1117;
  display: flex;
  flex-direction: column;
  font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  color: #e1e4e8;
`;

const TerminalHeader = styled.div`
  height: 36px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #8b949e;
  gap: 12px;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ClaudeIndicator = styled.div<{ enabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => props.enabled ? '#0d4429' : '#21262d'};
  border: 1px solid ${props => props.enabled ? '#238636' : '#30363d'};
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.enabled ? '#3fb950' : '#8b949e'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.enabled ? '#0f5132' : '#30363d'};
  }

  &::before {
    content: '🤖';
    font-size: 10px;
  }
`;

const AITeamIndicator = styled.div<{ available: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${props => props.available ? '#58a6ff' : '#6e7681'};
  
  &::before {
    content: '👥';
    font-size: 10px;
  }
`;

const TerminalBody = styled.div`
  flex: 1;
  padding: 8px 12px;
  overflow-y: auto;
  line-height: 1.5;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #161b22;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #484f58;
  }
`;

const TerminalEntryStyled = styled.div<{ type: string }>`
  margin-bottom: 4px;
  
  ${props => {
    switch (props.type) {
      case 'command':
        return 'color: #58a6ff;';
      case 'claude':
        return 'color: #3fb950; background: #0d1421; padding: 8px; border-radius: 6px; border-left: 3px solid #238636; margin: 8px 0;';
      case 'error':
        return 'color: #f85149;';
      case 'system':
        return 'color: #a5a5a5; font-style: italic;';
      default:
        return 'color: #e1e4e8;';
    }
  }}
`;

const TerminalInputContainer = styled.div<{ claudeMode: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #0d1117;
  border-top: 1px solid #21262d;
  ${props => props.claudeMode && 'border-top: 2px solid #238636;'}
`;

const TerminalPrompt = styled.span<{ claudeMode: boolean }>`
  margin-right: 8px;
  user-select: none;
  font-weight: 500;
  color: ${props => props.claudeMode ? '#3fb950' : '#58a6ff'};
  
  &::before {
    content: ${props => props.claudeMode ? '"[Claude ON] "' : '""'};
    color: #238636;
    font-weight: bold;
  }
`;

const TerminalInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e1e4e8;
  font-family: inherit;
  font-size: inherit;
  
  &::placeholder {
    color: #6e7681;
  }
`;

const CommandSuggestions = styled.div`
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
`;

const SuggestionItem = styled.div`
  padding: 4px 8px;
  color: #8b949e;
  cursor: pointer;
  border-radius: 3px;
  
  &:hover {
    background: #30363d;
    color: #e1e4e8;
  }
  
  .command {
    color: #58a6ff;
    font-weight: 500;
  }
  
  .description {
    margin-left: 8px;
    color: #8b949e;
  }
`;

const ClaudeTerminal: React.FC<ClaudeTerminalProps> = ({
  onCommandExecute,
  currentFile,
  projectName = 'freddy-mac-ide'
}) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus>({
    enabled: false,
    session_active: false,
    commands_processed: 0,
    ai_team_available: true
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Claude command suggestions
  const claudeCommands = [
    { command: 'claude:', description: 'Ask Claude anything with full project context' },
    { command: 'claude toggle', description: 'Enable/disable Claude Code integration' },
    { command: 'claude status', description: 'Show Claude integration status' },
    { command: 'claude help', description: 'Show Claude commands help' },
    { command: 'claude explain', description: 'Explain current file or component' },
    { command: 'claude review', description: 'Get code review with AI team' },
    { command: 'claude debug', description: 'Debug assistance with full context' },
    { command: 'claude context', description: 'Show current project context' },
    { command: 'claude refactor', description: 'Get refactoring suggestions' },
    { command: 'walkthrough onboarding', description: 'Start FreddyMac IDE onboarding walkthrough' },
    { command: 'walkthrough new-feature', description: 'Learn how to add a new feature to your project' },
    { command: 'walkthrough bug-fix', description: 'Learn systematic debugging and fixing workflow' },
    { command: 'walkthrough-status <topic>', description: 'Check progress of a specific walkthrough' },
    { command: 'walkthrough-complete <topic> <step>', description: 'Mark a walkthrough step as completed' },
    { command: 'walkthrough-reset <topic>', description: 'Reset progress for a specific walkthrough' }
  ];

  // Initialize terminal with welcome message
  useEffect(() => {
    addEntry('system', '🚀 Freddy Mac IDE Terminal - Enterprise Edition with Claude Code Integration');
    addEntry('system', 'Type "claude help" to see available AI commands or "walkthrough onboarding" to get started');
    checkClaudeStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries]);

  const addEntry = useCallback((type: TerminalEntry['type'], content: string, metadata?: any) => {
    const entry: TerminalEntry = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      metadata
    };
    setEntries(prev => [...prev, entry]);
  }, []);

  const checkClaudeStatus = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/claude/health');
      const data = await response.json();
      setClaudeStatus({
        enabled: data.enabled,
        session_active: data.session_active,
        commands_processed: data.commands_processed,
        ai_team_available: data.ai_team_available
      });
    } catch (error) {
      console.error('Failed to check Claude status:', error);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    addEntry('command', `$ ${command}`);
    setIsLoading(true);

    try {
      // Check if it's a Claude command
      if (command.trim().startsWith('claude')) {
        await executeClaudeCommand(command);
      }
      // Check if it's a walkthrough command
      else if (command.trim().startsWith('walkthrough')) {
        await executeWalkthroughCommand(command);
      } else {
        // Execute regular terminal command
        const response = await fetch('/api/terminal/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command,
            workingDirectory: '/Users/fredtaylor/FreddyMacProjects/' + projectName
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          if (data.output) {
            addEntry('output', data.output);
          }
          if (data.error) {
            addEntry('error', data.error);
          }
        } else {
          addEntry('error', data.error || 'Command failed');
        }
      }
      
      onCommandExecute?.(command);
    } catch (error) {
      addEntry('error', `Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeClaudeCommand = async (command: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/claude/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          project: projectName,
          current_file: currentFile,
          context_scope: 'full'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        addEntry('claude', data.response, data.metadata);
        
        // Update Claude status after successful command
        await checkClaudeStatus();
        
        // Show business AI team insights if available
        if (data.metadata?.ai_team_insights) {
          const insights = data.metadata.ai_team_insights;
          
          if (insights.status === 'connected') {
            const businessResponse = insights.business_ai_response;
            const modelsUsed = insights.models_used || [];
            
            addEntry('system', `🏢 Business AI Team Analysis (${modelsUsed.join(', ')}):\n${businessResponse}`);
            addEntry('system', `📊 Confidence: ${(insights.confidence * 100).toFixed(1)}% | Response Time: ${insights.response_time?.toFixed(2)}s`);
          } else {
            addEntry('error', `🔌 Business AI Team: ${insights.error || 'Disconnected'}`);
            if (insights.fallback_insights) {
              addEntry('system', `💼 Business Recommendation: ${insights.fallback_insights.business_recommendation}`);
            }
          }
        }
      } else {
        addEntry('error', data.error || 'Claude command failed');
      }
    } catch (error) {
      addEntry('error', `Claude Error: ${error}`);
    }
  };

  const executeWalkthroughCommand = async (command: string) => {
    try {
      const parts = command.trim().split(/\s+/);
      const mainCommand = parts[0]; // 'walkthrough' or 'walkthrough-status' etc
      const subcommand = parts[1]; // topic or action
      const arg = parts[2]; // additional argument if any

      if (mainCommand === 'walkthrough' && subcommand) {
        // Handle main walkthrough command: walkthrough <topic>
        const output = instructionGuide.generateWalkthroughOutput(subcommand);
        addEntry('system', output);
        return;
      }

      if (mainCommand === 'walkthrough-status' && subcommand) {
        // Handle status command: walkthrough-status <topic>
        const output = instructionGuide.generateStatusOutput(subcommand);
        addEntry('system', output);
        return;
      }

      if (mainCommand === 'walkthrough-complete' && subcommand && arg) {
        // Handle completion command: walkthrough-complete <topic> <stepId>
        const completedStep = instructionGuide.completeStep(subcommand, arg);
        if (completedStep) {
          const topic = instructionGuide.getTopicInfo(subcommand);
          const progress = instructionGuide.getProgress(subcommand);
          if (topic && progress && progress.completedSteps.length === topic.steps.length) {
            addEntry('system', `🎉 Walkthrough "${topic.title}" completed!\n\nGreat job completing this walkthrough!`);
          } else {
            addEntry('system', `✅ Step "${arg}" marked as completed. Progress: ${progress?.completedSteps.length || 0}/${topic?.steps.length || 0} steps.`);
          }
        } else {
          addEntry('error', `Failed to complete step "${arg}" for topic "${subcommand}"`);
        }
        return;
      }

      if (mainCommand === 'walkthrough-reset' && subcommand) {
        // Handle reset command: walkthrough-reset <topic>
        const success = instructionGuide.resetWalkthrough(subcommand);
        if (success) {
          addEntry('system', `🔄 Walkthrough "${subcommand}" has been reset. Run \`walkthrough ${subcommand}\` to start again.`);
        } else {
          addEntry('error', `Failed to reset walkthrough "${subcommand}". Topic may not exist.`);
        }
        return;
      }

      if (mainCommand === 'walkthrough' && !subcommand) {
        // Show available walkthroughs
        const topics = instructionGuide.getAvailableTopics();
        const stats = instructionGuide.getOverallStats();
        
        let output = `📚 **FreddyMac IDE Learning Center**

**Available Walkthroughs:**
${topics.map((topicId: string) => {
  const topic = instructionGuide.getTopicInfo(topicId);
  const progress = instructionGuide.getProgress(topicId);
  const status = progress ? (progress.isCompleted ? '✅' : '🔄') : '⏳';
  return `${status} ${topicId} - ${topic?.title} (${topic?.difficulty})`;
}).join('\n')}

**Your Progress:**
- Topics Started: ${stats.inProgress + stats.completed}/${stats.total}
- Completed: ${stats.completed}/${stats.total}
- Overall Completion: ${Math.round((stats.completed / stats.total) * 100)}%

**Usage:**
• \`walkthrough <topic>\` - Start or continue a walkthrough
• \`walkthrough-status <topic>\` - Check progress
• \`walkthrough-complete <topic> <step>\` - Mark step completed
• \`walkthrough-reset <topic>\` - Reset walkthrough

**Getting Started:**
Run \`walkthrough onboarding\` for your first guided experience!`;
        
        addEntry('system', output);
        return;
      }

      // Unknown walkthrough command
      addEntry('error', `Unknown walkthrough command: ${command}
      
Available commands:
• walkthrough - List all walkthroughs
• walkthrough <topic> - Start/continue walkthrough
• walkthrough-status <topic> - Check progress
• walkthrough-complete <topic> <step> - Complete step
• walkthrough-reset <topic> - Reset walkthrough`);

    } catch (error) {
      addEntry('error', `Walkthrough Error: ${error}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Show suggestions for Claude and walkthrough commands
    if (value.startsWith('claude') || value.startsWith('walkthrough')) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (command: string) => {
    setInput(command);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const toggleClaudeMode = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/claude/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !claudeStatus.enabled
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await checkClaudeStatus();
        addEntry('system', data.message);
      } else {
        addEntry('error', data.error || 'Failed to toggle Claude mode');
      }
    } catch (error) {
      addEntry('error', `Toggle Error: ${error}`);
    }
  };

  const filteredSuggestions = claudeCommands.filter(cmd =>
    cmd.command.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <TerminalContainer>
      <TerminalHeader>
        <HeaderLeft>
          <span>🖥️ Terminal</span>
          <span>•</span>
          <span>{projectName}</span>
          {currentFile && (
            <>
              <span>•</span>
              <span style={{ color: '#58a6ff' }}>{currentFile.split('/').pop()}</span>
            </>
          )}
        </HeaderLeft>
        
        <HeaderRight>
          <AITeamIndicator available={claudeStatus.ai_team_available}>
            AI Team {claudeStatus.ai_team_available ? 'Ready' : 'Offline'}
          </AITeamIndicator>
          
          <ClaudeIndicator 
            enabled={claudeStatus.enabled}
            onClick={toggleClaudeMode}
            title={claudeStatus.enabled ? 'Click to disable Claude Code' : 'Click to enable Claude Code'}
          >
            Claude {claudeStatus.enabled ? 'ON' : 'OFF'}
          </ClaudeIndicator>
          
          <span style={{ fontSize: '11px', color: '#6e7681' }}>
            {claudeStatus.commands_processed} cmds
          </span>
        </HeaderRight>
      </TerminalHeader>

      <TerminalBody ref={bodyRef}>
        {entries.map((entry) => (
          <TerminalEntryStyled key={entry.id} type={entry.type}>
            {entry.content}
            {entry.metadata && entry.metadata.execution_time && (
              <div style={{ fontSize: '11px', color: '#6e7681', marginTop: '4px' }}>
                ⏱️ {entry.metadata.execution_time.toFixed(2)}s • 
                🧠 {entry.metadata.tokens_used} tokens • 
                📊 {entry.metadata.context_size} chars context
              </div>
            )}
          </TerminalEntryStyled>
        ))}
        
        {isLoading && (
          <TerminalEntryStyled type="system">
            <span style={{ color: '#58a6ff' }}>⏳ Processing...</span>
          </TerminalEntryStyled>
        )}
      </TerminalBody>

      <div style={{ position: 'relative' }}>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <CommandSuggestions>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#3fb950' }}>
              🤖 Claude Code Commands:
            </div>
            {filteredSuggestions.map((suggestion, index) => (
              <SuggestionItem 
                key={index}
                onClick={() => handleSuggestionClick(suggestion.command)}
              >
                <span className="command">{suggestion.command}</span>
                <span className="description">{suggestion.description}</span>
              </SuggestionItem>
            ))}
          </CommandSuggestions>
        )}
        
        <TerminalInputContainer claudeMode={claudeStatus.enabled}>
          <TerminalPrompt claudeMode={claudeStatus.enabled}>
            $
          </TerminalPrompt>
          <TerminalInput
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={claudeStatus.enabled ? 'Try: claude: help me optimize this code' : 'Enter command or type "claude help"'}
            disabled={isLoading}
            autoFocus
          />
        </TerminalInputContainer>
      </div>
    </TerminalContainer>
  );
};

export default ClaudeTerminal;