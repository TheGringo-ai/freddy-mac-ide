import { fileManager, type FileNode } from './fileUtils';
import { multiAI } from './multiAIProviders';

export interface AITeamMember {
  name: string;
  specialty: string;
  description: string;
  avatar: string;
  preferredProviders: string[];
  specialties: string[];
  personality: string;
}

export interface ProjectContext {
  name: string;
  type: 'web-app' | 'mobile-app' | 'api' | 'library' | 'full-stack' | 'other';
  framework?: string;
  language?: string;
  description?: string;
  currentFile?: string;
}

export interface AIAction {
  id: string;
  type: 'command' | 'fix' | 'test' | 'install' | 'create' | 'modify';
  title: string;
  description: string;
  command?: string;
  filePath?: string;
  content?: string;
  diff?: string;
  autoExecute?: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AIResponse {
  text: string;
  actions?: AIAction[];
  member: AITeamMember;
  provider: string;
}

export class AITeam {
  private teamMembers: AITeamMember[] = [
    {
      name: 'Alex',
      specialty: 'Full-Stack Architect',
      description: 'Expert in web development, APIs, databases, and system architecture',
      avatar: '👨‍💻',
      preferredProviders: ['gpt-4', 'claude-3.5', 'qwen-smart'],
      specialties: ['architecture', 'complex-coding', 'optimization'],
      personality: 'Strategic thinker who focuses on scalable solutions and best practices'
    },
    {
      name: 'Sarah',
      specialty: 'Frontend Specialist',
      description: 'React, Vue, Angular expert with strong UX/UI design skills',
      avatar: '👩‍💻',
      preferredProviders: ['gpt-3.5', 'qwen-coder', 'gemini'],
      specialties: ['frontend', 'ui-design', 'user-experience'],
      personality: 'Creative and user-focused, always thinking about the end-user experience'
    },
    {
      name: 'Marcus',
      specialty: 'Backend Engineer',
      description: 'Node.js, Python, databases, cloud infrastructure, and DevOps',
      avatar: '🧑‍💻',
      preferredProviders: ['gpt-4', 'qwen-smart', 'claude-3.5'],
      specialties: ['backend', 'databases', 'devops', 'apis'],
      personality: 'Performance-focused engineer who loves optimization and scalability'
    },
    {
      name: 'Lisa',
      specialty: 'Code Reviewer',
      description: 'Code quality, security, performance optimization, and best practices',
      avatar: '👩‍🔬',
      preferredProviders: ['claude-3.5', 'gpt-4', 'qwen-coder'],
      specialties: ['code-review', 'security', 'best-practices', 'analysis'],
      personality: 'Detail-oriented perfectionist who ensures code quality and security'
    },
    {
      name: 'Grok',
      specialty: 'Creative Problem Solver',
      description: 'Innovative solutions, out-of-the-box thinking, and creative coding approaches',
      avatar: '🚀',
      preferredProviders: ['grok', 'gpt-4', 'gemini'],
      specialties: ['creative-coding', 'innovation', 'problem-solving'],
      personality: 'Witty and unconventional thinker who finds creative solutions to complex problems'
    },
    {
      name: 'David',
      specialty: 'Project Manager',
      description: 'Project planning, task organization, timeline management',
      avatar: '📋',
      preferredProviders: ['gpt-3.5', 'gemini', 'claude-3.5'],
      specialties: ['planning', 'organization', 'documentation'],
      personality: 'Organized leader who keeps projects on track and ensures clear communication'
    }
  ];

  private currentProject: ProjectContext | null = null;

  getTeamMembers(): AITeamMember[] {
    return this.teamMembers;
  }

  setProjectContext(project: ProjectContext): void {
    this.currentProject = project;
  }

  getProjectContext(): ProjectContext | null {
    return this.currentProject;
  }

