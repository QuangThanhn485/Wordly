// src/features/train/train-start/api.ts
export const getWords = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['apple', 'banana', 'orange','apple', 'banana', 'orange','apple', 'banana', 'orange','apple', 'banana', 'orange']);
    }, 1000);
  });
};
