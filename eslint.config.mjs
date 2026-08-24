import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextTs from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: ["supabase/.temp/**"] },
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
];

export default eslintConfig;