  analyzeProject(): ProjectContext {
    const files = fileManager.getFileTree();
    const packageJson = fileManager.getFile('/package.json');
    
    let project: ProjectContext = {
      name: 'FreddyMac Project',
      type: 'other'
    };

    // Analyze package.json if it exists
    if (packageJson && packageJson.content) {
      try {
        const pkg = JSON.parse(packageJson.content);
        project.name = pkg.name || 'FreddyMac Project';
        project.description = pkg.description;

        // Determine project type from dependencies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.react || deps.vue || deps.angular) {
          project.type = 'web-app';
          if (deps.react) project.framework = 'React';
          if (deps.vue) project.framework = 'Vue';
          if (deps.angular) project.framework = 'Angular';
        } else if (deps.express || deps.fastify || deps.koa) {
          project.type = 'api';
          project.framework = 'Node.js';
        } else if (deps['react-native']) {
          project.type = 'mobile-app';
          project.framework = 'React Native';
        }
      } catch (error) {
        console.warn('Could not parse package.json');
      }
    }

    // Analyze file structure
    const fileExtensions = this.getFileExtensions(files);
    if (fileExtensions.includes('tsx') || fileExtensions.includes('jsx')) {
      project.language = 'TypeScript/JavaScript';
      if (!project.framework) project.framework = 'React';
    } else if (fileExtensions.includes('js') || fileExtensions.includes('ts')) {
      project.language = 'JavaScript/TypeScript';
    } else if (fileExtensions.includes('py')) {
      project.language = 'Python';
    }

    this.currentProject = project;
    return project;
  }

