import { fileManager } from './fileUtils';
import { aiTeam } from './aiTeam';
import { instructionGuide } from './InstructionGuide';

export interface ParsedCommand {
  type: 'ai_chat' | 'file_operation' | 'project_operation' | 'team_operation' | 'walkthrough' | 'help' | 'unknown';
  action?: string;
  target?: string;
  content?: string;
  params?: Record<string, any>;
  teamMember?: string;
  currentFile?: string;
}

export class NaturalLanguageParser {
  private fileOperationPatterns = [
    // Create file patterns
    { pattern: /create (?:a )?(?:new )?file (?:named |called )?(.+)/i, action: 'create_file' },
    { pattern: /make (?:a )?(?:new )?file (?:named |called )?(.+)/i, action: 'create_file' },
    { pattern: /new file (.+)/i, action: 'create_file' },
    
    // Open file patterns
    { pattern: /open (?:the )?file (.+)/i, action: 'open_file' },
    { pattern: /show (?:me )?(?:the )?file (.+)/i, action: 'open_file' },
    { pattern: /edit (.+)/i, action: 'open_file' },
    
    // Delete file patterns
    { pattern: /delete (?:the )?file (.+)/i, action: 'delete_file' },
    { pattern: /remove (?:the )?file (.+)/i, action: 'delete_file' },
    
    // List files patterns
    { pattern: /(?:show|list|what) (?:files|are the files)/i, action: 'list_files' },
    { pattern: /what files do (?:we|i) have/i, action: 'list_files' },
    
    // Export patterns
    { pattern: /export (.+)/i, action: 'export_file' },
    { pattern: /download (.+)/i, action: 'export_file' },
  ];

  private aiChatPatterns = [
    // Direct AI requests
    { pattern: /explain (.+)/i, type: 'ai_chat' },
    { pattern: /what (?:is|does) (.+)/i, type: 'ai_chat' },
    { pattern: /how (?:do|to) (.+)/i, type: 'ai_chat' },
    { pattern: /help (?:me )?(?:with |understand )?(.+)/i, type: 'ai_chat' },
    { pattern: /tell me about (.+)/i, type: 'ai_chat' },
    { pattern: /can you (.+)/i, type: 'ai_chat' },
    { pattern: /please (.+)/i, type: 'ai_chat' },
    
    // Code-related requests
    { pattern: /review (?:this |the )?code/i, type: 'ai_chat', content: 'Please review the currently open code file' },
    { pattern: /debug (?:this |the )?code/i, type: 'ai_chat', content: 'Please help debug the currently open code file' },
    { pattern: /optimize (?:this |the )?code/i, type: 'ai_chat', content: 'Please suggest optimizations for the currently open code file' },
    { pattern: /refactor (?:this |the )?code/i, type: 'ai_chat', content: 'Please suggest refactoring improvements for the currently open code file' },
  ];

  private projectPatterns = [
    { pattern: /what (?:is )?this project/i, action: 'project_info' },
    { pattern: /project (?:info|information|details)/i, action: 'project_info' },
    { pattern: /show (?:me )?(?:the )?project structure/i, action: 'project_structure' },
  ];

  private walkthroughPatterns = [
    // Walkthrough commands
    { pattern: /^walkthrough$/i, action: 'list_walkthroughs' },
    { pattern: /^walkthrough\s+(\w+(?:-\w+)*)$/i, action: 'start_walkthrough' },
    { pattern: /^walkthrough-status\s+(\w+(?:-\w+)*)$/i, action: 'walkthrough_status' },
    { pattern: /^walkthrough-complete\s+(\w+(?:-\w+)*)\s+(\w+(?:_\w+)*)$/i, action: 'complete_step' },
    { pattern: /^walkthrough-reset\s+(\w+(?:-\w+)*)$/i, action: 'reset_walkthrough' }
  ];

