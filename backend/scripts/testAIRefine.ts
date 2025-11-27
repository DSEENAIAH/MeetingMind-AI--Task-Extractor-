import { extractTasksWithAI } from '../src/lib/aiExtractor';

const TRANSCRIPT = `Sam, can you update the development environment setup guide by Thursday?\nLina, please upload the finalized component library to the shared design folder today.\nSam, please complete the full API usage list and send it to me by Monday.\nDavid, can you compile the training topic preferences from your team by Friday?\nLina and David, schedule a design–engineering alignment meeting for next Tuesday.\nEveryone, please review your self-assessment drafts before Monday.`;

(async () => {
  const res = await extractTasksWithAI(TRANSCRIPT);
  console.log('Refined tasks:', res.tasks);
})();
