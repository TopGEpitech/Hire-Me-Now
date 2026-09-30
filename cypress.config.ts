import { defineConfig } from "cypress";

// only installed in the e2e CI job (npm i --no-save cypress cypress-axe axe-core), not a project dep
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support.ts",
    video: false,
    setupNodeEvents(on) {
      // so axe violations show up in the CI log, not just "1 violation"
      on("task", {
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