  private teamPatterns = [
    // Team member requests
    { pattern: /(?:talk to|ask|get) (?:the )?team/i, action: 'team_chat' },
    { pattern: /team (?:help|advice|suggestion)/i, action: 'team_advice' },
    { pattern: /(?:who|what) (?:is )?(?:the )?team/i, action: 'show_team' },
    { pattern: /meet (?:the )?team/i, action: 'show_team' },
    
    // Specific team member requests
    { pattern: /(?:talk to|ask) (?:alex|sarah|marcus|lisa|david)/i, action: 'specific_member' },
    { pattern: /(?:alex|sarah|marcus|lisa|david),? (?:can you|help|please)/i, action: 'specific_member' },
    
    // Code review requests
    { pattern: /(?:review|check|analyze) (?:this )?(?:file|code)/i, action: 'code_review' },
    { pattern: /(?:code|file) review/i, action: 'code_review' },
    { pattern: /(?:look at|examine) (?:this )?code/i, action: 'code_review' },
    
    // Project planning
    { pattern: /(?:plan|organize|structure) (?:this )?project/i, action: 'project_planning' },
    { pattern: /(?:how to|help) (?:organize|structure|plan)/i, action: 'project_planning' },
    { pattern: /project (?:roadmap|timeline|milestones)/i, action: 'project_planning' },
    
    // Development collaboration
    { pattern: /(?:build|create|develop) (?:with )?(?:the )?team/i, action: 'collaborative_dev' },
    { pattern: /team (?:build|develop|work on)/i, action: 'collaborative_dev' },
    { pattern: /(?:let's|we should) (?:build|create|work on)/i, action: 'collaborative_dev' },
  ];

  parse(input: string, currentFile?: string): ParsedCommand {
    const cleanInput = input.trim();

    // Check for help requests
    if (this.isHelpRequest(cleanInput)) {
      return { type: 'help' };
    }

    // Check for walkthrough commands (highest priority)
    for (const pattern of this.walkthroughPatterns) {
      const match = cleanInput.match(pattern.pattern);
      if (match) {
        return {
          type: 'walkthrough',
          action: pattern.action,
          target: match[1],
          content: match[2],
          currentFile,
        };
      }
    }

    // Check for team operations
    for (const pattern of this.teamPatterns) {
      const match = cleanInput.match(pattern.pattern);
      if (match) {
        const command: ParsedCommand = {
          type: 'team_operation',
          action: pattern.action,
          currentFile,
          content: cleanInput,
        };
        
        // Extract team member name if mentioned
        const memberMatch = cleanInput.match(/(alex|sarah|marcus|lisa|david)/i);
        if (memberMatch) {
          command.teamMember = memberMatch[1].toLowerCase();
        }
        
        return command;
      }
    }

    // Check for file operations
    for (const pattern of this.fileOperationPatterns) {
      const match = cleanInput.match(pattern.pattern);
      if (match) {
        return {
          type: 'file_operation',
          action: pattern.action,
          target: match[1]?.trim(),
          currentFile,
        };
      }
    }

    // Check for project operations
    for (const pattern of this.projectPatterns) {
      const match = cleanInput.match(pattern.pattern);
      if (match) {
        return {
          type: 'project_operation',
          action: pattern.action,
          currentFile,
        };
      }
    }

    // Check for AI chat patterns
    for (const pattern of this.aiChatPatterns) {
      const match = cleanInput.match(pattern.pattern);
      if (match) {
        return {
          type: 'ai_chat',
          content: pattern.content || match[1] || cleanInput,
          currentFile,
        };
      }
    }

    // Check for AI action execution
    const actionMatch = cleanInput.match(/^ai-action\s+([a-zA-Z0-9_]+)$/i);
    if (actionMatch) {
      return {
        type: 'team_operation',
        action: 'execute_action',
        target: actionMatch[1],
        currentFile,
      };
    }

    // If no specific pattern matches, treat as team chat
    if (cleanInput.length > 0) {
      return {
        type: 'team_operation',
        action: 'team_chat',
        content: cleanInput,
        currentFile,
      };
    }

    return { type: 'unknown' };
  }

  private isHelpRequest(input: string): boolean {
    const helpPatterns = [
      /^help$/i,
      /^what can (?:you|i) do/i,
      /^(?:show|list) commands/i,
      /^how (?:do|to) (?:use|work with) (?:this|the terminal)/i,
    ];

    return helpPatterns.some(pattern => pattern.test(input));
  }

  async executeCommand(command: ParsedCommand, onFileSelect?: (path: string) => void): Promise<string> {
    switch (command.type) {
      case 'walkthrough':
        return this.executeWalkthroughCommand(command);
        
      case 'team_operation':
        return this.executeTeamOperation(command, onFileSelect);
        
      case 'file_operation':
        return this.executeFileOperation(command, onFileSelect);
      
      case 'project_operation':
        return this.executeProjectOperation(command);
      
      case 'help':
        return this.getHelpMessage();
      
      case 'ai_chat':
        return await aiTeam.getTeamAdviceText(command.content || '', { 
          currentFile: command.currentFile 
        });
      
      default:
        return "I'm not sure what you want me to do. Try asking the team for help or type 'help' for commands.";
    }
  }

  private executeWalkthroughCommand(command: ParsedCommand): string {
    const { action, target, content } = command;

    switch (action) {
      case 'list_walkthroughs':
        return instructionGuide.formatWalkthroughList();

      case 'start_walkthrough':
        if (!target) return "Please specify a walkthrough name.";
        const currentStep = instructionGuide.getCurrentStep(target);
        if (currentStep) {
          return instructionGuide.formatStepInstructions(target, currentStep);
        } else {
          const firstStep = instructionGuide.startWalkthrough(target);
          if (firstStep) {
            return `🎉 **Started ${target} walkthrough!**\\n\\n` + 
                   instructionGuide.formatStepInstructions(target, firstStep);
          } else {
            return `Walkthrough "${target}" not found. Try: walkthrough`;
          }
        }

      case 'walkthrough_status':
        if (!target) return "Please specify a walkthrough name.";
        const progress = instructionGuide.getProgress(target);
        if (progress) {
          const walkthrough = instructionGuide.getWalkthrough(target);
          if (walkthrough) {
            const completionPercent = Math.round((progress.completedSteps.length / walkthrough.totalSteps) * 100);
            return `📊 **${walkthrough.title} Progress:**\\n\\n` +
                   `✅ Completed: ${progress.completedSteps.length}/${walkthrough.totalSteps} steps (${completionPercent}%)\\n` +
                   `📅 Started: ${progress.startedAt.toLocaleDateString()}\\n` +
                   `🕒 Last accessed: ${progress.lastAccessed.toLocaleDateString()}\\n` +
                   `🎯 Status: ${progress.isCompleted ? 'Completed' : 'In Progress'}`;
          }
        }
        return `No progress found for "${target}". Start with: walkthrough ${target}`;

      case 'complete_step':
        if (!target || !content) return "Usage: walkthrough-complete <walkthrough> <step_id>";
        const nextStep = instructionGuide.completeStep(target, content);
        if (nextStep) {
          return `✅ **Step completed!**\\n\\n` +
                 instructionGuide.formatStepInstructions(target, nextStep);
        } else {
          const walkthrough = instructionGuide.getWalkthrough(target);
          if (walkthrough) {
            return `🎉 **Congratulations!** You've completed the ${walkthrough.title} walkthrough!\\n\\n` +
                   `🏆 **Achievement Unlocked:** ${walkthrough.title}\\n` +
                   `⏱️ **Time invested:** ${walkthrough.estimatedTime} minutes\\n\\n` +
                   `🚀 **Next steps:** Try another walkthrough or start building your own features!`;
          }
          return "Walkthrough or step not found.";
        }

      case 'reset_walkthrough':
        if (!target) return "Please specify a walkthrough name.";
        const resetSuccess = instructionGuide.resetProgress(target);
        if (resetSuccess) {
          return `🔄 **Reset completed!** The "${target}" walkthrough progress has been cleared.\\n\\n` +
                 `You can start fresh with: walkthrough ${target}`;
        }
        return `Failed to reset "${target}" walkthrough.`;

      default:
        return "Unknown walkthrough command.";
    }
  }

  private async executeTeamOperation(command: ParsedCommand, _onFileSelect?: (path: string) => void): Promise<string> {
    const { action, content, teamMember, currentFile } = command;

    switch (action) {
      case 'show_team':
        const members = aiTeam.getTeamMembers();
        let teamInfo = '🤖 **Meet the AI Development Team:**\n\n';
        members.forEach(member => {
          teamInfo += `${member.avatar} **${member.name}** - ${member.specialty}\n`;
          teamInfo += `   ${member.description}\n\n`;
        });
        teamInfo += 'You can talk to any team member by name or just describe what you need help with!';
        return teamInfo;

      case 'team_chat':
        return await aiTeam.getTeamAdviceText(content || '', { currentFile });

      case 'team_advice':
        return await aiTeam.getTeamAdviceText(content || '', { currentFile });

      case 'code_review':
        if (currentFile) {
          return await aiTeam.reviewCurrentFile(currentFile);
        } else {
          return "Please open a file first, then ask for a code review.";
        }

      case 'project_planning':
        const project = aiTeam.analyzeProject();
        const suggestions = aiTeam.generateProjectSuggestions();
        
        let planningResponse = `📋 **Project Planning for ${project.name}**\n\n`;
        planningResponse += `**Project Type:** ${project.type}\n`;
        if (project.framework) planningResponse += `**Framework:** ${project.framework}\n`;
        if (project.language) planningResponse += `**Language:** ${project.language}\n\n`;
        
        planningResponse += `**Suggested Next Steps:**\n`;
        suggestions.forEach((suggestion, index) => {
          planningResponse += `${index + 1}. ${suggestion}\n`;
        });
        
        planningResponse += `\n💡 Ask the team: "help me with [specific task]" for detailed guidance!`;
        return planningResponse;

      case 'collaborative_dev':
        const context = { currentFile };
        return await aiTeam.getTeamAdviceText(
          `Let's work together to build this: ${content}`, 
          context
        );

      case 'specific_member':
        if (teamMember) {
          const member = aiTeam.getTeamMembers().find(m => 
            m.name.toLowerCase() === teamMember
          );
          if (member) {
            return await aiTeam.getTeamAdviceText(content || '', { 
              currentFile,
              urgency: 'medium' 
            });
          }
        }
        return await aiTeam.getTeamAdviceText(content || '', { currentFile });

      case 'execute_action':
        if (command.target) {
          return await aiTeam.executeAction(command.target);
        }
        return "Please specify an action ID to execute.";

      default:
        return await aiTeam.getTeamAdviceText(content || '', { currentFile });
    }
  }

  private async executeFileOperation(command: ParsedCommand, onFileSelect?: (path: string) => void): Promise<string> {
    const { action, target } = command;

    switch (action) {
      case 'create_file':
        if (!target) return "Please specify a filename to create.";
        try {
          fileManager.createNewFile(target);
          if (onFileSelect) {
            setTimeout(() => onFileSelect(`/${target}`), 100);
          }
          return `Created file: ${target}`;
        } catch (error) {
          return `Failed to create file: ${error}`;
        }

      case 'open_file':
        if (!target) return "Please specify a filename to open.";
        const file = fileManager.getFile(`/${target}`) || fileManager.getFile(target);
        if (file) {
          if (onFileSelect) onFileSelect(file.path);
          return `Opened file: ${target}`;
        } else {
          // Try to find similar files
          const allFiles = Array.from(fileManager.files.keys());
          const similarFiles = allFiles.filter(path => 
            path.toLowerCase().includes(target.toLowerCase())
          );
          if (similarFiles.length > 0) {
            return `File not found. Did you mean: ${similarFiles.join(', ')}?`;
          }
          return `File not found: ${target}`;
        }

      case 'delete_file':
        if (!target) return "Please specify a filename to delete.";
        const fileToDelete = fileManager.getFile(`/${target}`) || fileManager.getFile(target);
        if (fileToDelete) {
          fileManager.deleteFile(fileToDelete.path);
          return `Deleted file: ${target}`;
        }
        return `File not found: ${target}`;

      case 'list_files':
        const tree = fileManager.getFileTree();
        if (tree.length === 0) {
          return "No files in the project yet.";
        }
        const fileList = this.flattenFileTree(tree).join('\n');
        return `Files in project:\n${fileList}`;

      case 'export_file':
        if (!target) return "Please specify a filename to export.";
        const fileToExport = fileManager.getFile(`/${target}`) || fileManager.getFile(target);
        if (fileToExport) {
          if (fileToExport.type === 'file') {
            fileManager.exportFile(fileToExport.path);
            return `Exported file: ${target}`;
          } else {
            fileManager.exportDirectory(fileToExport.path);
            return `Exported directory: ${target}`;
          }
        }
        return `File not found: ${target}`;

      default:
        return "Unknown file operation.";
    }
  }

  private executeProjectOperation(command: ParsedCommand): string {
    const { action } = command;

    switch (action) {
      case 'project_info':
        const packageJson = fileManager.getFile('/package.json');
        if (packageJson && packageJson.content) {
          try {
            const pkg = JSON.parse(packageJson.content);
            return `Project: ${pkg.name || 'Unnamed Project'}\nVersion: ${pkg.version || 'N/A'}\nDescription: ${pkg.description || 'No description'}`;
          } catch {
            return "This appears to be a FreddyMac IDE project with custom files.";
          }
        }
        return "This is a FreddyMac IDE project. You can create files, write code, and use AI assistance.";

      case 'project_structure':
        const tree = fileManager.getFileTree();
        return `Project Structure:\n${this.renderFileTree(tree)}`;

      default:
        return "Unknown project operation.";
    }
  }

  private flattenFileTree(tree: any[], prefix = ''): string[] {
    const result: string[] = [];
    for (const node of tree) {
      result.push(`${prefix}${node.name}`);
      if (node.children && node.children.length > 0) {
        result.push(...this.flattenFileTree(node.children, `${prefix}  `));
      }
    }
    return result;
  }

  private renderFileTree(tree: any[], depth = 0): string {
    const indent = '  '.repeat(depth);
    return tree.map(node => {
      const icon = node.type === 'directory' ? '📁' : '📄';
      let result = `${indent}${icon} ${node.name}`;
      if (node.children && node.children.length > 0) {
        result += '\n' + this.renderFileTree(node.children, depth + 1);
      }
      return result;
    }).join('\n');
  }

  private getHelpMessage(): string {
    return `FreddyMac IDE - AI Team Collaboration Platform

🤖 **Meet Your AI Team:**
  • "meet the team" / "who is the team" - Meet your AI development team
  • "talk to Alex" - Full-stack development help
  • "ask Sarah" - Frontend/UI expertise  
  • "talk to Marcus" - Backend/API development
  • "get Lisa" - Code review and quality
  • "ask David" - Project planning and management

📁 **File Operations:**
  • "create file app.js" - Create new files with smart templates
  • "open file README.md" - Open existing files
  • "review this file" - Get AI code review of current file
  • "list files" - Show all project files

🛠️ **Development Collaboration:**
  • "plan this project" - Get project roadmap and suggestions
  • "help me build a todo app" - Collaborative development
  • "review the code" - Get expert code review
  • "organize this project" - Structure and planning help

💬 **Natural Conversation:**
  Just talk naturally! The AI team understands:
  • "Can you help me fix this bug?"
  • "Let's build a React component"
  • "I need help with authentication"
  • "What should I do next?"

The team automatically analyzes your project context and assigns the right specialist to help you!`;
  }
}

export const nlParser = new NaturalLanguageParser();