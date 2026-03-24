export {};

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (
          prompt: string,
          test?: boolean,
          model?: string,
          options?: { width?: number; height?: number }
        ) => Promise<HTMLImageElement>;
      };
    };
  }
}
