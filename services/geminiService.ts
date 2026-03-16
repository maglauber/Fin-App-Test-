
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types.js";

// Always use the API key directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AdviceOutput {
  summary: string;
  steps: { title: string; description: string }[];
  encouragement: string;
}

export const getFinancialAdvice = async (
  goal: string,
  income: number,
  expenses: number,
  balance: number,
  transactions: Transaction[]
): Promise<AdviceOutput | null> => {
  // Group transactions by category for better AI context
  const catTotals: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'expense') catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  
  const budgetContext = Object.entries(catTotals)
    .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
    .join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      Role: Expert Senior Financial Planner.
      User's Primary Goal: "${goal}".
      
      Financial Profile:
      - Monthly Income: $${income}
      - Total Expenses: $${expenses}
      - Current Surplus/Deficit: $${balance}
      - Spending Breakdown: ${budgetContext}
      
      Instructions:
      1. Analyze the spending breakdown against the goal.
      2. Provide a 3-step actionable roadmap.
      3. Be specific (e.g., "Reduce 'Food' spending by 10% which is $X").
      4. Maintain a supportive and professional tone.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A brief analysis of the user's current situation." },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['title', 'description']
            }
          },
          encouragement: { type: Type.STRING, description: "A final encouraging remark." }
        },
        required: ['summary', 'steps', 'encouragement']
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Failed to parse advice JSON", e);
    return null;
  }
};

export const parseTransactionFromText = async (
  text: string,
  expenseCats: string[],
  incomeCats: string[]
): Promise<Partial<Transaction> | null> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract transaction details from: "${text}". Available expense categories: ${expenseCats.join(', ')}. Available income categories: ${incomeCats.join(', ')}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['expense', 'income', 'return'] },
          date: { type: Type.STRING, description: "YYYY-MM-DD" }
        },
        required: ['name', 'amount', 'type', 'category']
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    return null;
  }
};

export const suggestCategory = async (
  name: string,
  expenseCats: string[],
  incomeCats: string[]
): Promise<{ type: TransactionType, category: string } | null> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Categorize "${name}". Expenses: ${expenseCats.join(', ')}. Incomes: ${incomeCats.join(', ')}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['expense', 'income'] },
          category: { type: Type.STRING }
        },
        required: ['type', 'category']
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    return null;
  }
};

export const extractTransactionsFromImage = async (
  base64Image: string,
  mimeType: string,
  expenseCats: string[],
  incomeCats: string[]
): Promise<Partial<Transaction>[] | null> => {
  const prompt = `
    Analyze this receipt or statement image and extract all transactions.
    Available Expense Categories: ${expenseCats.join(', ')}.
    Available Income Categories: ${incomeCats.join(', ')}.
    Guess the best category and type for each.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType: mimeType } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['expense', 'income', 'return'] }
          },
          required: ['name', 'amount', 'type', 'category']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Image parsing error:", e);
    return null;
  }
};

export const getBudgetAnalysis = async (
  month: string,
  income: number,
  expenses: number,
  transactions: Transaction[]
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Analyze this budget for ${month}. 
      Total Income: $${income}
      Total Expenses: $${expenses}
      Key Transactions: ${transactions.slice(0, 20).map(t => `${t.name} ($${t.amount})`).join(', ')}
      
      Identify 3 insights: one success, one area of concern, and one suggestion for next month.
    `
  });
  return response.text || "Analysis unavailable.";
};