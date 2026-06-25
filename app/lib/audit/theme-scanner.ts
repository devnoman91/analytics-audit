export interface ThemeAsset {
  key: string;
  value: string;
}

export interface ThemeScanResult {
  themeId: string;
  themeName: string;
  assets: ThemeAsset[];
}

const CRITICAL_ASSETS = [
  "layout/theme.liquid",
  "layout/checkout.liquid",
  "snippets/head-content.liquid",
  "snippets/google-analytics.liquid",
  "snippets/analytics.liquid",
  "snippets/fb-pixel.liquid",
  "snippets/meta-pixel.liquid",
  "sections/main-cart-footer.liquid",
];

export async function scanThemeAssets(admin: any): Promise<ThemeScanResult> {
  // Get active theme
  const themeRes = await admin.graphql(`#graphql
    query getActiveTheme {
      themes(first: 10, roles: [MAIN]) {
        nodes {
          id
          name
        }
      }
    }
  `);
  const themeData = await themeRes.json();
  const theme = themeData.data?.themes?.nodes?.[0];

  if (!theme) {
    return { themeId: "", themeName: "Unknown", assets: [] };
  }

  // Fetch each critical asset
  const assets: ThemeAsset[] = [];
  for (const key of CRITICAL_ASSETS) {
    try {
      const assetRes = await admin.graphql(`#graphql
        query getThemeAsset($themeId: ID!, $key: String!) {
          theme(id: $themeId) {
            file(key: $key) {
              body {
                ... on OnlineStoreThemeFileBodyText {
                  content
                }
              }
            }
          }
        }
      `, { variables: { themeId: theme.id, key } });

      const assetData = await assetRes.json();
      const content = assetData.data?.theme?.file?.body?.content;
      if (content) {
        assets.push({ key, value: content });
      }
    } catch {
      // Asset doesn't exist in this theme, skip
    }
  }

  return {
    themeId: theme.id,
    themeName: theme.name,
    assets,
  };
}

export function searchAssets(assets: ThemeAsset[], patterns: RegExp[]): { found: boolean; matches: string[]; files: string[] } {
  const matches: string[] = [];
  const files: string[] = [];

  for (const asset of assets) {
    for (const pattern of patterns) {
      const found = asset.value.match(pattern);
      if (found) {
        found.forEach((m) => !matches.includes(m) && matches.push(m));
        if (!files.includes(asset.key)) files.push(asset.key);
      }
    }
  }

  return { found: matches.length > 0, matches, files };
}
