// the flows a recruiter actually does. pokeapi isn't needed for any of them, so CI stays stable

const a11y = () => {
  cy.injectAxe();
  // WCAG 2.1 AA. fails the test on any violation
  cy.checkA11y(undefined, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }, (violations) =>
    cy.task("log", violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`).join("\n")),
  );
};

describe("hire me page", () => {
  it("shows the pitch + passes axe", () => {
    cy.visit("/");
    cy.contains("h1", "Why you should");
    cy.contains("Younes Kad");
    a11y();
  });

  it("can't run from a trainer battle", () => {
    cy.visit("/#choice");
    cy.contains("button", "RUN").click();
    cy.contains("Can't escape!");
  });

  it("HIRE shows how to reach me + fires the event", () => {
    cy.intercept("POST", "/api/events/hire").as("hire");
    cy.visit("/#choice");
    cy.contains("button", "HIRE").click();
    cy.wait("@hire").its("response.statusCode").should("eq", 202);
    cy.contains("a", "younes.kadi@epitech.eu");
  });
});

describe("architecture page", () => {
  it("renders + passes axe", () => {
    cy.visit("/architecture");
    cy.contains("h1", "architecture of a real product");
    a11y();
  });

  it("gives a visitor a 403 on /api/contact in the playground", () => {
    cy.visit("/architecture#playground");
    cy.contains("button", "/api/contact").click();
    cy.contains("403");
    cy.contains('"need": "contact:read"');
  });

  it("logs in as recruiter + gets the contact", () => {
    cy.visit("/architecture#playground");
    cy.get("#access-code").type(Cypress.env("RECRUITER_CODE") ?? "ci-recruiter-code");
    cy.contains("button", "Log in").click();
    cy.contains("recruiter", { matchCase: false });
    cy.contains("button", "/api/contact").click();
    cy.contains("200");
  });
});

describe("battle", () => {
  it("arena without a team shows a helpful message + passes axe", () => {
    cy.visit("/battle/arena");
    cy.contains("No team, no battle.");
    a11y();
  });
});
