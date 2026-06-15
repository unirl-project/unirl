import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { CommunityQR } from "@/components/community-qr";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CommunityQR,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
