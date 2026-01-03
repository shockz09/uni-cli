// ../shared/src/helpers.ts
var {spawn} = (() => ({}));
function exec(command, args = []) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["inherit", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0
      });
    });
    proc.on("error", (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1
      });
    });
  });
}
// src/gh-wrapper.ts
class GhWrapper {
  async isAvailable() {
    try {
      const result = await exec("gh", ["auth", "status"]);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  async run(args) {
    try {
      const result = await exec("gh", args);
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `gh command failed with exit code ${result.exitCode}`
        };
      }
      if (result.stdout.trim()) {
        try {
          const data = JSON.parse(result.stdout);
          return { success: true, data };
        } catch {
          return { success: true, data: result.stdout };
        }
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async runText(args) {
    try {
      const result = await exec("gh", args);
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `gh command failed with exit code ${result.exitCode}`
        };
      }
      return { success: true, data: result.stdout };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
var gh = new GhWrapper;

// src/commands/pr.ts
var listCommand = {
  name: "list",
  description: "List pull requests",
  aliases: ["ls"],
  options: [
    {
      name: "state",
      short: "s",
      type: "string",
      description: "Filter by state: open, closed, merged, all",
      default: "open"
    },
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of PRs to list",
      default: 10
    },
    {
      name: "author",
      short: "a",
      type: "string",
      description: "Filter by author"
    }
  ],
  examples: [
    "uni gh pr list",
    "uni gh pr list --state all --limit 20",
    "uni gh pr list --author @me"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    const spinner = output.spinner("Fetching pull requests...");
    const args = [
      "pr",
      "list",
      "--state",
      flags.state,
      "--limit",
      String(flags.limit),
      "--json",
      "number,title,state,author,headRefName,baseRefName,url,createdAt,isDraft"
    ];
    if (flags.author) {
      args.push("--author", flags.author);
    }
    const result = await gh.run(args);
    if (!result.success) {
      spinner.fail("Failed to fetch PRs");
      output.error(result.error || "Unknown error");
      return;
    }
    const prs = result.data || [];
    spinner.success(`Found ${prs.length} pull request${prs.length === 1 ? "" : "s"}`);
    if (globalFlags.json) {
      output.json(prs);
      return;
    }
    if (prs.length === 0) {
      output.info("No pull requests found");
      return;
    }
    console.log("");
    for (const pr of prs) {
      const draft = pr.isDraft ? " \x1B[33m[draft]\x1B[0m" : "";
      const state = pr.state === "OPEN" ? "\x1B[32mOPEN\x1B[0m" : pr.state === "MERGED" ? "\x1B[35mMERGED\x1B[0m" : "\x1B[31mCLOSED\x1B[0m";
      console.log(`\x1B[1m#${pr.number}\x1B[0m ${pr.title}${draft}`);
      console.log(`  ${state} • ${pr.headRefName} → ${pr.baseRefName} • by ${pr.author.login}`);
      console.log(`  \x1B[36m${pr.url}\x1B[0m`);
      console.log("");
    }
  }
};
var viewCommand = {
  name: "view",
  description: "View a pull request",
  aliases: ["show"],
  args: [
    {
      name: "number",
      description: "PR number",
      required: true
    }
  ],
  options: [
    {
      name: "web",
      short: "w",
      type: "boolean",
      description: "Open in browser",
      default: false
    }
  ],
  examples: [
    "uni gh pr view 123",
    "uni gh pr view 123 --web"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const prNumber = args.number;
    if (!prNumber) {
      output.error("Please provide a PR number");
      return;
    }
    if (flags.web) {
      const result2 = await gh.runText(["pr", "view", prNumber, "--web"]);
      if (!result2.success) {
        output.error(result2.error || "Failed to open PR");
      }
      return;
    }
    const spinner = output.spinner(`Fetching PR #${prNumber}...`);
    const result = await gh.run([
      "pr",
      "view",
      prNumber,
      "--json",
      "number,title,state,author,headRefName,baseRefName,url,createdAt,isDraft,mergeable,additions,deletions,body"
    ]);
    if (!result.success) {
      spinner.fail("Failed to fetch PR");
      output.error(result.error || "Unknown error");
      return;
    }
    const pr = result.data;
    spinner.success(`PR #${pr.number}`);
    if (globalFlags.json) {
      output.json(pr);
      return;
    }
    const draft = pr.isDraft ? " \x1B[33m[draft]\x1B[0m" : "";
    const state = pr.state === "OPEN" ? "\x1B[32mOPEN\x1B[0m" : pr.state === "MERGED" ? "\x1B[35mMERGED\x1B[0m" : "\x1B[31mCLOSED\x1B[0m";
    console.log("");
    console.log(`\x1B[1m#${pr.number} ${pr.title}\x1B[0m${draft}`);
    console.log(`${state} • ${pr.headRefName} → ${pr.baseRefName}`);
    console.log(`Author: ${pr.author.login}`);
    if (pr.additions !== undefined && pr.deletions !== undefined) {
      console.log(`Changes: \x1B[32m+${pr.additions}\x1B[0m / \x1B[31m-${pr.deletions}\x1B[0m`);
    }
    if (pr.mergeable) {
      const mergeColor = pr.mergeable === "MERGEABLE" ? "32" : "31";
      console.log(`Mergeable: \x1B[${mergeColor}m${pr.mergeable}\x1B[0m`);
    }
    console.log(`\x1B[36m${pr.url}\x1B[0m`);
    if (pr.body) {
      console.log(`
\x1B[90m─── Description ───\x1B[0m
`);
      console.log(pr.body);
    }
    console.log("");
  }
};
var createCommand = {
  name: "create",
  description: "Create a pull request",
  aliases: ["new"],
  options: [
    {
      name: "title",
      short: "t",
      type: "string",
      description: "PR title"
    },
    {
      name: "body",
      short: "b",
      type: "string",
      description: "PR description"
    },
    {
      name: "base",
      type: "string",
      description: "Base branch"
    },
    {
      name: "draft",
      short: "d",
      type: "boolean",
      description: "Create as draft",
      default: false
    },
    {
      name: "web",
      short: "w",
      type: "boolean",
      description: "Open in browser to create",
      default: false
    }
  ],
  examples: [
    'uni gh pr create --title "Add feature" --body "Description"',
    "uni gh pr create --draft",
    "uni gh pr create --web"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (flags.web) {
      const result2 = await gh.runText(["pr", "create", "--web"]);
      if (!result2.success) {
        output.error(result2.error || "Failed to open browser");
      }
      return;
    }
    const args = ["pr", "create"];
    if (flags.title) {
      args.push("--title", flags.title);
    }
    if (flags.body) {
      args.push("--body", flags.body);
    }
    if (flags.base) {
      args.push("--base", flags.base);
    }
    if (flags.draft) {
      args.push("--draft");
    }
    const spinner = flags.title ? output.spinner("Creating pull request...") : null;
    const result = await gh.runText(args);
    if (!result.success) {
      spinner?.fail("Failed to create PR");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner?.success("Pull request created");
    if (globalFlags.json) {
      const url = result.data?.trim();
      output.json({ url });
    } else {
      console.log(result.data);
    }
  }
};
var mergeCommand = {
  name: "merge",
  description: "Merge a pull request",
  args: [
    {
      name: "number",
      description: "PR number (defaults to current branch PR)"
    }
  ],
  options: [
    {
      name: "method",
      short: "m",
      type: "string",
      description: "Merge method: merge, squash, rebase",
      default: "merge",
      choices: ["merge", "squash", "rebase"]
    },
    {
      name: "delete-branch",
      short: "d",
      type: "boolean",
      description: "Delete branch after merge",
      default: false
    }
  ],
  examples: [
    "uni gh pr merge 123",
    "uni gh pr merge --method squash",
    "uni gh pr merge 123 --delete-branch"
  ],
  async handler(ctx) {
    const { output, args, flags } = ctx;
    const prArgs = ["pr", "merge"];
    if (args.number) {
      prArgs.push(args.number);
    }
    const method = flags.method;
    if (method === "squash") {
      prArgs.push("--squash");
    } else if (method === "rebase") {
      prArgs.push("--rebase");
    } else {
      prArgs.push("--merge");
    }
    if (flags["delete-branch"]) {
      prArgs.push("--delete-branch");
    }
    const spinner = output.spinner("Merging pull request...");
    const result = await gh.runText(prArgs);
    if (!result.success) {
      spinner.fail("Failed to merge PR");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner.success("Pull request merged");
    if (result.data?.trim()) {
      console.log(result.data);
    }
  }
};
var prCommand = {
  name: "pr",
  description: "Manage pull requests",
  aliases: ["pull-request"],
  subcommands: [listCommand, viewCommand, createCommand, mergeCommand],
  examples: [
    "uni gh pr list",
    "uni gh pr view 123",
    'uni gh pr create --title "Feature"'
  ],
  async handler(ctx) {
    await listCommand.handler(ctx);
  }
};

// src/commands/issue.ts
var listCommand2 = {
  name: "list",
  description: "List issues",
  aliases: ["ls"],
  options: [
    {
      name: "state",
      short: "s",
      type: "string",
      description: "Filter by state: open, closed, all",
      default: "open"
    },
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of issues to list",
      default: 10
    },
    {
      name: "label",
      type: "string",
      description: "Filter by label"
    },
    {
      name: "assignee",
      short: "a",
      type: "string",
      description: "Filter by assignee"
    }
  ],
  examples: [
    "uni gh issue list",
    "uni gh issue list --state all --limit 20",
    "uni gh issue list --label bug"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    const spinner = output.spinner("Fetching issues...");
    const args = [
      "issue",
      "list",
      "--state",
      flags.state,
      "--limit",
      String(flags.limit),
      "--json",
      "number,title,state,author,url,createdAt,labels"
    ];
    if (flags.label) {
      args.push("--label", flags.label);
    }
    if (flags.assignee) {
      args.push("--assignee", flags.assignee);
    }
    const result = await gh.run(args);
    if (!result.success) {
      spinner.fail("Failed to fetch issues");
      output.error(result.error || "Unknown error");
      return;
    }
    const issues = result.data || [];
    spinner.success(`Found ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
    if (globalFlags.json) {
      output.json(issues);
      return;
    }
    if (issues.length === 0) {
      output.info("No issues found");
      return;
    }
    console.log("");
    for (const issue of issues) {
      const state = issue.state === "OPEN" ? "\x1B[32mOPEN\x1B[0m" : "\x1B[35mCLOSED\x1B[0m";
      const labels = issue.labels.length > 0 ? " " + issue.labels.map((l) => `\x1B[33m${l.name}\x1B[0m`).join(" ") : "";
      console.log(`\x1B[1m#${issue.number}\x1B[0m ${issue.title}${labels}`);
      console.log(`  ${state} • by ${issue.author.login}`);
      console.log(`  \x1B[36m${issue.url}\x1B[0m`);
      console.log("");
    }
  }
};
var viewCommand2 = {
  name: "view",
  description: "View an issue",
  aliases: ["show"],
  args: [
    {
      name: "number",
      description: "Issue number",
      required: true
    }
  ],
  options: [
    {
      name: "web",
      short: "w",
      type: "boolean",
      description: "Open in browser",
      default: false
    }
  ],
  examples: [
    "uni gh issue view 123",
    "uni gh issue view 123 --web"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const issueNumber = args.number;
    if (!issueNumber) {
      output.error("Please provide an issue number");
      return;
    }
    if (flags.web) {
      const result2 = await gh.runText(["issue", "view", issueNumber, "--web"]);
      if (!result2.success) {
        output.error(result2.error || "Failed to open issue");
      }
      return;
    }
    const spinner = output.spinner(`Fetching issue #${issueNumber}...`);
    const result = await gh.run([
      "issue",
      "view",
      issueNumber,
      "--json",
      "number,title,state,author,url,createdAt,labels,body,comments"
    ]);
    if (!result.success) {
      spinner.fail("Failed to fetch issue");
      output.error(result.error || "Unknown error");
      return;
    }
    const issue = result.data;
    spinner.success(`Issue #${issue.number}`);
    if (globalFlags.json) {
      output.json(issue);
      return;
    }
    const state = issue.state === "OPEN" ? "\x1B[32mOPEN\x1B[0m" : "\x1B[35mCLOSED\x1B[0m";
    const labels = issue.labels.length > 0 ? `
Labels: ` + issue.labels.map((l) => `\x1B[33m${l.name}\x1B[0m`).join(" ") : "";
    console.log("");
    console.log(`\x1B[1m#${issue.number} ${issue.title}\x1B[0m`);
    console.log(`${state} • by ${issue.author.login}`);
    if (issue.comments) {
      console.log(`Comments: ${issue.comments}`);
    }
    console.log(labels);
    console.log(`\x1B[36m${issue.url}\x1B[0m`);
    if (issue.body) {
      console.log(`
\x1B[90m─── Description ───\x1B[0m
`);
      console.log(issue.body);
    }
    console.log("");
  }
};
var createCommand2 = {
  name: "create",
  description: "Create an issue",
  aliases: ["new"],
  options: [
    {
      name: "title",
      short: "t",
      type: "string",
      description: "Issue title"
    },
    {
      name: "body",
      short: "b",
      type: "string",
      description: "Issue description"
    },
    {
      name: "label",
      short: "l",
      type: "string",
      description: "Add labels (comma-separated)"
    },
    {
      name: "assignee",
      short: "a",
      type: "string",
      description: "Assign to user"
    },
    {
      name: "web",
      short: "w",
      type: "boolean",
      description: "Open in browser to create",
      default: false
    }
  ],
  examples: [
    'uni gh issue create --title "Bug report" --body "Description"',
    'uni gh issue create --title "Feature" --label enhancement',
    "uni gh issue create --web"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (flags.web) {
      const result2 = await gh.runText(["issue", "create", "--web"]);
      if (!result2.success) {
        output.error(result2.error || "Failed to open browser");
      }
      return;
    }
    const args = ["issue", "create"];
    if (flags.title) {
      args.push("--title", flags.title);
    }
    if (flags.body) {
      args.push("--body", flags.body);
    }
    if (flags.label) {
      args.push("--label", flags.label);
    }
    if (flags.assignee) {
      args.push("--assignee", flags.assignee);
    }
    const spinner = flags.title ? output.spinner("Creating issue...") : null;
    const result = await gh.runText(args);
    if (!result.success) {
      spinner?.fail("Failed to create issue");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner?.success("Issue created");
    if (globalFlags.json) {
      const url = result.data?.trim();
      output.json({ url });
    } else {
      console.log(result.data);
    }
  }
};
var closeCommand = {
  name: "close",
  description: "Close an issue",
  args: [
    {
      name: "number",
      description: "Issue number",
      required: true
    }
  ],
  options: [
    {
      name: "reason",
      short: "r",
      type: "string",
      description: "Reason: completed, not_planned",
      default: "completed",
      choices: ["completed", "not_planned"]
    }
  ],
  examples: [
    "uni gh issue close 123",
    "uni gh issue close 123 --reason not_planned"
  ],
  async handler(ctx) {
    const { output, args, flags } = ctx;
    const issueNumber = args.number;
    if (!issueNumber) {
      output.error("Please provide an issue number");
      return;
    }
    const issueArgs = ["issue", "close", issueNumber];
    if (flags.reason === "not_planned") {
      issueArgs.push("--reason", "not_planned");
    }
    const spinner = output.spinner(`Closing issue #${issueNumber}...`);
    const result = await gh.runText(issueArgs);
    if (!result.success) {
      spinner.fail("Failed to close issue");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner.success(`Issue #${issueNumber} closed`);
  }
};
var issueCommand = {
  name: "issue",
  description: "Manage issues",
  aliases: ["issues", "i"],
  subcommands: [listCommand2, viewCommand2, createCommand2, closeCommand],
  examples: [
    "uni gh issue list",
    "uni gh issue view 123",
    'uni gh issue create --title "Bug"'
  ],
  async handler(ctx) {
    await listCommand2.handler(ctx);
  }
};

// src/commands/repo.ts
var viewCommand3 = {
  name: "view",
  description: "View repository details",
  aliases: ["show"],
  args: [
    {
      name: "repo",
      description: "Repository name (owner/repo)"
    }
  ],
  options: [
    {
      name: "web",
      short: "w",
      type: "boolean",
      description: "Open in browser",
      default: false
    }
  ],
  examples: [
    "uni gh repo view",
    "uni gh repo view owner/repo",
    "uni gh repo view --web"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (flags.web) {
      const webArgs = ["repo", "view", "--web"];
      if (args.repo) {
        webArgs.splice(2, 0, args.repo);
      }
      const result2 = await gh.runText(webArgs);
      if (!result2.success) {
        output.error(result2.error || "Failed to open repository");
      }
      return;
    }
    const spinner = output.spinner("Fetching repository...");
    const viewArgs = [
      "repo",
      "view",
      "--json",
      "name,nameWithOwner,description,url,isPrivate,isFork,stargazerCount,forkCount,primaryLanguage,defaultBranchRef,pushedAt"
    ];
    if (args.repo) {
      viewArgs.splice(2, 0, args.repo);
    }
    const result = await gh.run(viewArgs);
    if (!result.success) {
      spinner.fail("Failed to fetch repository");
      output.error(result.error || "Unknown error");
      return;
    }
    const repo = result.data;
    spinner.success(repo.nameWithOwner);
    if (globalFlags.json) {
      output.json(repo);
      return;
    }
    const visibility = repo.isPrivate ? "\x1B[33mPrivate\x1B[0m" : "\x1B[32mPublic\x1B[0m";
    const fork = repo.isFork ? " (fork)" : "";
    const lang = repo.primaryLanguage?.name || "Unknown";
    const branch = repo.defaultBranchRef?.name || "main";
    console.log("");
    console.log(`\x1B[1m${repo.nameWithOwner}\x1B[0m${fork}`);
    console.log(`${visibility} • ${lang} • Branch: ${branch}`);
    if (repo.description) {
      console.log(`\x1B[90m${repo.description}\x1B[0m`);
    }
    console.log(`⭐ ${repo.stargazerCount} • \uD83C\uDF74 ${repo.forkCount}`);
    console.log(`\x1B[36m${repo.url}\x1B[0m`);
    console.log("");
  }
};
var cloneCommand = {
  name: "clone",
  description: "Clone a repository",
  args: [
    {
      name: "repo",
      description: "Repository to clone (owner/repo or URL)",
      required: true
    },
    {
      name: "directory",
      description: "Target directory"
    }
  ],
  options: [
    {
      name: "depth",
      type: "number",
      description: "Shallow clone depth"
    }
  ],
  examples: [
    "uni gh repo clone owner/repo",
    "uni gh repo clone owner/repo ./my-dir",
    "uni gh repo clone owner/repo --depth 1"
  ],
  async handler(ctx) {
    const { output, args, flags } = ctx;
    const repo = args.repo;
    if (!repo) {
      output.error("Please provide a repository to clone");
      return;
    }
    const cloneArgs = ["repo", "clone", repo];
    if (args.directory) {
      cloneArgs.push(args.directory);
    }
    if (flags.depth) {
      cloneArgs.push("--", "--depth", String(flags.depth));
    }
    const spinner = output.spinner(`Cloning ${repo}...`);
    const result = await gh.runText(cloneArgs);
    if (!result.success) {
      spinner.fail("Failed to clone repository");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner.success(`Cloned ${repo}`);
    if (result.data?.trim()) {
      console.log(result.data);
    }
  }
};
var listCommand3 = {
  name: "list",
  description: "List repositories",
  aliases: ["ls"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of repos to list",
      default: 10
    },
    {
      name: "visibility",
      type: "string",
      description: "Filter by visibility: public, private, all",
      default: "all"
    },
    {
      name: "source",
      type: "boolean",
      description: "Show only non-forks",
      default: false
    }
  ],
  examples: [
    "uni gh repo list",
    "uni gh repo list --limit 20",
    "uni gh repo list --visibility private"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    const spinner = output.spinner("Fetching repositories...");
    const args = [
      "repo",
      "list",
      "--limit",
      String(flags.limit),
      "--json",
      "name,nameWithOwner,description,isPrivate,isFork,stargazerCount,primaryLanguage,pushedAt"
    ];
    if (flags.visibility !== "all") {
      args.push("--visibility", flags.visibility);
    }
    if (flags.source) {
      args.push("--source");
    }
    const result = await gh.run(args);
    if (!result.success) {
      spinner.fail("Failed to fetch repositories");
      output.error(result.error || "Unknown error");
      return;
    }
    const repos = result.data || [];
    spinner.success(`Found ${repos.length} repositor${repos.length === 1 ? "y" : "ies"}`);
    if (globalFlags.json) {
      output.json(repos);
      return;
    }
    if (repos.length === 0) {
      output.info("No repositories found");
      return;
    }
    console.log("");
    for (const repo of repos) {
      const visibility = repo.isPrivate ? "\x1B[33m•\x1B[0m" : "\x1B[32m•\x1B[0m";
      const lang = repo.primaryLanguage?.name || "";
      const langStr = lang ? `\x1B[90m${lang}\x1B[0m ` : "";
      const stars = repo.stargazerCount > 0 ? `⭐${repo.stargazerCount}` : "";
      console.log(`${visibility} \x1B[1m${repo.nameWithOwner}\x1B[0m ${langStr}${stars}`);
      if (repo.description) {
        console.log(`  \x1B[90m${repo.description.slice(0, 80)}${repo.description.length > 80 ? "..." : ""}\x1B[0m`);
      }
    }
    console.log("");
  }
};
var createCommand3 = {
  name: "create",
  description: "Create a new repository",
  aliases: ["new"],
  args: [
    {
      name: "name",
      description: "Repository name"
    }
  ],
  options: [
    {
      name: "public",
      type: "boolean",
      description: "Make repository public",
      default: false
    },
    {
      name: "private",
      type: "boolean",
      description: "Make repository private",
      default: true
    },
    {
      name: "description",
      short: "d",
      type: "string",
      description: "Repository description"
    },
    {
      name: "clone",
      short: "c",
      type: "boolean",
      description: "Clone after creating",
      default: false
    }
  ],
  examples: [
    "uni gh repo create my-project",
    "uni gh repo create my-project --public",
    'uni gh repo create my-project --description "My project" --clone'
  ],
  async handler(ctx) {
    const { output, args, flags } = ctx;
    const createArgs = ["repo", "create"];
    if (args.name) {
      createArgs.push(args.name);
    }
    if (flags.public) {
      createArgs.push("--public");
    } else {
      createArgs.push("--private");
    }
    if (flags.description) {
      createArgs.push("--description", flags.description);
    }
    if (flags.clone) {
      createArgs.push("--clone");
    }
    const spinner = args.name ? output.spinner(`Creating repository ${args.name}...`) : null;
    const result = await gh.runText(createArgs);
    if (!result.success) {
      spinner?.fail("Failed to create repository");
      output.error(result.error || "Unknown error");
      return;
    }
    spinner?.success("Repository created");
    if (result.data?.trim()) {
      console.log(result.data);
    }
  }
};
var repoCommand = {
  name: "repo",
  description: "Manage repositories",
  aliases: ["repository", "r"],
  subcommands: [viewCommand3, cloneCommand, listCommand3, createCommand3],
  examples: [
    "uni gh repo view",
    "uni gh repo clone owner/repo",
    "uni gh repo list"
  ],
  async handler(ctx) {
    await viewCommand3.handler(ctx);
  }
};

// src/index.ts
var ghService = {
  name: "gh",
  description: "GitHub management - PRs, issues, and repositories",
  version: "0.1.0",
  commands: [prCommand, issueCommand, repoCommand],
  auth: {
    type: "oauth",
    flow: "browser"
  },
  async setup() {
    const available = await gh.isAvailable();
    if (!available) {
      console.error('\x1B[33mWarning: gh CLI not authenticated. Run "gh auth login" first.\x1B[0m');
    }
  }
};
var src_default = ghService;
export {
  src_default as default
};
