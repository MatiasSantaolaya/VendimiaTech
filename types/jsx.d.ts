import "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "abra-checkout": {
        event?: string;
        theme?: string;
        children?: import("react").ReactNode;
      };
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "abra-checkout": {
        event?: string;
        theme?: string;
        children?: React.ReactNode;
      };
    }
  }
}

export {};
