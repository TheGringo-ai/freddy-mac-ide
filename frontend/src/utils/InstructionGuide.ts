// ===============================================================
// FreddyMac IDE - Instructional Walkthrough System
// Alex's Architecture: Making complex development workflows accessible
// ===============================================================

import { type AIAction } from './aiTeam';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  expectedOutcome: string;
  estimatedTime: number; // in minutes
  action: AIAction;
  prerequisites?: string[];
  troubleshooting?: string[];
}

export interface Walkthrough {
  id: string;
  title: string;
  description: string;
  totalSteps: number;
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'onboarding' | 'development' | 'debugging';
  steps: WalkthroughStep[];
}

export interface WalkthroughProgress {
  walkthroughId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: Date;
  lastAccessed: Date;
  isCompleted: boolean;
}

// ===============================================================
// ALEX'S IMPLEMENTATION: Instructional Guide System
// ===============================================================

export class InstructionGuide {
  private static readonly STORAGE_KEY = 'freddymac_walkthrough_progress';
  private walkthroughs: Map<string, Walkthrough> = new Map();

  constructor() {
    this.initializeWalkthroughs();
  }

  private initializeWalkthroughs(): void {
    // ===============================================================
    // WALKTHROUGH 1: FreddyMac IDE Onboarding
    // ===============================================================
    const onboardingWalkthrough: Walkthrough = {
      id: 'onboarding',
      title: 'FreddyMac IDE Onboarding',
      description: 'Get started with FreddyMac IDE and learn the AI-powered development workflow',
      totalSteps: 5,
      estimatedTime: 15,
      difficulty: 'beginner',
      category: 'onboarding',
      steps: [
        {
          id: 'setup_workspace',
          title: 'Set up your workspace',
          description: 'Configure the IDE for optimal development experience',
          expectedOutcome: 'FreddyMac IDE is configured with proper settings',
          estimatedTime: 3,
          action: {
            id: 'onboarding_step_1',
            type: 'create',
            title: 'Create initial project structure',
            description: 'Set up the basic project directories and configuration',
            filePath: 'project-config.md',
            content: '# FreddyMac IDE Configuration\\n\\nWelcome to your development environment!',
            priority: 'high',
            autoExecute: false
          }
        },
        {
          id: 'explore_terminal',
          title: 'Explore the AI Terminal',
          description: 'Learn natural language commands and agent interaction',
          expectedOutcome: 'Understanding of >> commands and AI team members',
          estimatedTime: 4,
          action: {
            id: 'onboarding_step_2',
            type: 'command',
            title: 'Try natural language commands',
            description: 'Test the AI terminal with natural language',
            command: 'echo "Try typing: >> help me create a component"',
            priority: 'medium',
            autoExecute: false
          },
          troubleshooting: ['Make sure to use >> prefix for agentic commands', 'Check that AI providers are configured']
        },
        {
          id: 'file_management',
          title: 'Master file operations',
          description: 'Learn drag & drop, file creation, and project organization',
          expectedOutcome: 'Comfortable with file explorer and operations',
          estimatedTime: 3,
          action: {
            id: 'onboarding_step_3',
            type: 'create',
            title: 'Create sample files',
            description: 'Practice file creation with smart templates',
            filePath: 'examples/sample.js',
            content: '// Sample JavaScript file\\nconsole.log("Hello FreddyMac IDE!");',
            priority: 'medium',
            autoExecute: false
          }
        },
        {
          id: 'semantic_search',
          title: 'Enable semantic search',
          description: 'Index your project for AI-powered code search',
          expectedOutcome: 'Project indexed for semantic search capabilities',
          estimatedTime: 2,
          action: {
            id: 'onboarding_step_4',
            type: 'command',
            title: 'Index project for search',
            description: 'Build semantic search index with Ollama',
            command: 'echo "Run: index"',
            priority: 'high',
            autoExecute: false
          }
        },
        {
          id: 'ai_collaboration',
          title: 'Collaborate with AI team',
          description: 'Learn to work with specialized AI team members',
          expectedOutcome: 'Understanding of Alex, Sarah, Marcus, Lisa, Grok, and David',
          estimatedTime: 3,
          action: {
            id: 'onboarding_step_5',
            type: 'command',
            title: 'Meet the AI team',
            description: 'Interact with different AI specialists',
            command: 'echo "Try: >> Sarah, help me design a component"',
            priority: 'medium',
            autoExecute: false
          }
        }
      ]
    };

    // ===============================================================
    // WALKTHROUGH 2: Adding a New Feature (As specifically requested)
    // ===============================================================
    const newFeatureWalkthrough: Walkthrough = {
      id: 'new-feature',
      title: 'Adding a New Feature',
      description: 'Learn the complete workflow for adding a new feature to your project',
      totalSteps: 4,
      estimatedTime: 20,
      difficulty: 'intermediate',
      category: 'development',
      steps: [
        {
          id: 'install_library',
          title: 'Install required dependencies',
          description: 'Install a utility library that will help with the new feature',
          expectedOutcome: 'Lodash library installed and added to package.json dependencies',
          estimatedTime: 3,
          action: {
            id: 'newfeature_step_1',
            type: 'install',
            title: 'Install lodash utility library',
            description: 'Add lodash for utility functions in the new feature',
            command: 'npm install lodash @types/lodash',
            priority: 'high',
            autoExecute: false
          }
        },
        {
          id: 'create_component',
          title: 'Create the main component file',
          description: 'Build the core component for the new feature',
          expectedOutcome: 'UserProfileCard component created with TypeScript support',
          estimatedTime: 8,
          action: {
            id: 'newfeature_step_2',
            type: 'create',
            title: 'Create UserProfileCard component',
            description: 'Build a reusable user profile card component',
            filePath: 'src/components/UserProfileCard.tsx',
            content: `import React from 'react';
import { debounce } from 'lodash';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserProfileCardProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ 
  user, 
  onUserUpdate 
}) => {
  const debouncedUpdate = React.useCallback(
    debounce((updatedUser: User) => {
      onUserUpdate?.(updatedUser);
    }, 300),
    [onUserUpdate]
  );

  return (
    <div className="user-profile-card">
      <div className="user-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <div className="avatar-placeholder">{user.name.charAt(0)}</div>
        )}
      </div>
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    </div>
  );
};

export default UserProfileCard;`,
            priority: 'high',
            autoExecute: false
          },
          prerequisites: ['install_library']
        },
        {
          id: 'update_router',
          title: 'Update router configuration',
          description: 'Add the new component to your application routing',
          expectedOutcome: 'Router updated to include the new UserProfileCard route',
          estimatedTime: 5,
          action: {
            id: 'newfeature_step_3',
            type: 'modify',
            title: 'Add UserProfileCard route',
            description: 'Update App.tsx to include the new component route',
            filePath: 'src/App.tsx',
            diff: `--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,6 +1,8 @@
 import React from 'react';
 import IDE from './components/IDE';
+import UserProfileCard from './components/UserProfileCard';
 import './App.css';
 
+// Example user data for the new component
+const sampleUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
+
 function App() {
   return (
     <div className="App">
       <header className="App-header">
+        <UserProfileCard user={sampleUser} />
         <IDE />
       </header>
     </div>
   );
 }`,
            priority: 'medium',
            autoExecute: false
          },
          prerequisites: ['create_component']
        },
        {
          id: 'test_feature',
          title: 'Test the new feature',
          description: 'Verify the new component works correctly in the application',
          expectedOutcome: 'UserProfileCard displays correctly and functions as expected',
          estimatedTime: 4,
          action: {
            id: 'newfeature_step_4',
            type: 'test',
            title: 'Run development server',
            description: 'Start the dev server to test the new component',
            command: 'npm run dev',
            priority: 'medium',
            autoExecute: false
          },
          prerequisites: ['update_router']
        }
      ]
    };

    // ===============================================================
    // WALKTHROUGH 3: Bug Fix Workflow
    // ===============================================================
    const bugFixWalkthrough: Walkthrough = {
      id: 'bug-fix',
      title: 'Debugging and Fixing Issues',
      description: 'Learn systematic approaches to identifying and fixing bugs',
      totalSteps: 5,
      estimatedTime: 25,
      difficulty: 'intermediate',
      category: 'debugging',
      steps: [
        {
          id: 'identify_issue',
          title: 'Identify the issue',
          description: 'Use console logs and error messages to understand the problem',
          expectedOutcome: 'Clear understanding of the bug and its symptoms',
          estimatedTime: 5,
          action: {
            id: 'bugfix_step_1',
            type: 'command',
            title: 'Check console for errors',
            description: 'Open browser DevTools to examine console output',
            command: 'echo "Open DevTools with F12 and check Console tab"',
            priority: 'high',
            autoExecute: false
          }
        },
        {
          id: 'reproduce_bug',
          title: 'Reproduce the bug',
          description: 'Create reliable steps to reproduce the issue',
          expectedOutcome: 'Consistent reproduction of the bug behavior',
          estimatedTime: 4,
          action: {
            id: 'bugfix_step_2',
            type: 'create',
            title: 'Document reproduction steps',
            description: 'Create a file documenting how to reproduce the issue',
            filePath: 'bug-reproduction.md',
            content: '# Bug Reproduction Steps\\n\\n1. Step 1:\\n2. Step 2:\\n3. Expected behavior:\\n4. Actual behavior:',
            priority: 'medium',
            autoExecute: false
          }
        },
        {
          id: 'debug_code',
          title: 'Debug the code',
          description: 'Use debugging tools and techniques to isolate the issue',
          expectedOutcome: 'Location and cause of the bug identified',
          estimatedTime: 8,
          action: {
            id: 'bugfix_step_3',
            type: 'command',
            title: 'Add debug logging',
            description: 'Insert console.log statements to trace execution',
            command: 'echo ">> Lisa, help me add debugging to this function"',
            priority: 'high',
            autoExecute: false
          }
        },
        {
          id: 'implement_fix',
          title: 'Implement the fix',
          description: 'Apply the solution to resolve the identified issue',
          expectedOutcome: 'Bug fixed with proper code changes',
          estimatedTime: 6,
          action: {
            id: 'bugfix_step_4',
            type: 'modify',
            title: 'Apply bug fix',
            description: 'Implement the code changes to resolve the issue',
            filePath: 'src/buggy-file.ts',
            diff: '// This will be generated based on the specific bug being fixed',
            priority: 'high',
            autoExecute: false
          },
          prerequisites: ['debug_code']
        },
        {
          id: 'verify_fix',
          title: 'Verify the fix works',
          description: 'Test the fix and ensure the bug is resolved without introducing new issues',
          expectedOutcome: 'Bug resolved and no regression introduced',
          estimatedTime: 2,
          action: {
            id: 'bugfix_step_5',
            type: 'test',
            title: 'Test the fix',
            description: 'Run tests and manual verification',
            command: 'npm test && npm run build',
            priority: 'high',
            autoExecute: false
          },
          prerequisites: ['implement_fix']
        }
      ]
    };

    // Store all walkthroughs
    this.walkthroughs.set('onboarding', onboardingWalkthrough);
    this.walkthroughs.set('new-feature', newFeatureWalkthrough);
    this.walkthroughs.set('bug-fix', bugFixWalkthrough);
  }

