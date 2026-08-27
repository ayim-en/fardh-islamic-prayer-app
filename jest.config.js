// https://docs.expo.dev/develop/unit-testing/
// The jest-expo preset derives moduleNameMapper from the `paths` in
// tsconfig.json, so the `@/*` alias resolves in tests without repeating it here.
module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/"],
};
