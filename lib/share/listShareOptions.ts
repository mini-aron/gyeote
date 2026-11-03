export type ShareOption = "image" | "link" | "copy" | "save";

export interface ShareCapabilities {
  hasShare: boolean;
  canShareFile: boolean;
  hasFile: boolean;
}

export function listShareOptions({ hasShare, canShareFile, hasFile }: ShareCapabilities): ShareOption[] {
  const options: ShareOption[] = [];
  if (hasFile && canShareFile) options.push("image");
  if (hasShare) options.push("link");
  options.push("copy");
  if (hasFile) options.push("save");
  return options;
}