  // ===============================================================
  // PUBLIC API METHODS
  // ===============================================================

  getAvailableWalkthroughs(): Walkthrough[] {
    return Array.from(this.walkthroughs.values());
  }

  getWalkthrough(id: string): Walkthrough | undefined {
    return this.walkthroughs.get(id);
  }

  startWalkthrough(id: string): WalkthroughStep | null {
    const walkthrough = this.walkthroughs.get(id);
    if (!walkthrough) return null;

    const progress: WalkthroughProgress = {
      walkthroughId: id,
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date(),
      lastAccessed: new Date(),
      isCompleted: false
    };

    this.saveProgress(progress);
    return walkthrough.steps[0];
  }

  getCurrentStep(walkthroughId: string): WalkthroughStep | null {
    const walkthrough = this.walkthroughs.get(walkthroughId);
    const progress = this.loadProgress(walkthroughId);
    
    if (!walkthrough || !progress || progress.isCompleted) return null;
    
    return walkthrough.steps[progress.currentStep] || null;
  }

  completeStep(walkthroughId: string, stepId: string): WalkthroughStep | null {
    const walkthrough = this.walkthroughs.get(walkthroughId);
    const progress = this.loadProgress(walkthroughId);
    
    if (!walkthrough || !progress) return null;

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
      progress.lastAccessed = new Date();
      
      // Advance to next step
      const currentStepIndex = walkthrough.steps.findIndex(s => s.id === stepId);
      if (currentStepIndex >= 0 && currentStepIndex + 1 < walkthrough.steps.length) {
        progress.currentStep = currentStepIndex + 1;
      } else {
        progress.isCompleted = true;
      }
      
      this.saveProgress(progress);
      
      // Return next step or null if completed
      return progress.isCompleted ? null : walkthrough.steps[progress.currentStep];
    }
    