  private getFileExtensions(files: FileNode[]): string[] {
    const extensions: string[] = [];
    
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          const ext = node.name.split('.').pop()?.toLowerCase();
          if (ext && !extensions.includes(ext)) {
            extensions.push(ext);
          }
        } else if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(files);
    return extensions;
  }

  async getTeamAdvice(query: string, context?: {
    currentFile?: string;
    selectedText?: string;
    urgency?: 'low' | 'medium' | 'high';
  }): Promise<AIResponse> {
    const project = this.currentProject || this.analyzeProject();
    
    // Determine which team member should respond
    const member = this.selectBestTeamMember(query, context);
    
    // Build context for the AI
    const aiContext = this.buildAgenticAIContext(query, project, context, member);
    
    try {
      // Select best AI provider for this team member and task
      const provider = multiAI.selectBestProvider(query, member.specialties);
      
      // Call the selected AI provider
      const aiResponse = await multiAI.callAI(provider.id, aiContext);
      
      // Parse the response for actions
      const parsedResponse = this.parseAIResponse(aiResponse, member, provider);
      
      return parsedResponse;
    } catch (error) {
      return {
        text: `${member.avatar} **${member.name}** (${member.specialty}):

${member.personality}

I'm ready to help with: "${query}"

However, I'm having trouble connecting to the AI providers right now.

**Available options:**
- Set API keys: Use commands like \`set-openai-key\`, \`set-claude-key\`, etc.
- Use local Ollama: Make sure Ollama is running (\`ollama serve\`)

*[Error: ${error}]*`,
        member,
        provider: 'none',
        actions: []
      };
    }
  }

  // Legacy method for backward compatibility
  async getTeamAdviceText(query: string, context?: {
    currentFile?: string;
    selectedText?: string;
    urgency?: 'low' | 'medium' | 'high';
  }): Promise<string> {
    const response = await this.getTeamAdvice(query, context);
    return this.formatAIResponse(response);
  }

  setAPIKey(provider: string, key: string): void {
    const credentials: any = {};
    credentials[provider] = key;
    multiAI.setCredentials(credentials);
  }

  getAvailableProviders() {
    return multiAI.getAvailableProviders();
  }

  private selectBestTeamMember(query: string, _context?: any): AITeamMember {
    const lowerQuery = query.toLowerCase();
    
    // Code review requests
    if (lowerQuery.includes('review') || lowerQuery.includes('check') || 
        lowerQuery.includes('quality') || lowerQuery.includes('optimize')) {
      return this.teamMembers.find(m => m.name === 'Lisa')!;
    }
    
    // Frontend specific
    if (lowerQuery.includes('ui') || lowerQuery.includes('component') || 
        lowerQuery.includes('react') || lowerQuery.includes('frontend')) {
      return this.teamMembers.find(m => m.name === 'Sarah')!;
    }
    
    // Backend specific
    if (lowerQuery.includes('api') || lowerQuery.includes('database') || 
        lowerQuery.includes('server') || lowerQuery.includes('backend')) {
      return this.teamMembers.find(m => m.name === 'Marcus')!;
    }
    
    // Project management
    if (lowerQuery.includes('plan') || lowerQuery.includes('organize') || 
        lowerQuery.includes('timeline') || lowerQuery.includes('project')) {
      return this.teamMembers.find(m => m.name === 'David')!;
    }
    
    // Default to full-stack developer
    return this.teamMembers.find(m => m.name === 'Alex')!;
  }

  private buildAgenticAIContext(query: string, project: ProjectContext, context?: any, member?: AITeamMember): string {
    const selectedMember = member || this.selectBestTeamMember(query, context);
    
    let prompt = `You are ${selectedMember.name}, a ${selectedMember.specialty} on the FreddyMac development team. You are expert in ${selectedMember.description.toLowerCase()}.

PROJECT CONTEXT:
- Project: ${project.name} (${project.type})`;
    
    if (project.framework) prompt += `\n- Framework: ${project.framework}`;
    if (project.language) prompt += `\n- Language: ${project.language}`;
    if (project.description) prompt += `\n- Description: ${project.description}`;
    
    // Add current file context if available
    if (context?.currentFile) {
      const file = fileManager.getFile(context.currentFile);
      if (file && file.content) {
        prompt += `\n\nCURRENT FILE: ${context.currentFile}`;
        if (context.selectedText) {
          prompt += `\n\nSelected code:\n\`\`\`\n${context.selectedText}\n\`\`\``;
        } else if (file.content.length < 2000) {
          prompt += `\n\nFile content:\n\`\`\`\n${file.content}\n\`\`\``;
        } else {
          const lines = file.content.split('\n').slice(0, 30);
          prompt += `\n\nFile content (first 30 lines):\n\`\`\`\n${lines.join('\n')}\n...\n\`\`\``;
        }
      }
    }
    
    // Add simplified project structure
    const fileTree = fileManager.getFileTree();
    if (fileTree.length > 0) {
      prompt += `\n\nPROJECT STRUCTURE:\n${this.renderSimpleFileTree(fileTree)}`;
    }
    
    // Add the user's request with agentic instructions
    prompt += `\n\nUSER REQUEST: ${query}

IMPORTANT INSTRUCTIONS:
You can suggest actionable commands and fixes! When providing advice, include structured actions in this format:

ACTION_START
{
  "type": "command|fix|test|install|create|modify",
  "title": "Brief action title",
  "description": "What this action does",
  "command": "shell command to run (if applicable)",
  "filePath": "file to modify (if applicable)", 
  "content": "new file content or code fix (if applicable)",
  "priority": "low|medium|high",
  "autoExecute": false
}
ACTION_END

You can include multiple actions. Examples:
- For bugs: Suggest fixes with actual code changes
- For missing dependencies: Suggest npm install commands  
- For optimization: Suggest specific code improvements
- For testing: Suggest test commands to run

Please respond as ${selectedMember.name} would, providing specific, actionable advice with executable solutions when possible.`;
    
    return prompt;
  }


  private renderSimpleFileTree(tree: FileNode[], depth = 0, maxDepth = 2): string {
    if (depth > maxDepth) return '';
    
    const indent = '  '.repeat(depth);
    return tree.map(node => {
      const icon = node.type === 'directory' ? '📁' : '📄';
      let result = `${indent}${icon} ${node.name}`;
      if (node.children && node.children.length > 0 && depth < maxDepth) {
        result += '\n' + this.renderSimpleFileTree(node.children, depth + 1, maxDepth);
      }
      return result;
    }).join('\n');
  }

  generateProjectSuggestions(): string[] {
    const project = this.currentProject || this.analyzeProject();
    const suggestions: string[] = [];
    
    if (project.type === 'web-app') {
      suggestions.push(
        "Set up authentication system",
        "Add responsive design components",
        "Implement state management",
        "Create API integration layer",
        "Add testing framework"
      );
    } else if (project.type === 'api') {
      suggestions.push(
        "Implement authentication middleware",
        "Add input validation",
        "Set up database models",
        "Create API documentation",
        "Add error handling"
      );
    } else {
      suggestions.push(
        "Create project structure",
        "Set up build system",
        "Add configuration management",
        "Implement core functionality",
        "Add documentation"
      );
    }
    
    return suggestions;
  }

  async reviewCurrentFile(filePath: string): Promise<string> {
    const file = fileManager.getFile(filePath);
    if (!file || !file.content) {
      return "No file selected or file is empty.";
    }

    const reviewer = this.teamMembers.find(m => m.name === 'Lisa')!;
    const project = this.currentProject || this.analyzeProject();

    const reviewPrompt = `You are Lisa, a senior code reviewer. Please review this ${this.getFileType(filePath)} file:

File: ${filePath}
Project: ${project.name} (${project.type})
${project.framework ? `Framework: ${project.framework}` : ''}

Code to review:
\`\`\`
${file.content}
\`\`\`

Please provide a thorough code review including:
1. Code quality and structure
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Best practices recommendations
6. Specific suggestions for improvement

Keep your review professional but friendly, and provide actionable feedback.`;

    try {
      // Select best AI provider for code review
      const provider = multiAI.selectBestProvider('code review', reviewer.specialties);
      const aiReview = await multiAI.callAI(provider.id, reviewPrompt);
      
      return `${reviewer.avatar} **${reviewer.name}** reviewing ${filePath}:

**File Analysis:**
- File type: ${this.getFileType(filePath)}
- Lines of code: ${file.content.split('\n').length}
- Size: ${file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown'}

**Code Review:**

${aiReview}

*[Review completed using ${provider.name}]*`;
    } catch (error) {
      return `${reviewer.avatar} **${reviewer.name}** reviewing ${filePath}:

**File Analysis:**
- File type: ${this.getFileType(filePath)}
- Lines of code: ${file.content.split('\n').length}
- Size: ${file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown'}

I'm ready to review your code, but I'm having trouble connecting to the AI models right now.

*[Error: ${error}]*`;
    }
  }

  private getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'React TypeScript',
      'jsx': 'React JavaScript',
      'css': 'Stylesheet',
      'html': 'HTML Document',
      'json': 'JSON Data',
      'md': 'Markdown',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C'
    };
    return typeMap[ext || ''] || 'Unknown';
  }

  private parseAIResponse(response: string, member: AITeamMember, provider: any): AIResponse {
    const actions: AIAction[] = [];
    let text = response;

    // Extract actions from the response
    const actionRegex = /ACTION_START\s*(\{[\s\S]*?\})\s*ACTION_END/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
      try {
        const actionJson = JSON.parse(match[1]);
        const action: AIAction = {
          id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          type: actionJson.type || 'command',
          title: actionJson.title || 'Unnamed Action',
          description: actionJson.description || 'No description provided',
          command: actionJson.command,
          filePath: actionJson.filePath,
          content: actionJson.content,
          diff: actionJson.diff,
          autoExecute: actionJson.autoExecute || false,
          priority: actionJson.priority || 'medium'
        };
        actions.push(action);

        // Remove the action block from the text
        text = text.replace(match[0], '');
      } catch (error) {
        console.warn('Failed to parse AI action:', error);
      }
    }

    // Clean up the text
    text = text.trim();

    // Format the response
    const formattedText = `${member.avatar} **${member.name}** (${member.specialty}):

${text}

*[Response powered by ${provider.name} - ${member.personality}]*`;

    return {
      text: formattedText,
      actions,
      member,
      provider: provider.name
    };
  }

  private formatAIResponse(response: AIResponse): string {
    let formatted = response.text;

    if (response.actions && response.actions.length > 0) {
      formatted += '\n\n🚀 **Suggested Actions:**\n';
      response.actions.forEach((action, index) => {
        const priorityEmoji = action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢';
        formatted += `\n${index + 1}. ${priorityEmoji} **${action.title}**`;
        formatted += `\n   ${action.description}`;
        
        if (action.command) {
          formatted += `\n   💻 Command: \`${action.command}\``;
        }
        if (action.filePath) {
          formatted += `\n   📁 File: ${action.filePath}`;
        }
        
        formatted += `\n   🎯 Type: ${action.type}`;
        formatted += `\n   🔧 Execute: \`ai-action ${action.id}\`\n`;
      });
      
      formatted += '\n💡 Run `ai-action <action-id>` to execute any suggested action!';
    }

    return formatted;
  }

  async executeAction(actionId: string): Promise<string> {
    // This method will be called when user runs `ai-action <id>`
    // For now, return a placeholder - will be implemented with actual execution logic
    return `Action ${actionId} queued for execution. This feature is being implemented...`;
  }
}

export const aiTeam = new AITeam();