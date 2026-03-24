export {};

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (
          prompt: string,
          test?: boolean,
          model?: string
        ) => Promise<HTMLImageElement>;
      };
    };
  }
}