    return null;
  }

  getProgress(walkthroughId: string): WalkthroughProgress | null {
    return this.loadProgress(walkthroughId);
  }

  resetProgress(walkthroughId: string): boolean {
    try {
      const stored = localStorage.getItem(this.constructor.name + '_' + InstructionGuide.STORAGE_KEY);
      if (stored) {
        const allProgress = JSON.parse(stored);
        delete allProgress[walkthroughId];
        localStorage.setItem(this.constructor.name + '_' + InstructionGuide.STORAGE_KEY, JSON.stringify(allProgress));
      }
      return true;
    } catch {
      return false;
    }
  }

  // ===============================================================
  // PRIVATE HELPER METHODS
  // ===============================================================

  private saveProgress(progress: WalkthroughProgress): void {
    try {
      const stored = localStorage.getItem(this.constructor.name + '_' + InstructionGuide.STORAGE_KEY);
      const allProgress = stored ? JSON.parse(stored) : {};
      allProgress[progress.walkthroughId] = progress;
      localStorage.setItem(this.constructor.name + '_' + InstructionGuide.STORAGE_KEY, JSON.stringify(allProgress));
    } catch (error) {
      console.warn('Failed to save walkthrough progress:', error);
    }
  }

  private loadProgress(walkthroughId: string): WalkthroughProgress | null {
    try {
      const stored = localStorage.getItem(this.constructor.name + '_' + InstructionGuide.STORAGE_KEY);
      if (!stored) return null;
      
      const allProgress = JSON.parse(stored);
      const progress = allProgress[walkthroughId];
      
      if (progress) {
        // Convert date strings back to Date objects
        progress.startedAt = new Date(progress.startedAt);
        progress.lastAccessed = new Date(progress.lastAccessed);
        return progress;
      }
    } catch (error) {
      console.warn('Failed to load walkthrough progress:', error);
    }
    return null;
  }

  // ===============================================================
  // TERMINAL COMMAND FORMATTING
  // ===============================================================

  formatWalkthroughList(): string {
    const walkthroughs = this.getAvailableWalkthroughs();
    let output = '📚 **Available Walkthroughs:**\\n\\n';
    
    walkthroughs.forEach(walkthrough => {
      const progress = this.loadProgress(walkthrough.id);
      const progressText = progress ? 
        (progress.isCompleted ? '✅ Completed' : `📍 Step ${progress.currentStep + 1}/${walkthrough.totalSteps}`) :
        '🆕 Not Started';
      
      output += `**${walkthrough.title}** (${walkthrough.estimatedTime} min, ${walkthrough.difficulty})\\n`;
      output += `   ${walkthrough.description}\\n`;
      output += `   Status: ${progressText}\\n`;
      output += `   Command: \`walkthrough ${walkthrough.id}\`\\n\\n`;
    });
    
    return output;
  }

  formatStepInstructions(walkthroughId: string, step: WalkthroughStep): string {
    const walkthrough = this.getWalkthrough(walkthroughId);
    const progress = this.loadProgress(walkthroughId);
    
    if (!walkthrough || !progress) return 'Walkthrough not found';
    
    const stepNumber = progress.currentStep + 1;
    
    let output = `🎯 **${walkthrough.title}** (Step ${stepNumber}/${walkthrough.totalSteps})\\n`;
    output += `*${walkthrough.description}*\\n\\n`;
    output += `📋 **Current Step: ${step.title}**\\n`;
    output += `${step.description}\\n\\n`;
    output += `⏱️  **Estimated Time**: ${step.estimatedTime} minutes\\n`;
    output += `🎯 **Expected Outcome**: ${step.expectedOutcome}\\n\\n`;
    
    if (step.troubleshooting && step.troubleshooting.length > 0) {
      output += `🔧 **Troubleshooting Tips**:\\n`;
      step.troubleshooting.forEach(tip => {
        output += `   • ${tip}\\n`;
      });
      output += '\\n';
    }
    
    return output;
  }

  // Helper methods for walkthrough output generation
  generateWalkthroughOutput(walkthroughId: string): string {
    const walkthrough = this.getWalkthrough(walkthroughId);
    if (!walkthrough) {
      return `Walkthrough "${walkthroughId}" not found. Available walkthroughs: ${Array.from(this.walkthroughs.keys()).join(', ')}`;
    }
    
    const progress = this.loadProgress(walkthroughId);
    let output = `📚 ${walkthrough.title}\\n`;
    output += `${walkthrough.description}\\n\\n`;
    output += `📊 Progress: ${progress?.completedSteps.length || 0}/${walkthrough.totalSteps} steps\\n`;
    output += `⏱️ Estimated time: ${walkthrough.estimatedTime} minutes\\n`;
    output += `📈 Difficulty: ${walkthrough.difficulty}\\n\\n`;
    
    if (progress && progress.currentStep < walkthrough.steps.length) {
      const currentStep = walkthrough.steps[progress.currentStep];
      output += `🎯 Current Step: ${currentStep.title}\\n`;
      output += currentStep.description;
    }
    
    return output;
  }

  generateStatusOutput(walkthroughId: string): string {
    const progress = this.getProgress(walkthroughId);
    if (!progress) {
      return `No progress found for walkthrough "${walkthroughId}".`;
    }
    
    const walkthrough = this.getWalkthrough(walkthroughId);
    if (!walkthrough) {
      return `Walkthrough "${walkthroughId}" not found.`;
    }
    
    let output = `📈 Status for ${walkthrough.title}\\n`;
    output += `Progress: ${progress.completedSteps.length}/${walkthrough.totalSteps} steps completed\\n`;
    output += `Started: ${progress.startedAt.toLocaleDateString()}\\n`;
    output += `Last accessed: ${progress.lastAccessed.toLocaleDateString()}\\n`;
    output += `Status: ${progress.isCompleted ? 'Completed ✅' : 'In Progress 🔄'}\\n\\n`;
    
    output += `Completed steps:\\n`;
    progress.completedSteps.forEach((stepId, index) => {
      const step = walkthrough.steps.find(s => s.id === stepId);
      if (step) {
        output += `${index + 1}. ✅ ${step.title}\\n`;
      }
    });
    
    return output;
  }

  getTopicInfo(walkthroughId: string): Walkthrough | undefined {
    return this.getWalkthrough(walkthroughId);
  }

  resetWalkthrough(walkthroughId: string): boolean {
    return this.resetProgress(walkthroughId);
  }

  getAvailableTopics(): string[] {
    return Array.from(this.walkthroughs.keys());
  }

  getOverallStats(): { total: number; inProgress: number; completed: number } {
    const allWalkthroughs = this.getAvailableWalkthroughs();
    const stats = { total: allWalkthroughs.length, inProgress: 0, completed: 0 };
    
    allWalkthroughs.forEach(walkthrough => {
      const progress = this.getProgress(walkthrough.id);
      if (progress) {
        if (progress.isCompleted) {
          stats.completed++;
        } else {
          stats.inProgress++;
        }
      }
    });
    
    return stats;
  }
}

// Export singleton instance
export const instructionGuide = new InstructionGuide();