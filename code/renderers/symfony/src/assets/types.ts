export interface ScriptAsset {
  /** External script URL. */
  url?: string;
  /** Inline script content. */
  content?: string;
  /** Script type. Default: 'classic'. */
  type?: 'module' | 'classic';
}

export interface StyleAsset {
  /** External stylesheet URL. */
  url?: string;
  /** Inline CSS content. */
  content?: string;
}

export interface ImportMap {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

export interface NormalizedAssets {
  styles: StyleAsset[];
  scripts: ScriptAsset[];
  importmap?: ImportMap;
}

export interface RenderResponse {
  html: string;
  assets: NormalizedAssets;
  metadata?: {
    component?: string;
    stimulusControllers?: string[];
  };
}
